import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, ChevronDown, AlertTriangle, Zap, Info, RefreshCw, Loader, Check, X } from 'lucide-react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TokenSelector, TokenIcon } from '@/components/dex/TokenSelector';
import { SlippageSettings } from '@/components/dex/SlippageSettings';
import { AmountInput } from '@/components/dex/AmountInput';
import { Token, COMMON_TOKENS, getNativeToken, formatTokenAmount } from '@/lib/web3/tokens';
import { FEE_TIER_LABELS, uniswapContracts } from '@/lib/web3/config';
import { cn } from '@/lib/utils';
import { useQuote } from '@/hooks/useQuote';
import { useERC20 } from '@/hooks/useERC20';
import { useSwapRouter } from '@/hooks/useSwapRouter';
import { ethers, JsonRpcSigner } from 'ethers';

interface SwapState {
  inputToken: Token | null;
  outputToken: Token | null;
  inputAmount: string;
  outputAmount: string;
  slippage: number;
  deadline: number;
  feeTier?: number;
}
interface SwapTabProps {
  signer: JsonRpcSigner | null;
}

interface QuoteData {
  outputAmount: string;
  priceImpact: number;
  gasEstimate: string;
  route: string[];
  feeTier: number;
}

export function SwapCard({ signer }: SwapTabProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const SWAP_ROUTER_ADDRESS = uniswapContracts[chainId]?.swapRouter;
  
  // Hooks
  const { quoteExactInputSingle, quoteExactOutputSingle } = useQuote(signer);
  const { getBalance, getAllowance, approve, getDecimal } = useERC20(signer);
  const { exactInputSingle, exactOutputSingle } = useSwapRouter(signer);

  // State
  const [state, setState] = useState<SwapState>(() => {
    const tokens = COMMON_TOKENS[chainId] || [];
    return {
      inputToken: getNativeToken(chainId),
      outputToken: tokens[0] || null,
      inputAmount: '',
      outputAmount: '',
      slippage: 0.5,
      deadline: 30,
      feeTier: 3000,
    };
  });

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [balanceIn, setBalanceIn] = useState('0');
  const [balanceOut, setBalanceOut] = useState('0');
  const [allowanceIn, setAllowanceIn] = useState('0');
  const [isOutput, setIsOutput] = useState(false); // Track if user is editing output amount
  
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState<'input' | 'output' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000); // Auto-dismiss after 5 seconds
  };

  // Fetch quote when input amount changes
    const fetchQuoteForInput = async () => {
      if (!state.inputAmount || !state.inputToken || !state.outputToken || isOutput) {
        return;
      }

      const inputNum = parseFloat(state.inputAmount);
      if (isNaN(inputNum) || inputNum <= 0) {
        setQuote(null);
        return;
      }

      try {
        setQuoteLoading(true);
        console.log('Fetching quote for input amount:', state.inputAmount);

        const t1 = state.inputToken.address === getNativeToken(chainId).address ?COMMON_TOKENS[chainId].find(t => t.symbol === 'WETH')!.address : state.inputToken.address;
        const t2 = state.outputToken.address === getNativeToken(chainId).address ?COMMON_TOKENS[chainId].find(t => t.symbol === 'WETH')!.address : state.outputToken.address;
        
        if(t1 === t2){
          setQuote({
            outputAmount: state.inputAmount,
            priceImpact: 0,
            gasEstimate: '0',
            route: [state.inputToken.symbol, state.outputToken.symbol],
            feeTier: state.feeTier || 3000,
          });
          setQuoteLoading(false);
          return;
        }

        const quoteResult = await quoteExactInputSingle(
          t1,
          t2,
          Number(state.feeTier || 3000),
          state.inputAmount,
          '0',
          state.inputToken.decimals,
          state.outputToken.decimals,
        );

        console.log('Quote result:', quoteResult);
debugger
        if (quoteResult && quoteResult.amountOut) {
          // Simple price impact calculation
         
          const bps = (10_000 - state.slippage * 100);
          const actualOutput = parseFloat(quoteResult.amountOut);
          const expectedOutput = (actualOutput * bps) / 10000;
          const priceImpact = ((expectedOutput - actualOutput) / expectedOutput) * 100;

          setQuote({
            outputAmount: quoteResult.amountOut,
            priceImpact: Math.max(0, priceImpact),
            gasEstimate: '0.0015',
            route: [state.inputToken.symbol, state.outputToken.symbol],
            feeTier: state.feeTier || 3000,
          });
        }
      } catch (err) {
        console.error('Error getting input quote:', err);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

  useEffect(() => {
  
    const timer = setTimeout(fetchQuoteForInput, 500);
    return () => clearTimeout(timer);
  }, [state.inputAmount, state.inputToken, state.outputToken, state.feeTier, isOutput, quoteExactInputSingle]);

  // Fetch quote when output amount changes
  useEffect(() => {
    const fetchQuoteForOutput = async () => {
      if (!state.outputAmount || !state.inputToken || !state.outputToken || !isOutput) {
        return;
      }

      const outputNum = parseFloat(state.outputAmount);
      if (isNaN(outputNum) || outputNum <= 0) {
        setQuote(null);
        return;
      }

      try {
        setQuoteLoading(true);
        console.log('Fetching quote for output amount:', state.outputAmount);
         const t1 = state.inputToken.address === getNativeToken(chainId).address ?COMMON_TOKENS[chainId].find(t => t.symbol === 'WETH')!.address : state.inputToken.address;
        const t2 = state.outputToken.address === getNativeToken(chainId).address ?COMMON_TOKENS[chainId].find(t => t.symbol === 'WETH')!.address : state.outputToken.address;
        if(t1 === t2){
          setQuote({
            outputAmount: state.inputAmount,
            priceImpact: 0,
            gasEstimate: '0',
            route: [state.inputToken.symbol, state.outputToken.symbol],
            feeTier: state.feeTier || 3000,
          });
          setQuoteLoading(false);
          return;
        }
        const quoteResult = await quoteExactOutputSingle(
          t1,
          t2,
          Number(state.feeTier || 3000),
          state.outputAmount,
          '0',
          state.inputToken.decimals,
          state.outputToken.decimals,
        );

        console.log('Quote result for output:', quoteResult);

        if (quoteResult && quoteResult.amountIn) {
          // Simple price impact calculation
        
          
          const actualInput = parseFloat(quoteResult.amountIn);
          const expectedInput= actualInput * (1- state.slippage);
          const priceImpact = ((actualInput - expectedInput) / expectedInput) * 100;

          setQuote({
            outputAmount: quoteResult.amountIn,
            priceImpact: Math.max(0, priceImpact),
            gasEstimate: '0.0015',
            route: [state.inputToken.symbol, state.outputToken.symbol],
            feeTier: state.feeTier || 3000,
          });
        }
      } catch (err) {
        console.error('Error getting output quote:', err);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuoteForOutput, 500);
    return () => clearTimeout(timer);
  }, [state.outputAmount, state.inputToken, state.outputToken, state.feeTier, isOutput, quoteExactOutputSingle]);

  // Update output amount when quote changes (only if user was editing input)
  useEffect(() => {
    if (quote && !isOutput) {
      setState(s => ({ ...s, outputAmount: quote.outputAmount }));
    }
  }, [quote, isOutput]);

  // Update input amount when quote changes (only if user was editing output)
  useEffect(() => {
    if (quote && isOutput) {
      setState(s => ({ ...s, inputAmount: quote.outputAmount }));
    }
  }, [quote, isOutput]);

  // Fetch balances and decimals
  const fetchBalances = useCallback(async () => {
    if (!signer || !address || !state.inputToken || !state.outputToken) return;

    try {
 
  

      // Get balances
      const [balanceInVal, balanceOutVal] = await Promise.all([
        getBalance(address, state.inputToken.address, state.inputToken.symbol),
        getBalance(address, state.outputToken.address, state.outputToken.symbol),
      ]);
      

      setBalanceIn(balanceInVal.toString());
      setBalanceOut(balanceOutVal.toString());

      // Get allowance
      if (state.inputToken.symbol !== 'ETH') {
        const allowanceVal = await getAllowance(
          address,
          SWAP_ROUTER_ADDRESS,
          state.inputToken.address,
          state.inputToken.symbol,
        );
        setAllowanceIn(allowanceVal.toString());
      } else {
        setAllowanceIn(ethers.MaxUint256.toString());
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  }, [signer, address, state.inputToken, state.outputToken, getBalance, getAllowance, getDecimal]);

  // Fetch balances when tokens change
  useEffect(() => {
    fetchBalances();
  }, [state.inputToken?.address, state.outputToken?.address, fetchBalances]);

  // Helper to format balance for display
  const formatDisplayBalance = (balance: string, decimals: number): string => {
    try {
      const formatted = ethers.formatUnits(balance, decimals);
      return parseFloat(formatted).toFixed(4);
    } catch (e) {
      console.error('Error formatting balance:', e);
      return '0';
    }
  };

  // Check insufficient balance
  const isInsufficientBalance = useCallback(() => {
    if (!state.inputAmount || !balanceIn || !state.inputToken) return false;
    try {
      const amountInWei = ethers.parseUnits(state.inputAmount, state.inputToken.decimals);
      return BigInt(balanceIn) < amountInWei;
    } catch (e) {
      console.error('Error checking balance:', e);
      return false;
    }
  }, [state.inputAmount, balanceIn, state.inputToken, state.inputToken.decimals]);

  const switchTokens = () => {
    setState(s => ({
      ...s,
      inputToken: s.outputToken,
      outputToken: s.inputToken,
      inputAmount: s.outputAmount,
      outputAmount: s.inputAmount,
    }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBalances();
    setIsRefreshing(false);
  };

  const handleTokenSelect = (token: Token) => {
    if (tokenSelectorOpen === 'input') {
      setState(s => ({ ...s, inputToken: token, inputAmount: '', outputAmount: '' }));
    } else {
      setState(s => ({ ...s, outputToken: token, inputAmount: '', outputAmount: '' }));
    }
    setTokenSelectorOpen(null);
  };

  const handleApprove = async () => {
    if (!state.inputToken || !address) return;

    try {
      setIsSwapping(true);
      const amountInWei = ethers.parseUnits(state.inputAmount, state.inputToken.decimals);
      
      await approve(SWAP_ROUTER_ADDRESS, amountInWei, state.inputToken.address);
      
      showNotification('success', 'Token approved successfully!');
      
      // Refresh allowance
      await fetchBalances();
    } catch (err: any) {
      console.error('Approval failed:', err);
      showNotification('error', `Approval failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = async () => {
    if (!signer || !address || !state.inputToken || !state.outputToken || !state.inputAmount || !state.outputAmount) {
      return;
    }

    try {
      setIsSwapping(true);
      const amountInWei = ethers.parseUnits(state.inputAmount, state.inputToken.decimals);
      const amountOutWei = ethers.parseUnits(state.outputAmount, state.outputToken.decimals);
      // Calculate slippage
      const slippageBasisPoints = BigInt(Math.floor(state.slippage * 100));
      const minAmountOut = (BigInt(amountOutWei.toString()) * (10000n - slippageBasisPoints)) / 10000n;

      const value = state.inputToken.symbol === 'ETH' ? amountInWei : 0n;

      const t1 = state.inputToken.address === getNativeToken(chainId).address ?COMMON_TOKENS[chainId].find(t => t.symbol === 'WETH')!.address : state.inputToken.address;
      const t2 = state.outputToken.address === getNativeToken(chainId).address ?COMMON_TOKENS[chainId].find(t => t.symbol === 'WETH')!.address : state.outputToken.address;

      const tx = await exactInputSingle(
        {

          tokenIn: t1,
          tokenOut: t2,
          fee: state.feeTier || 3000,
          recipient: address,
          deadline: Math.floor(Date.now() / 1000) + state.deadline * 60,
          amountIn: amountInWei,
          amountOutMinimum: minAmountOut,
          sqrtPriceLimitX96: 0n,
        },
        value,
      );

      console.log('Transaction successful:', tx);
      
      const txHash = tx?.hash || tx?.transactionHash || 'Transaction sent';
      showNotification('success', `Swap executed successfully! TX: ${txHash}`);
      
      // Reset form
      setState(s => ({ ...s, inputAmount: '', outputAmount: '' }));
      
      // Refresh balances
      await fetchBalances();
    } catch (err: any) {
      console.error('Swap failed:', err);
      const errorMsg = err.reason || err.message || 'Unknown error occurred';
      showNotification('error', `Swap failed: ${errorMsg}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const needsApproval = 
    state.inputToken && 
    state.inputToken.symbol !== 'ETH' && 
    state.inputAmount &&
    BigInt(allowanceIn) < ethers.parseUnits(state.inputAmount, state.inputToken.decimals);

  const isHighPriceImpact = quote && quote.priceImpact > 3;
  const canSwap = isConnected && state.inputAmount && parseFloat(state.inputAmount) > 0 && quote && !isInsufficientBalance();

  return (
    <>
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed top-4 right-4 rounded-lg p-4 flex items-center gap-2 z-50 ${
              notification.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Card variant="glass" className="w-full max-w-md mx-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xl">Swap</CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
            </Button>
            <SlippageSettings
              slippage={state.slippage}
              onSlippageChange={(v) => setState(s => ({ ...s, slippage: v }))}
              deadline={state.deadline}
              onDeadlineChange={(v) => setState(s => ({ ...s, deadline: v }))}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Input Token */}
          <div className="bg-muted rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>You pay</span>
              <span>Balance: {formatDisplayBalance(balanceIn, state.inputToken.decimals)}</span>
            </div>
            <div className="flex items-center gap-3">
              <AmountInput
                value={state.inputAmount}
                onChange={(v) => {
                  setState(s => ({ ...s, inputAmount: v }));
                  setIsOutput(false); // User is editing input amount
                  fetchQuoteForInput();
                }}
                className="flex-1"
              />
              <Button
                variant="glass"
                onClick={() => setTokenSelectorOpen('input')}
                className="gap-2 shrink-0"
              >
                {state.inputToken ? (
                  <>
                    <TokenIcon token={state.inputToken} size="sm" />
                    <span className="font-semibold">{state.inputToken.symbol}</span>
                  </>
                ) : (
                  <span>Select</span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {state.inputAmount && `≈ $${(parseFloat(state.inputAmount || '0') * 1850).toFixed(2)}`}
              </span>
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    className="px-2 py-0.5 text-xs rounded-md bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setState(s => ({ ...s, inputAmount: '1.0' }))}
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <motion.button
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={switchTokens}
              className="p-2 rounded-xl bg-card border border-border hover:border-primary hover:bg-muted transition-colors"
            >
              <ArrowDown className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Output Token */}
          <div className="bg-muted rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>You receive</span>
              <span>Balance: {formatDisplayBalance(balanceOut, state.outputToken.decimals)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <AmountInput
                  value={state.outputAmount}
                  onChange={(v) => {
                    setState(s => ({ ...s, outputAmount: v }));
                    setIsOutput(true); // User is editing output amount
                  }}
                  disabled={false}
                  className="flex-1"
                />
                {quoteLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader className="h-5 w-5 animate-spin text-blue-500" />
                  </div>
                )}
              </div>
              <Button
                variant="glass"
                onClick={() => setTokenSelectorOpen('output')}
                className="gap-2 shrink-0"
              >
                {state.outputToken ? (
                  <>
                    <TokenIcon token={state.outputToken} size="sm" />
                    <span className="font-semibold">{state.outputToken.symbol}</span>
                  </>
                ) : (
                  <span>Select</span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {state.outputAmount && `≈ $${(parseFloat(state.outputAmount || '0')).toFixed(2)}`}
            </span>
          </div>

          {/* Quote Details */}
          <AnimatePresence>
            {quote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-background/50 rounded-xl p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>1 {state.inputToken?.symbol} = 1,850 {state.outputToken?.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      Price Impact
                      <Info className="h-3 w-3" />
                    </span>
                    <span className={cn(isHighPriceImpact && "text-warning")}>
                      {quote.priceImpact.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee Tier</span>
                    <span>{FEE_TIER_LABELS[quote.feeTier as keyof typeof FEE_TIER_LABELS]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Est. Gas
                    </span>
                    <span>~{quote.gasEstimate} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Route</span>
                    <span className="flex items-center gap-1">
                      {quote.route.join(' → ')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* High Price Impact Warning */}
          {isHighPriceImpact && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>High price impact! Consider reducing your trade size.</span>
            </div>
          )}

          {/* Action Button */}
          {isConnected ? (
            isInsufficientBalance() ? (
              <Button
                variant="swap"
                size="xl"
                className="w-full"
                disabled
              >
                Insufficient Balance
              </Button>
            ) : needsApproval ? (
              <Button
                variant="swap"
                size="xl"
                className="w-full"
                disabled={isSwapping || !state.inputAmount || parseFloat(state.inputAmount) <= 0}
                onClick={handleApprove}
              >
                {isSwapping ? 'Approving...' : 'Approve'}
              </Button>
            ) : (
              <Button
                variant="swap"
                size="xl"
                className="w-full"
                disabled={!canSwap || isSwapping}
                onClick={handleSwap}
              >
                {isSwapping ? 'Swapping...' : !state.inputAmount ? 'Enter an amount' : 'Swap'}
              </Button>
            )
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button
                  variant="swap"
                  size="xl"
                  className="w-full"
                  onClick={openConnectModal}
                >
                  Connect Wallet
                </Button>
              )}
            </ConnectButton.Custom>
          )}
        </CardContent>
      </Card>

      {/* Token Selector Modal */}
      <TokenSelector
        open={tokenSelectorOpen !== null}
        onClose={() => setTokenSelectorOpen(null)}
        onSelect={handleTokenSelect}
        chainId={chainId}
        selectedToken={tokenSelectorOpen === 'input' ? state.inputToken || undefined : state.outputToken || undefined}
        disabledToken={tokenSelectorOpen === 'input' ? state.outputToken || undefined : state.inputToken || undefined}
      />
    </>
  );
}

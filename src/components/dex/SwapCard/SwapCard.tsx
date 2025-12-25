import { useState, useCallback, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Token, COMMON_TOKENS, getNativeToken } from "@/lib/web3/tokens";
import { uniswapContracts } from "@/lib/web3/config";
import { cn } from "@/lib/utils";
import { useERC20 } from "@/hooks/useERC20";
import { useSwapRouter } from "@/hooks/useSwapRouter";
import { SlippageSettings } from "@/components/dex/SlippageSettings";
import { toast } from "sonner";

import { SwapCardProps, SwapState } from "./types";
import {
  useOptimizedQuote,
  useSwapNotification,
  useSwapUIState,
  useSwapBalances,
} from "./hooks";
import {
  InputTokenSection,
  OutputTokenSection,
  SwitchTokensButton,
  QuoteDetails,
  NotificationToast,
  SwapActionButton,
} from "./components";
import {
  getNormalizedTokenAddress,
  isSameToken,
  formatDisplayBalance,
  calculateMinimumOutput,
} from "./utils";

export function SwapCard({ signer }: SwapCardProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const SWAP_ROUTER_ADDRESS = uniswapContracts[chainId]?.swapRouter;

  // State management
  const [state, setState] = useState<SwapState>(() => {
    const tokens = COMMON_TOKENS[chainId] || [];
    return {
      inputToken: getNativeToken(chainId),
      outputToken: tokens[0] || null,
      inputAmount: "",
      outputAmount: "",
      slippage: 0.5,
      deadline: 30,
      feeTier: 3000,
    };
  });

  const [balanceIn, setBalanceIn] = useState("0");
  const [balanceOut, setBalanceOut] = useState("0");
  const [allowanceIn, setAllowanceIn] = useState("0");

  // Custom hooks
  const { notification, showNotification } = useSwapNotification();
  const {
    tokenSelectorOpen,
    setTokenSelectorOpen,
    isRefreshing,
    setIsRefreshing,
    isSwapping,
    setIsSwapping,
    isOutput,
    setIsOutput,
   
    
  } = useSwapUIState();

  const { quote, quoteLoading, fetchQuoteForInput, fetchQuoteForOutput, clearCache } =
    useOptimizedQuote({ signer, chainId });

  const { fetchBalances, needsApproval, hasSufficientBalance } = useSwapBalances({
    signer,
    address,
    swapRouterAddress: SWAP_ROUTER_ADDRESS,
    chainId,
  });

  // External hooks
  const { approve } = useERC20(signer);
  const { exactInputSingle, exactOutputSingle } = useSwapRouter(signer);
  const { warpNativeToWETH } = useERC20(signer);

  // Fetch quote when input amount changes
  useEffect(() => {


    if (!state.inputToken || !state.outputToken || isOutput) {
      return;
    }

    if (!state.inputAmount) {
      setState((s) => ({ ...s, outputAmount: "" }));
      return;
    }

    fetchQuoteForInput(
      state.inputToken,
      state.outputToken,
      state.inputAmount,
      state.feeTier || 3000,
      state.slippage
    );
  }, [state.inputAmount, state.inputToken, state.outputToken, state.feeTier]);

  // Fetch quote when output amount changes
  useEffect(() => {
    if (!state.inputToken || !state.outputToken || !isOutput) {
      return;
    }

    if (!state.outputAmount) {
      return;
    }

    fetchQuoteForOutput(
      state.inputToken,
      state.outputToken,
      state.outputAmount,
      state.feeTier || 3000,
      state.slippage
    );
  }, [state.outputAmount, state.inputToken, state.outputToken, state.feeTier, isOutput]);

  // Update output amount when quote changes (only if user was editing input)
  useEffect(() => {
    if (quote && !isOutput) {
      setState((s) => ({ ...s, outputAmount: quote.outputAmount }));
    }
  }, [quote, isOutput]);

  // Update input amount when quote changes (only if user was editing output)
  useEffect(() => {
    if (quote && isOutput) {
      setState((s) => ({ ...s, inputAmount: quote.outputAmount }));
    }
  }, [quote, isOutput]);

  // Fetch balances when tokens change
  useEffect(() => {
    const fetch = async () => {
      if (!state.inputToken || !state.outputToken) return;

      const result = await fetchBalances(state.inputToken, state.outputToken);
      if (result) {
        setBalanceIn(result.balanceIn);
        setBalanceOut(result.balanceOut);
        setAllowanceIn(result.allowanceIn);
      }
    };

    fetch();
    clearCache();
  }, [state.inputToken?.address, state.outputToken?.address, fetchBalances, clearCache]);

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (state.inputToken && state.outputToken) {
      const result = await fetchBalances(state.inputToken, state.outputToken);
      if (result) {
        setBalanceIn(result.balanceIn);
        setBalanceOut(result.balanceOut);
        setAllowanceIn(result.allowanceIn);
      }
    }
    setIsRefreshing(false);
  };

  const switchTokens = () => {
    setState((s) => ({
      ...s,
      inputToken: s.outputToken,
      outputToken: s.inputToken,
      inputAmount: s.outputAmount,
      outputAmount: s.inputAmount,
    }));
    clearCache();
  };

  const handleTokenSelect = (token: Token) => {
    if (tokenSelectorOpen === "input") {
      setState((s) => ({
        ...s,
        inputToken: token,
        inputAmount: "",
        outputAmount: "",
      }));
    } else {
      setState((s) => ({
        ...s,
        outputToken: token,
        inputAmount: "",
        outputAmount: "",
      }));
    }
    setTokenSelectorOpen(null);
    clearCache();
  };

  const handleApprove = async () => {
    if (!state.inputToken || !address) return;

    try {
      setIsSwapping(true);
      const amountInWei = ethers.parseUnits(
        state.inputAmount,
        state.inputToken.decimals
      );

      await approve(SWAP_ROUTER_ADDRESS, amountInWei, state.inputToken.address);

      showNotification("success", "Token approved successfully!");

      // Refresh allowance
      if (state.inputToken && state.outputToken) {
        const result = await fetchBalances(state.inputToken, state.outputToken);
        if (result) {
          setAllowanceIn(result.allowanceIn);
        }
      }
    } catch (err: any) {
      console.error("Approval failed:", err);
      showNotification(
        "error",
        `Approval failed: ${err.message || "Unknown error"}`
      );
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = async () => {
    if (
      !signer ||
      !address ||
      !state.inputToken ||
      !state.outputToken ||
      !state.inputAmount ||
      !state.outputAmount
    ) {
      return;
    }

    const amountInWei = ethers.parseUnits(
      state.inputAmount,
      state.inputToken.decimals
    );

    // Handle native token wrapping
    if (
      (state.inputToken.symbol === "ETH" &&
        state.outputToken.symbol === "WETH") ||
      (state.inputToken.symbol === "WETH" && state.outputToken.symbol === "ETH")
    ) {
      toast.warning("you try to warp the native token...");
      try {
        const wethToken = COMMON_TOKENS[chainId].find(
          (t) => t.symbol === "WETH"
        );
        if (wethToken) {
          const response = await warpNativeToWETH(
            amountInWei,
            wethToken.address
          );

          console.log("Warp transaction successful:", response);
          showNotification(
            "success",
            `Warp executed successfully! TX: ${
              response?.hash || response?.transactionHash || "Transaction sent"
            }`
          );
          setState((s) => ({ ...s, inputAmount: "", outputAmount: "" }));

          if (state.inputToken && state.outputToken) {
            const result = await fetchBalances(
              state.inputToken,
              state.outputToken
            );
            if (result) {
              setBalanceIn(result.balanceIn);
              setBalanceOut(result.balanceOut);
            }
          }
        }
      } catch (err: any) {
        console.error("Warp failed:", err);
        showNotification("error", `Warp failed: ${err.message}`);
      }
      return;
    }

    try {
      setIsSwapping(true);

      const t1 = getNormalizedTokenAddress(
        state.inputToken,
        chainId,
        state.inputToken.symbol === "ETH"
      );
      const t2 = getNormalizedTokenAddress(
        state.outputToken,
        chainId,
        state.outputToken.symbol === "ETH"
      );

      const minAmountOut = calculateMinimumOutput(
        state.outputAmount,
        state.slippage,
        state.outputToken.decimals
      );

      const value = state.inputToken.symbol === "ETH" ? amountInWei : 0n;

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
        value
      );

      const txHash = tx?.hash || tx?.transactionHash || "Transaction sent";
      showNotification("success", `Swap executed successfully! TX: ${txHash}`);

      setState((s) => ({ ...s, inputAmount: "", outputAmount: "" }));

      if (state.inputToken && state.outputToken) {
        const result = await fetchBalances(state.inputToken, state.outputToken);
        if (result) {
          setBalanceIn(result.balanceIn);
          setBalanceOut(result.balanceOut);
        }
      }
    } catch (err: any) {
      console.error("Swap failed:", err);
      const errorMsg = err.reason || err.message || "Unknown error occurred";
      showNotification("error", `Swap failed: ${errorMsg}`);
    } finally {
      setIsSwapping(false);
    }
  };

  // Validation helpers
  const isInsufficientBalance = !hasSufficientBalance(
    state.inputToken!,
    state.inputAmount,
    balanceIn
  );

  const needsTokenApproval = needsApproval(
    state.inputToken!,
    state.inputAmount,
    allowanceIn
  );

  const canSwap =
    isConnected &&
    state.inputAmount &&
    parseFloat(state.inputAmount) > 0 &&
    quote &&
    !isInsufficientBalance;

  return (
    <>
      <NotificationToast notification={notification} />

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
              <RefreshCw
                className={cn("h-5 w-5", isRefreshing && "animate-spin")}
              />
            </Button>
            <SlippageSettings
              slippage={state.slippage}
              onSlippageChange={(v) =>
                setState((s) => ({ ...s, slippage: v }))
              }
              deadline={state.deadline}
              onDeadlineChange={(v) =>
                setState((s) => ({ ...s, deadline: v }))
              }
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <InputTokenSection
            inputToken={state.inputToken}
            inputAmount={state.inputAmount}
            balanceIn={balanceIn}
            quoteLoading={quoteLoading}
            onAmountChange={(v) => {
              setState((s) => ({ ...s, inputAmount: v }));
              setIsOutput(false);
            }}
            onTokenSelect={() => setTokenSelectorOpen("input")}
            onTokenSelectorOpen={setTokenSelectorOpen}
            onTokenSelected={handleTokenSelect}
            tokenSelectorOpen={tokenSelectorOpen}
            chainId={chainId}
            disabledToken={state.outputToken}
          />

          <SwitchTokensButton
            isLoading={false}
            onSwitch={switchTokens}
          />

          <OutputTokenSection
            outputToken={state.outputToken}
            outputAmount={state.outputAmount}
            balanceOut={balanceOut}
            quoteLoading={quoteLoading}
            onAmountChange={(v) => {
              setState((s) => ({ ...s, outputAmount: v }));
              setIsOutput(true);
            }}
            onTokenSelect={() => setTokenSelectorOpen("output")}
            onTokenSelectorOpen={setTokenSelectorOpen}
            onTokenSelected={handleTokenSelect}
            tokenSelectorOpen={tokenSelectorOpen}
            chainId={chainId}
            disabledToken={state.inputToken}
          />

          <QuoteDetails
            quote={quote}
            inputSymbol={state.inputToken?.symbol || "IN"}
            outputSymbol={state.outputToken?.symbol || "OUT"}
          />

          <SwapActionButton
            isConnected={isConnected}
            isSwapping={isSwapping}
            isLoading={quoteLoading}
            hasSufficientBalance={!isInsufficientBalance}
            needsApproval={needsTokenApproval}
            hasInputAmount={!!state.inputAmount && parseFloat(state.inputAmount) > 0}
            hasQuote={!!quote}
            onApprove={handleApprove}
            onSwap={handleSwap}
          />
        </CardContent>
      </Card>
    </>
  );
}

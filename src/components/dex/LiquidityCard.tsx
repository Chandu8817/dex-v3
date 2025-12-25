import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ChevronDown,
  Info,
  AlertTriangle,
  Loader,
  Check,
  X,
} from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TokenSelector, TokenIcon } from "@/components/dex/TokenSelector";
import { AmountInput } from "@/components/dex/AmountInput";
import { Token, COMMON_TOKENS, getNativeToken } from "@/lib/web3/tokens";
import {
  FEE_TIERS,
  FEE_TIER_LABELS,
  FEE_TIER_DESCRIPTIONS,
  uniswapContracts,
} from "@/lib/web3/config";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { usePositionManager } from "@/hooks/usePositionManager";
import { useERC20 } from "@/hooks/useERC20";
import { useFactory } from "@/hooks/useFactory";
import { useTokens } from "@/hooks/useTokens";
import { useQuote } from "@/hooks/useQuote";
import { ethers, JsonRpcSigner } from "ethers";
import { usePool } from "@/hooks/usePool";
import { toast } from "sonner";


interface LiquidityState {
  token0: Token | null;
  token1: Token | null;
  amount0: string;
  amount1: string;
  feeTier: number;
  minPrice: string;
  maxPrice: string;
}

interface LiquidityCardProps {
  signer: JsonRpcSigner | null;
}

export function LiquidityCard({ signer }: LiquidityCardProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const POSITION_MANAGER_ADDRESS = uniswapContracts[chainId]?.positionManager;

  const [state, setState] = useState<LiquidityState>(() => {
    return {
      token0: null,
      token1: null,
      amount0: "",
      amount1: "",
      feeTier: FEE_TIERS.MEDIUM,
      minPrice: "",
      maxPrice: "",
    };
  });

  const [tokenSelectorOpen, setTokenSelectorOpen] = useState<
    "token0" | "token1" | null
  >(null);
  const [isFullRange, setIsFullRange] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceRangeSuggestions, setPriceRangeSuggestions] = useState<
    { label: string; min: number; max: number; range:number }[]
  >([]);

  const [allowanceA, setAllowanceA] = useState("0");
  const [allowanceB, setAllowanceB] = useState("0");
  const [poolAddress, setPoolAddress] = useState("");
  const [selectedRange, setSelectedRange] = useState<{ label: string; min: number; max: number; range:number } | null>(null);
  const [tickLower, setTickLower] = useState("");
  const [tickUpper, setTickUpper] = useState("");

  // Hooks
  const {
    mint,
    decreaseLiquidity,
    collect,
    burn,
    contract,
    isApprovedForAll,
    isInitialized,
    approve,
  } = usePositionManager(signer);
  const {
    getBalance: getBalanceA,
    getAllowance: getAllowanceA,
    approve: approveA,
    getDecimal,
  } = useERC20(signer);
  const {
    getBalance: getBalanceB,
    getAllowance: getAllowanceB,
    approve: approveB,
  } = useERC20(signer);
  const { getPoolAddress } = useFactory(signer);
  const { quoteExactInputSingle,isInitialized: isQuoteInitialized } = useQuote(signer);
  const { getCurrentPrice, getSlot0, getTickSpacing } = usePool(signer);

  // Helper function for notifications
  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getAmountOut = useCallback(async () => {
    if (!state.token0 || !state.token1 || !state.amount0 || !signer) {
      setState((s) => ({ ...s, amount1: "" }));
      return;
    }

    try {
      const decimalsIn = state.token0.decimals;
      const decimalsOut = state.token1.decimals;

      // Validate amount is a positive number
      if (isNaN(Number(state.amount0)) || Number(state.amount0) <= 0) {
        setState((s) => ({ ...s, amount1: "" }));
        return;
      }
      if (!isQuoteInitialized) {
        toast.error('Quote contract not initialized');
        return;
      }

      const quote = await quoteExactInputSingle(
        state.token0.address,
        state.token1.address,
        Number(state.feeTier),
        state.amount0,
        '0',
        decimalsIn,
        decimalsOut,
      );
      if (!quote) return;

      const amountOutWei = ethers.parseUnits(quote.amountOut, decimalsOut);
      const slippageBasisPoints = BigInt(Math.floor(0.25 * 100));
      const minAmountOut = ethers.formatUnits(
        (BigInt(amountOutWei) * (10000n - slippageBasisPoints)) / 10000n,
        decimalsOut,
      );
      setState((s) => ({ ...s, amount1: minAmountOut.toString() }));
    } catch (err) {
      console.error("Failed to get quote:", err);
    }
  }, [
    state.token0,
    state.token1,
    state.amount0,
    state.feeTier,
    signer,
    quoteExactInputSingle,
    isQuoteInitialized,
  ]);

  // Format token amount
  const formatTokenAmount = (amount: string, decimals = 18) => {
    try {
      return ethers.parseUnits(amount || "0", decimals).toString();
    } catch (e) {
      return "0";
    }
  };

  // Format balance for display
  const formatDisplayBalance = (balance: string, decimals: number) => {
    try {
      return Number(ethers.formatUnits(balance, decimals)).toFixed(4);
    } catch (e) {
      return "0";
    }
  };

  const fetchPool = useCallback(
    async (tokenA: Token, tokenB: Token, fee: number) => {
      
      if (!signer || !isInitialized) return null;
       if (!tokenA || !tokenA)  return null;
      try {

        const poolAddress = await getPoolAddress(tokenA, tokenB, fee);
        return poolAddress;
      } catch (error) {
        console.error("Error fetching pool address:", error);
        toast.error("Failed to fetch pool address");
        return null;
      }
    },
    [signer, isInitialized, getPoolAddress]
  );

  // Fetch balances and allowances
  const fetchBalancesAndAllowances = useCallback(async () => {
    if (!signer || !address || !state.token0 || !state.token1) return;

    try {
      const [balanceA, balanceB, allowanceA, allowanceB] = await Promise.all([
        getBalanceA(address, state.token0.address, state.token0.symbol),
        getBalanceB(address, state.token1.address, state.token1.symbol),
        getAllowanceA(
          address,
          POSITION_MANAGER_ADDRESS,
          state.token0.address,
          state.token0.symbol
        ),
        getAllowanceB(
          address,
          POSITION_MANAGER_ADDRESS,
          state.token1.address,
          state.token1.symbol
        ),
      ]);

      setBalanceA(balanceA.toString());
      setBalanceB(balanceB.toString());
      setAllowanceA(allowanceA.toString());
      setAllowanceB(allowanceB.toString());
    } catch (err) {
      console.error("Error fetching balances:", err);
      showNotification("error", "Failed to fetch token balances");
    }
  }, [
    signer,
    address,
    state.token0,
    state.token1,
    getBalanceA,
    getBalanceB,
    getAllowanceA,
    getAllowanceB,
    getDecimal,
  ]);

  // Fetch balances when tokens change
  useEffect(() => {
    fetchBalancesAndAllowances();
  }, [
    state.token0,
    state.token1,
    fetchBalancesAndAllowances,
  ]);

  // Fetch amount out when amount0 changes
  useEffect(() => {
    getAmountOut();
  }, [state.amount0, getAmountOut]);

  // Check if tokens are approved
  const isTokenAApproved = useCallback(() => {
    if (!state.amount0 || !state.token0) return false;
    try {
      const amount0Wei = formatTokenAmount(
        state.amount0,
        state.token0.decimals
      );
      return BigInt(allowanceA) >= BigInt(amount0Wei);
    } catch (e) {
      return false;
    }
  }, [state.amount0, allowanceA, state.token0]);

  const isTokenBApproved = useCallback(() => {
    if (!state.amount1 || !state.token1) return false;
    try {
      const amount1Wei = formatTokenAmount(
        state.amount1,
        state.token1.decimals
      );
      return BigInt(allowanceB) >= BigInt(amount1Wei);
    } catch (e) {
      return false;
    }
  }, [state.amount1, allowanceB, state.token1]);

  // Check balance
  const hasSufficientBalance = useCallback(() => {
    if (!state.amount0 || !state.amount1 || !state.token0 || !state.token1) return false;
    try {
      const amount0Wei = formatTokenAmount(
        state.amount0,
        state.token0.decimals
      );
      const amount1Wei = formatTokenAmount(
        state.amount1,
        state.token1.decimals
      );
      return (
        BigInt(balanceA) >= BigInt(amount0Wei) &&
        BigInt(balanceB) >= BigInt(amount1Wei)
      );
    } catch (e) {
      return false;
    }
  }, [
    state.amount0,
    state.amount1,
    balanceA,
    balanceB,
    state.token0,
    state.token1,
  ]);

  const handleTokenSelect = (token: Token) => {
    if (tokenSelectorOpen === "token0") {
      setState((s) => ({ ...s, token0: token, amount0: "", amount1: "" }));
    } else {
      setState((s) => ({ ...s, token1: token, amount0: "", amount1: "" }));
    }
    setTokenSelectorOpen(null);
  };

  const handleApproveTokenA = async () => {
    if (!state.amount0 || !state.token0) return;
    try {
      setIsProcessing(true);
      const amount0Wei = ethers.parseUnits(
        state.amount0,
        state.token0.decimals
      );
      await approveA(
        POSITION_MANAGER_ADDRESS,
        amount0Wei,
        state.token0.address
      );
      showNotification("success", "Token A approved successfully!");
      await fetchBalancesAndAllowances();
    } catch (err: any) {
      console.error("Approval failed:", err);
      showNotification("error", `Approval failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveTokenB = async () => {
    if (!state.amount1 || !state.token1) return;
    try {
      setIsProcessing(true);
      const amount1Wei = ethers.parseUnits(
        state.amount1,
        state.token1.decimals
      );
      await approveB(
        POSITION_MANAGER_ADDRESS,
        amount1Wei,
        state.token1.address
      );
      showNotification("success", "Token B approved successfully!");
      await fetchBalancesAndAllowances();
    } catch (err: any) {
      console.error("Approval failed:", err);
      showNotification("error", `Approval failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (
      !signer ||
      !address ||
      !state.token0 ||
      !state.token1 ||
      !state.amount0 ||
      !state.amount1
    ) {
      showNotification("error", "Please fill in all required fields");
      return;
    }

    if (!isTokenAApproved() || !isTokenBApproved()) {
      showNotification("error", "Please approve both tokens first");
      return;
    }

    if (!hasSufficientBalance()) {
      showNotification("error", "Insufficient balance");
      return;
    }

    try {
      setIsProcessing(true);

      // Fetch pool if not already done
      if (!poolAddress ) {
       
        const pool = await fetchPool(state.token0, state.token1, state.feeTier);
        if (!pool) {
          // showNotification("error", "Pool not found for this pair");
          return;
        }
        if (pool != ethers.ZeroAddress){
          setPoolAddress(pool);
        }
      
        
      }
            // Sort tokens by address (required by Uniswap V3)
      const token0 = state.token0.address.toLowerCase() < state.token1.address.toLowerCase() ? state.token0 : state.token1;
      const token1 = state.token0.address.toLowerCase() < state.token1.address.toLowerCase() ? state.token1 : state.token0;

      const amount0Desired =
        token0 === state.token0
          ? ethers.parseUnits(state.amount0, Number(state.token0.decimals))
          : ethers.parseUnits(state.amount1, Number(state.token1.decimals));
      const amount1Desired =
        token0 === state.token0
          ? ethers.parseUnits(state.amount1, Number(state.token1.decimals))
          : ethers.parseUnits(state.amount0, Number(state.token0.decimals));
      // const amount0Desired = ethers.parseUnits(
      //   state.amount0,
      //   state.token0.decimals
      // );
      // const amount1Desired = ethers.parseUnits(
      //   state.amount1,
      //   state.token1.decimals
      // );

      // Use default ticks if not set (full range)
      const tl = tickLower ? BigInt(tickLower) : -887220n;
      const tu = tickUpper ? BigInt(tickUpper) : 887220n;
debugger
   const slippageBasisPoints = BigInt(Math.floor(0.05 * 100));
      const amount0Min = (amount0Desired * (10000n - slippageBasisPoints)) / 10000n;
      const amount1Min = (amount1Desired * (10000n - slippageBasisPoints)) / 10000n;

      const params = {
        token0: token0.address,
        token1: token1.address,
        fee: state.feeTier,
        tickLower: Number(tl),
        tickUpper: Number(tu),
        amount0Desired,
        amount1Desired,
        amount0Min: amount0Min,
        amount1Min: amount1Min,
        recipient: address,
        deadline: Math.floor(Date.now() / 1000) + 30 * 60,
      };

      const value =
        state.token0.symbol === "ETH"
          ? amount0Desired
          : state.token1.symbol === "ETH"
          ? amount1Desired
          : 0n;

      const tx = await mint(params, value);
      await tx.wait();

      showNotification("success", "Liquidity added successfully!");
      setState((s) => ({ ...s, amount0: "", amount1: "" }));
      await fetchBalancesAndAllowances();
    } catch (err: any) {
      console.error("Add liquidity failed:", err);
      showNotification("error", `Add liquidity failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isValidRange =
    state.minPrice &&
    state.maxPrice &&
    (isFullRange || parseFloat(state.minPrice) < parseFloat(state.maxPrice));

  const canAddLiquidity =
    isConnected &&
    state.token0 &&
    state.token1 &&
    state.amount0 &&
    parseFloat(state.amount0) > 0 &&
    state.amount1 &&
    parseFloat(state.amount1) > 0 &&
    isTokenAApproved() &&
    isTokenBApproved() &&
    hasSufficientBalance();

   const snapTick = (tick: number, tickSpacing: number, isLower: boolean) => {
  return isLower
    ? Math.floor(tick / tickSpacing) * tickSpacing
    : Math.ceil(tick / tickSpacing) * tickSpacing;
};


  useEffect(() => {
    if (!state.token0 || !state.token1 || !signer) return;

    const fetchPriceData = async () => {
      try {
        let pool = poolAddress;
        if (!pool) {
          pool = await fetchPool(state.token0, state.token1, state.feeTier);
          if (!pool || pool === ethers.ZeroAddress) return;
        }

        // Fetch current price
        const price = await getCurrentPrice(
          pool,
          state.token0.decimals,
          state.token1.decimals
        );
        
        // Display price as token1 per token0 (price.token1PerToken0)
        setCurrentPrice(Number(price.token1PerToken0));
        
        console.log("Token1 per Token0:", price?.token1PerToken0);
        console.log("Token0 per Token1:", price?.token0PerToken1);

        // Fetch slot0 data
        const slot0 = await getSlot0(pool);
        if (slot0) {
          const currentTick = Number(slot0.tick);
          const sqrtRatio = Number(slot0.sqrtPriceX96) / Math.pow(2, 96);
          
          console.log("Current Tick:", currentTick);
          console.log("Sqrt Ratio:", sqrtRatio);

          // Fetch tick spacing
          const spacing = await getTickSpacing(pool);
          if (spacing) {
            const tickSpacing = Number(spacing);
            
            // Set default ticks around current tick (±10 spacing units)
            
            debugger

const range = Math.max(1, Math.round(Math.abs(Number(currentTick)) * 0.02));          
             const lower = snapTick(Number(currentTick) - range, tickSpacing, true);
          const upper = snapTick(Number(currentTick) + range, tickSpacing, false);
            
            setTickLower(lower.toString());
            setTickUpper(upper.toString());
            
            console.log("Tick Spacing:", tickSpacing);
            console.log("Default Tick Lower:", lower);
            console.log("Default Tick Upper:", upper);
          }
        }
        
        const priceRangeSuggestionsData = [
          {
            label: "±5%",
            min: Number(price.token1PerToken0) * 0.95,
            max: Number(price.token1PerToken0) * 1.05,
            range :5

          },
          {
            label: "±10%",
            min: Number(price.token1PerToken0) * 0.9,
            max: Number(price.token1PerToken0) * 1.1,
            range :10

          },
          {
            label: "±25%",
            min: Number(price.token1PerToken0) * 0.75,
            max: Number(price.token1PerToken0) * 1.25,
            range :25
          },
        ];
        setPriceRangeSuggestions(priceRangeSuggestionsData);
      } catch (error) {
        console.error("Error fetching current price:", error);
      }
    };

    fetchPriceData();
  }, [state.token0?.address, state.token1?.address]);

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
              notification.type === "success"
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {notification.type === "success" ? (
              <Check className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Card variant="glass" className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Plus className="h-5 w-5 text-secondary" />
            Add Liquidity
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Token Pair Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Select Pair
            </label>
            <div className="flex gap-3">
              <Button
                variant="glass"
                className="flex-1 justify-between h-14"
                onClick={() => setTokenSelectorOpen("token0")}
              >
                {state.token0 ? (
                  <div className="flex items-center gap-2">
                    <TokenIcon token={state.token0} />
                    <span className="font-semibold">{state.token0.symbol}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select token</span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="glass"
                className="flex-1 justify-between h-14"
                onClick={() => setTokenSelectorOpen("token1")}
              >
                {state.token1 ? (
                  <div className="flex items-center gap-2">
                    <TokenIcon token={state.token1} />
                    <span className="font-semibold">{state.token1.symbol}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select token</span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Fee Tier Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Fee Tier
              </label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Higher fee tiers earn more per swap but receive less volume.
                    Choose based on the pair's volatility.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(FEE_TIERS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setState((s) => ({ ...s, feeTier: value }))}
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all",
                    state.feeTier === value
                      ? "bg-secondary/20 border-secondary text-foreground"
                      : "bg-muted border-border text-muted-foreground hover:border-border-glow"
                  )}
                >
                  <div className="font-semibold">{FEE_TIER_LABELS[value]}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {key === "LOWEST" && "Stable"}
                    {key === "LOW" && "Stable"}
                    {key === "MEDIUM" && "Standard"}
                    {key === "HIGH" && "Exotic"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Set Price Range (Optional)
              </label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Leave blank for full range. Concentrated liquidity earns
                    more fees but has higher impermanent loss risk.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Price Range Visualization */}
            <div className="bg-muted rounded-xl p-4">
              <div className="text-center mb-4">
                <span className="text-sm text-muted-foreground">
                  Current Price
                </span>
                <div className="text-lg font-bold">
                  {currentPrice > 0 ? formatDisplayBalance(currentPrice.toString(),12)  : "Loading..."} {state.token1?.symbol || "T1"}/
                  {state.token0?.symbol || "T0"}
                </div>
              </div>

              <div className="relative h-12 mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-secondary/40 to-secondary/20 rounded-lg" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary" />
                <div className="absolute left-1/2 -translate-x-1/2 -top-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Min Price
                  </label>
                  <div className="bg-background rounded-xl p-3">
                    <AmountInput
                      value={state.minPrice}
                      onChange={(v) => {
                        setIsFullRange(false);
                    
                        setState((s) => ({ ...s, minPrice: v }));
                      }}
                      placeholder="0"
                      className="text-xl"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {state.token1?.symbol} per {state.token0?.symbol}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Max Price
                  </label>
                  <div className="bg-background rounded-xl p-3">
                    <AmountInput
                      value={isFullRange ? "" : state.maxPrice}
                      onChange={(v) => {
                        setIsFullRange(false);
                       

                        setState((s) => ({ ...s, maxPrice: v }));
                      }}
                      placeholder={isFullRange ? "∞" : "0"}
                      className="text-xl"
                      disabled={isFullRange}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {state.token1?.symbol} per {state.token0?.symbol}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {priceRangeSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.label}
                    variant="muted"
                    size="sm"
                    onClick={() => {
                      setIsFullRange(false);
                      
                      setState((s) => ({
                        ...s,
                        minPrice: suggestion.min.toFixed(2),
                        maxPrice: suggestion.max.toFixed(2),
                      }));
               
                    }}
                    className="flex-1"
                  >
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Deposit Amounts */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Deposit Amounts
            </label>

            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{state.token0?.symbol || "Token 0"}</span>
                <span>
                  Balance:{" "}
                  {state.token0
                    ? formatDisplayBalance(balanceA, state.token0.decimals)
                    : "0"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AmountInput
                  value={state.amount0}
                  onChange={(v) => setState((s) => ({ ...s, amount0: v }))}
                  className="flex-1"
                />
                {state.token0 && <TokenIcon token={state.token0} />}
              </div>
            </div>

            <div className="bg-muted rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{state.token1?.symbol || "Token 1"}</span>
                <span>
                  Balance:{" "}
                  {state.token1
                    ? formatDisplayBalance(balanceB, state.token1.decimals)
                    : "0"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AmountInput
                  value={state.amount1}
                  onChange={(v) => setState((s) => ({ ...s, amount1: v }))}
                  className="flex-1"
                />
                {state.token1 && <TokenIcon token={state.token1} />}
              </div>
            </div>
          </div>

          {/* Impermanent Loss Warning */}
          {!isFullRange && state.minPrice && state.maxPrice && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Concentrated liquidity positions have higher impermanent loss
                risk. Your position may go out of range if the price moves
                significantly.
              </span>
            </div>
          )}

          {/* Action Button */}
          {isConnected ? (
            <>
              {!hasSufficientBalance() && state.amount0 && state.amount1 ? (
                <Button
                  variant="secondary"
                  size="xl"
                  className="w-full"
                  disabled
                >
                  Insufficient Balance
                </Button>
              ) : !isTokenAApproved() ? (
                <Button
                  variant="secondary"
                  size="xl"
                  className="w-full"
                  disabled={isProcessing || !state.amount0}
                  onClick={handleApproveTokenA}
                >
                  {isProcessing ? "Approving Token A..." : "Approve Token A"}
                </Button>
              ) : !isTokenBApproved() ? (
                <Button
                  variant="secondary"
                  size="xl"
                  className="w-full"
                  disabled={isProcessing || !state.amount1}
                  onClick={handleApproveTokenB}
                >
                  {isProcessing ? "Approving Token B..." : "Approve Token B"}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="xl"
                  className="w-full"
                  disabled={!canAddLiquidity || isProcessing}
                  onClick={handleAddLiquidity}
                >
                  {isProcessing
                    ? "Adding Liquidity..."
                    : !state.token0 || !state.token1
                    ? "Select tokens"
                    : !state.amount0 || !state.amount1
                    ? "Enter amounts"
                    : "Add Liquidity"}
                </Button>
              )}
            </>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button
                  variant="secondary"
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
        selectedToken={
          tokenSelectorOpen === "token0"
            ? state.token0 || undefined
            : state.token1 || undefined
        }
        disabledToken={
          tokenSelectorOpen === "token0"
            ? state.token1 || undefined
            : state.token0 || undefined
        }
      />
    </>
  );
}

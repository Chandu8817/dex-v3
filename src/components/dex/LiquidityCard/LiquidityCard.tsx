import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useChainId } from "wagmi";
import { ethers, JsonRpcSigner } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";
import { FEE_TIERS, uniswapContracts } from "@/lib/web3/config";
import { usePositionManager } from "@/hooks/usePositionManager";
import { COMMON_TOKENS, getNativeToken } from "@/lib/web3/tokens";
import { toast } from "sonner";

import {
  LiquidityCardProps,
  LiquidityState,
  PriceRangeSuggestion,
} from "./types";
import {
  useLiquidityNotification,
  useLiquidityProcessing,
  useTokenSelector,
  usePriceRange,
  useBalances,
  usePriceData,
  useApprovals,
} from "./hooks";
import {
  TokenPairSelector,
  FeeTierSelector,
  PriceRangeInput,
  DepositAmounts,
  ActionButton,
  ImpermanentLossWarning,
  NotificationToast,
} from "./components";
import {
  formatTokenAmount,
  isTokenApproved,
  hasSufficientBalance as checkSufficientBalance,
  canAddLiquidity,
} from "./utils";

import { getAmount1FromAmount0, quoteToken1FromToken0, tickToSqrtPriceX96 } from "@/lib/uniswapV3/getLPAmount";
import { usePool } from "@/hooks/usePool";

export function LiquidityCard({
  signer,
  initialToken0,
  initialToken1,
  initialFeeTier,
  initialPoolAddress,
}: LiquidityCardProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const POSITION_MANAGER_ADDRESS = uniswapContracts[chainId]?.positionManager;
  const { getCurrentPrice, getSlot0, getTickSpacing } = usePool(signer);

  // State management
  const [state, setState] = useState<LiquidityState>(() => ({
    token0: initialToken0 ?? null,
    token1: initialToken1 ?? null,
    amount0: "",
    amount1: "",
    feeTier: initialFeeTier ?? FEE_TIERS.MEDIUM,
    minPrice: "",
    maxPrice: "",
  }));
  // Apply incoming defaults from navigation (e.g., selecting a pool)
  useEffect(() => {
    if (
      !initialToken0 &&
      !initialToken1 &&
      initialFeeTier == null &&
      !initialPoolAddress
    )
      return;

    setState((s) => ({
      ...s,
      token0: initialToken0 ?? s.token0,
      token1: initialToken1 ?? s.token1,
      feeTier: initialFeeTier ?? s.feeTier,
      amount0: "",
      amount1: "",
    }));
    setPoolAddress(initialPoolAddress ?? "");
  }, [
    initialToken0?.address,
    initialToken1?.address,
    initialFeeTier,
    initialPoolAddress,
  ]);

  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  const [allowanceA, setAllowanceA] = useState("0");
  const [allowanceB, setAllowanceB] = useState("0");
  const [poolAddress, setPoolAddress] = useState(initialPoolAddress ?? "");
  const [lpPreview, setLpPreview] = useState<any>(null);
  const [imbalanceWarning, setImbalanceWarning] = useState<string | null>(null);

  // Refs for debouncing and cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastQuoteRequestRef = useRef<{ amount: string; result: string } | null>(
    null,
  );
  const isFetchingRef = useRef(false);

  // Helper functions (must be defined before hooks that use them)
  /**
   * Convert ETH to WETH address for contract interactions
   * but keep the original token reference for UI display
   */
  const getContractToken = useCallback(
    (token: any) => {
      if (token?.symbol === "ETH") {
        const wethToken = COMMON_TOKENS[chainId]?.find(
          (t) => t.symbol === "WETH",
        );
        return wethToken || token;
      }
      return token;
    },
    [chainId],
  );

  /**
   * Check if user selected native ETH (for msg.value calculation)
   */
  const isNativeETH = useCallback((token: any) => {
    return token?.symbol === "ETH";
  }, []);

  /**
   * Validate pool data before using it
   */
  const isValidPoolData = useCallback((poolData: any) => {
    return poolData && poolData.sqrtPriceX96 && poolData.liquidity;
  }, []);

  // Custom hooks
  const { notification, showNotification } = useLiquidityNotification();
  const { isProcessing, setIsProcessing } = useLiquidityProcessing();
  const {
    tokenSelectorOpen,
    setTokenSelectorOpen,
    isFullRange,
    setIsFullRange,
  } = useTokenSelector();
  const {
    tickLower,
    setTickLower,
    tickUpper,
    setTickUpper,
    currentPrice,
    setCurrentPrice,
    priceRangeSuggestions,
    setPriceRangeSuggestions,
  } = usePriceRange();

  const { fetchBalancesAndAllowances } = useBalances({
    signer,
    address,
    token0: state.token0,
    token1: state.token1,
    positionManagerAddress: POSITION_MANAGER_ADDRESS,
  });
  // External hooks
  const { mint, contract, isInitialized, approve } = usePositionManager(signer);

  // Check if hooks are ready
  const isQuoteInitialized = true; // You may need to add this hook check
  const { fetchPool, getAmountOut, fetchAmountOut, fetchPriceAndPoolData } =
    usePriceData({
      signer,
      token0: getContractToken(state.token0),
      token1: getContractToken(state.token1),
      feeTier: state.feeTier,
      poolAddress,
      isInitialized,
      isQuoteInitialized,
    });

  const { handleApproveTokenA, handleApproveTokenB } = useApprovals({
    signer,
  });

  // Fetch balances when tokens change
  useEffect(() => {
    const fetch = async () => {
      const result = await fetchBalancesAndAllowances();
      if (result) {
        setBalanceA(result.balanceA);
        setBalanceB(result.balanceB);
        setAllowanceA(result.allowanceA);
        setAllowanceB(result.allowanceB);
      }
    };
    fetch();
  }, [state.token0, state.token1, fetchBalancesAndAllowances]);

  // Fetch amount out when amount0 changes (with debouncing and caching)
  // useEffect(() => {
  //   // Clear previous timer
  //   if (debounceTimerRef.current) {
  //     clearTimeout(debounceTimerRef.current);
  //   }

  //   if (!state.amount0) {
  //     setState((s) => ({ ...s, amount1: "" }));
  //     lastQuoteRequestRef.current = null;
  //     setLpPreview(null);
  //     setImbalanceWarning(null);
  //     return;
  //   }

  //   // Check cache first
  //   if (lastQuoteRequestRef.current?.amount === state.amount0) {
  //     setState((s) => ({ ...s, amount1: lastQuoteRequestRef.current!.result }));
  //     return;
  //   }

  //   // Debounce the fetch call (reduced to 150ms for faster response)
  //   debounceTimerRef.current = setTimeout(async () => {
  //     // Prevent concurrent requests
  //     if (isFetchingRef.current) return;

  //     isFetchingRef.current = true;
  //     try {
  //       // Use LP math if we have pool data and ticks
  //       if (state.token0 && state.token1 && tickLower && tickUpper) {
  //         // We'll calculate using contract tokens for accurate pool data
  //         const contractToken0 = getContractToken(state.token0);
  //         const contractToken1 = getContractToken(state.token1);

  //         // Fetch fresh pool data
  //         const data = await fetchPriceAndPoolData(poolAddress);
  //         if (data?.poolData && isValidPoolData(data.poolData)) {
  //           try {
  //             const preview = getLpPreview(
  //               data.poolData as any,
  //               contractToken0 as any,
  //               contractToken1 as any,
  //               state.amount0,
  //               state.amount1 || state.amount0, // Use amount0 as fallback estimate
  //               Number(tickLower),
  //               Number(tickUpper),
  //             );
  //             debugger;

  //             setState((s) => ({ ...s, amount1: preview.amount1Used }));
  //             setLpPreview(preview);
  //             setImbalanceWarning(preview.warning);

  //             // Cache the result
  //             lastQuoteRequestRef.current = {
  //               amount: state.amount0,
  //               result: preview.amount1Used,
  //             };
  //             isFetchingRef.current = false;
  //             return;
  //           } catch (lpError) {
  //             console.error("LP math error, falling back to quote:", lpError);
  //           }
  //         }
  //       }

  //       // Fallback to swap-based quote if LP math fails
  //       fetchAmountOut(state.amount0, (amount) => {
  //         setState((s) => ({ ...s, amount1: amount }));
  //         lastQuoteRequestRef.current = {
  //           amount: state.amount0,
  //           result: amount,
  //         };
  //         isFetchingRef.current = false;
  //       });
  //     } catch (err) {
  //       console.error("Failed to fetch amount out:", err);
  //       isFetchingRef.current = false;
  //     }
  //   }, 150); // Reduced from 300ms to 150ms for faster response

  //   // Cleanup on unmount or when amount0 changes again
  //   return () => {
  //     if (debounceTimerRef.current) {
  //       clearTimeout(debounceTimerRef.current);
  //     }
  //   };
  // }, [
  //   state.amount0,
  //   state.amount1,
  //   state.token0,
  //   state.token1,
  //   tickLower,
  //   tickUpper,
  //   fetchAmountOut,
  //   fetchPriceAndPoolData,
  //   getContractToken,
  //   poolAddress,
  // ]);

  // Fetch price data
  useEffect(() => {
    if (!state.token0 || !state.token1 || !signer) return;

    const fetchPriceData = async () => {
      const contractToken0 = getContractToken(state.token0);
      const contractToken1 = getContractToken(state.token1);

      let pool = poolAddress;
      if (!pool) {
        pool = await fetchPool(contractToken0, contractToken1, state.feeTier);
        if (!pool || pool === ethers.ZeroAddress) return;
        setPoolAddress(pool);
      }

      const data = await fetchPriceAndPoolData(pool);
      if (data) {
        const slot0 = await getSlot0(pool);
        
        setCurrentPrice(data.priceData.currentPrice);
        setPriceRangeSuggestions(data.priceData.priceRangeSuggestions);
        setTickLower(data.tickLower);
        setTickUpper(data.tickUpper);

      }
    };

    fetchPriceData();
  }, [
    state.token0?.address,
    state.token1?.address,
    state.feeTier,
    fetchPool,
    fetchPriceAndPoolData,
    getContractToken,
    poolAddress,
    signer,
  ]);

  // Handler functions
  const handleTokenSelect = (token) => {
    // Keep the user's selection as-is (ETH or WETH) for UI display
    if (tokenSelectorOpen === "token0") {
      const contractToken0 = getContractToken(token);
      const contractToken1 = getContractToken(state.token1);

      // Check if trying to select the same token (using contract addresses)
      if (contractToken0?.address === contractToken1?.address) {
        toast.error("Cannot select the same token for both sides");
        setTokenSelectorOpen(null);
        return;
      }
      setState((s) => ({ ...s, token0: token, amount0: "", amount1: "" }));
    } else {
      const contractToken0 = getContractToken(state.token0);
      const contractToken1 = getContractToken(token);

      // Check if trying to select the same token (using contract addresses)
      if (contractToken0?.address === contractToken1?.address) {
        toast.error("Cannot select the same token for both sides");
        setTokenSelectorOpen(null);
        return;
      }
      setState((s) => ({ ...s, token1: token, amount0: "", amount1: "" }));
    }
    setTokenSelectorOpen(null);
  };

  // Swap token positions
  const handleSwapTokens = () => {
    setState((s) => ({
      ...s,
      token0: s.token1,
      token1: s.token0,
      amount0: s.amount1,
      amount1: s.amount0,
      minPrice: "",
      maxPrice: "",
    }));
    setTickLower("");
    setTickUpper("");
  };

  const handleApproveA = async () => {
    if (!state.amount0 || !state.token0) return;
    try {
      setIsProcessing(true);
      const contractToken = getContractToken(state.token0);
      await handleApproveTokenA(
        state.amount0,
        contractToken,
        POSITION_MANAGER_ADDRESS!,
      );
      showNotification("success", "Token A approved successfully!");
      const result = await fetchBalancesAndAllowances();
      if (result) {
        setAllowanceA(result.allowanceA);
      }
    } catch (err: any) {
      console.error("Approval failed:", err);
      showNotification("error", `Approval failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveB = async () => {
    if (!state.amount1 || !state.token1) return;
    try {
      setIsProcessing(true);
      const contractToken = getContractToken(state.token1);
      await handleApproveTokenB(
        state.amount1,
        contractToken,
        POSITION_MANAGER_ADDRESS!,
      );
      showNotification("success", "Token B approved successfully!");
      const result = await fetchBalancesAndAllowances();
      if (result) {
        setAllowanceB(result.allowanceB);
      }
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

    const tokenAApproved = isTokenApproved(
      state.amount0,
      allowanceA,
      state.token0.decimals,
    );
    const tokenBApproved = isTokenApproved(
      state.amount1,
      allowanceB,
      state.token1.decimals,
    );

    if (!tokenAApproved || !tokenBApproved) {
      showNotification("error", "Please approve both tokens first");
      return;
    }

    const hasBalance = checkSufficientBalance(
      state.amount0,
      state.amount1,
      balanceA,
      balanceB,
      state.token0,
      state.token1,
    );

    if (!hasBalance) {
      showNotification("error", "Insufficient balance");
      return;
    }

    try {
      setIsProcessing(true);

      // Use contract tokens for pool/mint operations
      const contractToken0 = getContractToken(state.token0);
      const contractToken1 = getContractToken(state.token1);

      // Fetch pool if not already done
      if (!poolAddress) {
        const pool = await fetchPool(
          contractToken0,
          contractToken1,
          state.feeTier,
        );
        if (!pool || pool === ethers.ZeroAddress) {
          return;
        }
        setPoolAddress(pool);
      }

      // Sort tokens by address (using contract tokens)
      const token0 =
        contractToken0.address.toLowerCase() <
        contractToken1.address.toLowerCase()
          ? contractToken0
          : contractToken1;
      const token1 =
        contractToken0.address.toLowerCase() <
        contractToken1.address.toLowerCase()
          ? contractToken1
          : contractToken0;

      const amount0Desired =
        token0.address === contractToken0.address
          ? ethers.parseUnits(state.amount0, Number(contractToken0.decimals))
          : ethers.parseUnits(state.amount1, Number(contractToken1.decimals));
      const amount1Desired =
        token0.address === contractToken0.address
          ? ethers.parseUnits(state.amount1, Number(contractToken1.decimals))
          : ethers.parseUnits(state.amount0, Number(contractToken0.decimals));

      const tl = tickLower ? BigInt(tickLower) : -887220n;
      const tu = tickUpper ? BigInt(tickUpper) : 887220n;

      // Use user input amounts as desired, let contract calculate actual usage
      // with concentrated liquidity math
      let finalAmount0Desired = amount0Desired;
      let finalAmount1Desired = amount1Desired;

      // Set minimums to 0 since LP math already accounts for slippage
      // The actual amounts used will be calculated by the contract based on
      // the concentrated liquidity position
      const amount0Min = 0n;
      const amount1Min = 0n;

      const params = {
        token0: token0.address,
        token1: token1.address,
        fee: state.feeTier,
        tickLower: Number(tl),
        tickUpper: Number(tu),
        amount0Desired: finalAmount0Desired,
        amount1Desired: finalAmount1Desired,
        amount0Min: amount0Min,
        amount1Min: amount1Min,
        recipient: address,
        deadline: Math.floor(Date.now() / 1000) + 30 * 60,
      };

      // Only send native ETH if user selected ETH (not WETH)
      const value = isNativeETH(state.token0)
        ? finalAmount0Desired
        : isNativeETH(state.token1)
          ? finalAmount1Desired
          : 0n;

      const tx = await mint(params, value);
      await tx.wait();

      showNotification("success", "Liquidity added successfully!");
      setState((s) => ({ ...s, amount0: "", amount1: "" }));
      const result = await fetchBalancesAndAllowances();
      if (result) {
        setBalanceA(result.balanceA);
        setBalanceB(result.balanceB);
      }
    } catch (err: any) {
      console.error("Add liquidity failed:", err);
      showNotification("error", `Add liquidity failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Validation helpers
  const isTokenAApproved = isTokenApproved(
    state.amount0,
    allowanceA,
    state.token0?.decimals || 18,
  );
  const isTokenBApproved = isTokenApproved(
    state.amount1,
    allowanceB,
    state.token1?.decimals || 18,
  );
  const hasSufficientBalance = checkSufficientBalance(
    state.amount0,
    state.amount1,
    balanceA,
    balanceB,
    state.token0,
    state.token1,
  );

  const canMint = canAddLiquidity(
    isConnected,
    state.token0,
    state.token1,
    state.amount0,
    state.amount1,
    isTokenAApproved,
    isTokenBApproved,
    hasSufficientBalance,
  );
  function formatUnits(value: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fraction = value % base
  return `${whole}.${fraction.toString().padStart(decimals, "0").slice(0, 6)}`
}

const handleAmount0Change = async (value: string) => {
  debugger
  const slot0 = await getSlot0(poolAddress);
  if (!slot0 || !tickLower || !tickUpper || !state.token0 || !state.token1) {
    setState(s => ({ ...s, amount0: value }))
    return
  }
try{


  // parse user input safely
  const amount0 =
    BigInt(Math.floor(parseFloat(value) * 10 ** state.token0.decimals))

  const sqrtLowerX96 = tickToSqrtPriceX96(tickLower)
  const sqrtUpperX96 = tickToSqrtPriceX96(tickUpper)

  const amount1Raw = quoteToken1FromToken0(
    amount0,
    slot0.sqrtPriceX96,
    sqrtLowerX96,
    sqrtUpperX96
  )

  setState(s => ({
    ...s,
    amount0: value,
    amount1: amount1Raw ? formatUnits(amount1Raw, state.token1.decimals) : ""
  }))
} catch (err) {
  console.error("Error in handleAmount0Change:", err);
  setState(s => ({ ...s, amount0: value }))
}
}


  return (
    <>
      <NotificationToast notification={notification} />

      <Card variant="glass" className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Plus className="h-5 w-5 text-secondary" />
            Add Liquidity
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="relative">
            <TokenPairSelector
              token0={state.token0}
              token1={state.token1}
              tokenSelectorOpen={tokenSelectorOpen}
              onTokenSelectorOpen={setTokenSelectorOpen}
              onTokenSelect={handleTokenSelect}
              chainId={chainId}
            />
            <button
              onClick={handleSwapTokens}
              disabled={!state.token0 || !state.token1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-muted border border-border rounded-lg p-2 hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Swap tokens"
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            </button>
          </div>

          <FeeTierSelector
            feeTier={state.feeTier}
            onFeeTierChange={(fee) => setState((s) => ({ ...s, feeTier: fee }))}
          />

          <PriceRangeInput
            token0={state.token0}
            token1={state.token1}
            minPrice={state.minPrice}
            maxPrice={state.maxPrice}
            currentPrice={currentPrice}
            isFullRange={isFullRange}
            priceRangeSuggestions={priceRangeSuggestions}
            onMinPriceChange={(v) => setState((s) => ({ ...s, minPrice: v }))}
            onMaxPriceChange={(v) => setState((s) => ({ ...s, maxPrice: v }))}
            onFullRangeChange={setIsFullRange}
            onSuggestionSelect={(suggestion) => {
              setState((s) => ({
                ...s,
                minPrice: suggestion.min.toFixed(2),
                maxPrice: suggestion.max.toFixed(2),
              }));
            }}
          />

          <DepositAmounts
            token0={state.token0}
            token1={state.token1}
            amount0={state.amount0}
            amount1={state.amount1}
            balanceA={balanceA}
            balanceB={balanceB}
            onAmount0Change={handleAmount0Change}
            onAmount1Change={(v) => setState((s) => ({ ...s, amount1: v }))}
          />

          <ImpermanentLossWarning
            isFullRange={isFullRange}
            minPrice={state.minPrice}
            maxPrice={state.maxPrice}
          />

          <ActionButton
            isConnected={isConnected}
            isProcessing={isProcessing}
            hasTokens={!!state.token0 && !!state.token1}
            hasAmounts={!!state.amount0 && !!state.amount1}
            isTokenAApproved={isTokenAApproved}
            isTokenBApproved={isTokenBApproved}
            hasSufficientBalance={hasSufficientBalance}
            canAddLiquidity={canMint}
            onApproveTokenA={handleApproveA}
            onApproveTokenB={handleApproveB}
            onAddLiquidity={handleAddLiquidity}
          />
        </CardContent>
      </Card>
    </>
  );
}

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

import { LiquidityCardProps, LiquidityState, PriceRangeSuggestion } from "./types";
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

export function LiquidityCard({ signer }: LiquidityCardProps) {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const POSITION_MANAGER_ADDRESS = uniswapContracts[chainId]?.positionManager;

  // State management
  const [state, setState] = useState<LiquidityState>(() => ({
    token0: null,
    token1: null,
    amount0: "",
    amount1: "",
    feeTier: FEE_TIERS.MEDIUM,
    minPrice: "",
    maxPrice: "",
  }));

  const [balanceA, setBalanceA] = useState("0");
  const [balanceB, setBalanceB] = useState("0");
  const [allowanceA, setAllowanceA] = useState("0");
  const [allowanceB, setAllowanceB] = useState("0");
  const [poolAddress, setPoolAddress] = useState("");

  // Refs for debouncing and cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  const { notification, showNotification } = useLiquidityNotification();
  const { isProcessing, setIsProcessing } = useLiquidityProcessing();
  const { tokenSelectorOpen, setTokenSelectorOpen, isFullRange, setIsFullRange } =
    useTokenSelector();
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
  const {
    mint,
    contract,
    isInitialized,
    approve,
  } = usePositionManager(signer);

  // Check if hooks are ready
  const isQuoteInitialized = true; // You may need to add this hook check
  const { fetchPool, getAmountOut, fetchAmountOut, fetchPriceAndPoolData } = usePriceData({
    signer,
    token0: state.token0,
    token1: state.token1,
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
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!state.amount0) {
      setState((s) => ({ ...s, amount1: "" }));
      return;
    }

    // Debounce the fetch call
    debounceTimerRef.current = setTimeout(() => {
      fetchAmountOut(state.amount0, (amount) => {
        setState((s) => ({ ...s, amount1: amount }));
      });
    }, 300); // 300ms debounce

    // Cleanup on unmount or when amount0 changes again
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.amount0, fetchAmountOut]);

  // Fetch price data
  useEffect(() => {
    if (!state.token0 || !state.token1 || !signer) return;

    const fetchPriceData = async () => {
      let pool = poolAddress;
      if (!pool) {
        pool = await fetchPool(state.token0!, state.token1!, state.feeTier);
        if (!pool || pool === ethers.ZeroAddress) return;
      }

      const data = await fetchPriceAndPoolData(pool);
      if (data) {
        setCurrentPrice(data.priceData.currentPrice);
        setPriceRangeSuggestions(data.priceData.priceRangeSuggestions);
        setTickLower(data.tickLower);
        setTickUpper(data.tickUpper);
      }
    };

    fetchPriceData();
  }, [state.token0?.address, state.token1?.address, state.feeTier]);

  // Handler functions
  const normalizeToken = useCallback((token) => {
    if (token.symbol === "ETH") {
      const wethToken = COMMON_TOKENS[chainId]?.find((t) => t.symbol === "WETH");
      return wethToken || token;
    }
    return token;
  }, [chainId]);

  const handleTokenSelect = (token) => {
    const normalizedToken = normalizeToken(token);
    
    if (tokenSelectorOpen === "token0") {
      // Check if trying to select the same token
      if (normalizedToken.address === state.token1?.address) {
        toast.error("Cannot select the same token for both sides");
        setTokenSelectorOpen(null);
        return;
      }
      setState((s) => ({ ...s, token0: normalizedToken, amount0: "", amount1: "" }));
    } else {
      // Check if trying to select the same token
      if (normalizedToken.address === state.token0?.address) {
        toast.error("Cannot select the same token for both sides");
        setTokenSelectorOpen(null);
        return;
      }
      setState((s) => ({ ...s, token1: normalizedToken, amount0: "", amount1: "" }));
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
      await handleApproveTokenA(
        state.amount0,
        state.token0,
        POSITION_MANAGER_ADDRESS!
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
      await handleApproveTokenB(
        state.amount1,
        state.token1,
        POSITION_MANAGER_ADDRESS!
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
      state.token0.decimals
    );
    const tokenBApproved = isTokenApproved(
      state.amount1,
      allowanceB,
      state.token1.decimals
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
      state.token1
    );

    if (!hasBalance) {
      showNotification("error", "Insufficient balance");
      return;
    }

    try {
      setIsProcessing(true);

      // Fetch pool if not already done
      if (!poolAddress) {
        const pool = await fetchPool(state.token0, state.token1, state.feeTier);
        if (!pool || pool === ethers.ZeroAddress) {
          return;
        }
        setPoolAddress(pool);
      }

      // Sort tokens by address
      const token0 =
        state.token0.address.toLowerCase() <
        state.token1.address.toLowerCase()
          ? state.token0
          : state.token1;
      const token1 =
        state.token0.address.toLowerCase() <
        state.token1.address.toLowerCase()
          ? state.token1
          : state.token0;

      const amount0Desired =
        token0 === state.token0
          ? ethers.parseUnits(state.amount0, Number(state.token0.decimals))
          : ethers.parseUnits(state.amount1, Number(state.token1.decimals));
      const amount1Desired =
        token0 === state.token0
          ? ethers.parseUnits(state.amount1, Number(state.token1.decimals))
          : ethers.parseUnits(state.amount0, Number(state.token0.decimals));

      const tl = tickLower ? BigInt(tickLower) : -887220n;
      const tu = tickUpper ? BigInt(tickUpper) : 887220n;

      const slippageBasisPoints = BigInt(Math.floor(0.5 * 100));
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
    state.token0?.decimals || 18
  );
  const isTokenBApproved = isTokenApproved(
    state.amount1,
    allowanceB,
    state.token1?.decimals || 18
  );
  const hasSufficientBalance = checkSufficientBalance(
    state.amount0,
    state.amount1,
    balanceA,
    balanceB,
    state.token0,
    state.token1
  );

  const canMint = canAddLiquidity(
    isConnected,
    state.token0,
    state.token1,
    state.amount0,
    state.amount1,
    isTokenAApproved,
    isTokenBApproved,
    hasSufficientBalance
  );

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
            onFeeTierChange={(fee) =>
              setState((s) => ({ ...s, feeTier: fee }))
            }
          />

          <PriceRangeInput
            token0={state.token0}
            token1={state.token1}
            minPrice={state.minPrice}
            maxPrice={state.maxPrice}
            currentPrice={currentPrice}
            isFullRange={isFullRange}
            priceRangeSuggestions={priceRangeSuggestions}
            onMinPriceChange={(v) =>
              setState((s) => ({ ...s, minPrice: v }))
            }
            onMaxPriceChange={(v) =>
              setState((s) => ({ ...s, maxPrice: v }))
            }
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
            onAmount0Change={(v) => setState((s) => ({ ...s, amount0: v }))}
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

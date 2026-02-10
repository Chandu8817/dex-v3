import { useCallback, useRef } from "react";
import { JsonRpcSigner, ethers } from "ethers";
import { Token } from "@/lib/web3/tokens";
import { useFactory } from "@/hooks/useFactory";
import { useQuote } from "@/hooks/useQuote";
import { usePool } from "@/hooks/usePool";
import { PriceRangeSuggestion, PoolData } from "../types";
import { snapTick } from "../utils/formatting";
import { toast } from "sonner";

interface QuoteCache {
  amountOut: string;
  timestamp: number;
}

interface UsePriceDataProps {
  signer: JsonRpcSigner | null;
  token0: Token | null;
  token1: Token | null;
  feeTier: number;
  poolAddress: string;
  isInitialized: boolean;
  isQuoteInitialized: boolean;
}

const QUOTE_CACHE_DURATION = 30000; // 30 seconds

export const usePriceData = ({
  signer,
  token0,
  token1,
  feeTier,
  poolAddress,
  isInitialized,
  isQuoteInitialized,
}: UsePriceDataProps) => {
  const { getPoolAddress } = useFactory(signer);
  const { quoteExactInputSingle } = useQuote(signer);
  const { getCurrentPrice, getSlot0, getTickSpacing } = usePool(signer);
  
  // Cache for quotes
  const quoteCacheRef = useRef<Map<string, QuoteCache>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPool = useCallback(
    async (tokenA: Token, tokenB: Token, fee: number): Promise<string | null> => {
      if (!signer) return null;
      if (!tokenA || !tokenB) return null;
      try {
        
        const address = await getPoolAddress(tokenA, tokenB, fee);
        return address;
      } catch (error) {
        console.error("Error fetching pool address:", error);
        toast.error("Failed to fetch pool address");
        return null;
      }
    },
    [signer, isInitialized, getPoolAddress]
  );

  const getAmountOut = useCallback(
    (
      amount0: string,
      setAmount1: (value: string) => void
    ): (() => void) => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Return cleanup function
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    },
    []
  );

  const fetchAmountOut = useCallback(
    async (
      amount0: string,
      setAmount1: (value: string) => void
    ): Promise<void> => {
      if (!token0 || !token1 || !amount0 || !signer) {
        setAmount1("");
        return;
      }

      try {
        const decimalsIn = token0.decimals;
        const decimalsOut = token1.decimals;

        if (isNaN(Number(amount0)) || Number(amount0) <= 0) {
          setAmount1("");
          return;
        }

        if (!isQuoteInitialized) {
          toast.error("Quote contract not initialized");
          return;
        }

        // Generate cache key
        const cacheKey = `${token0.address}-${token1.address}-${feeTier}-${amount0}`;
        const cachedQuote = quoteCacheRef.current.get(cacheKey);
        
        // Check if cache is valid (not expired)
        if (cachedQuote && Date.now() - cachedQuote.timestamp < QUOTE_CACHE_DURATION) {
          setAmount1(cachedQuote.amountOut);
          return;
        }

        const quote = await quoteExactInputSingle(
          token0.address,
          token1.address,
          Number(feeTier),
          amount0,
          "0",
          decimalsIn,
          decimalsOut
        );

        if (!quote) return;

        const amountOutWei = ethers.parseUnits(quote.amountOut, decimalsOut);
        const slippageBasisPoints = BigInt(Math.floor(0.5 * 100));
        const minAmountOut = ethers.formatUnits(
          (BigInt(amountOutWei) * (10000n - slippageBasisPoints)) / 10000n,
          decimalsOut
        );

        const result = minAmountOut.toString();
        
        // Cache the result with timestamp
        quoteCacheRef.current.set(cacheKey, {
          amountOut: result,
          timestamp: Date.now(),
        });

        setAmount1(result);
      } catch (err) {
        console.error("Failed to get quote:", err);
      }
    },
    [token0, token1, feeTier, signer, quoteExactInputSingle, isQuoteInitialized]
  );

  const fetchPriceAndPoolData = useCallback(
    async (
      pool: string
    ): Promise<{
      priceData: {
        currentPrice: number;
        priceRangeSuggestions: PriceRangeSuggestion[];
      };
      poolData: Partial<PoolData>;
      tickLower: string;
      tickUpper: string;
    } | null> => {
      if (!token0 || !token1 || !signer) return null;
      if (!pool || pool === ethers.ZeroAddress) return null;

      try {
        const price = await getCurrentPrice(
          pool,
          token0.decimals,
          token1.decimals
        );

        const slot0 = await getSlot0(pool);
        const spacing = await getTickSpacing(pool);

        if (!slot0 || !spacing) return null;

        const currentTick = Number(slot0.tick);
        const sqrtRatio = Number(slot0.sqrtPriceX96) / Math.pow(2, 96);
        const tickSpacing = Number(spacing);

        const range = Math.max(1, Math.round(Math.abs(Number(currentTick)) * 0.02));
        const lower = snapTick(Number(currentTick) - range, tickSpacing, true);
        const upper = snapTick(Number(currentTick) + range, tickSpacing, false);

        const priceRangeSuggestionsData: PriceRangeSuggestion[] = [
          {
            label: "±5%",
            min: Number(price.token1PerToken0) * 0.95,
            max: Number(price.token1PerToken0) * 1.05,
            range: 5,
          },
          {
            label: "±10%",
            min: Number(price.token1PerToken0) * 0.9,
            max: Number(price.token1PerToken0) * 1.1,
            range: 10,
          },
          {
            label: "±25%",
            min: Number(price.token1PerToken0) * 0.75,
            max: Number(price.token1PerToken0) * 1.25,
            range: 25,
          },
        ];

        return {
          priceData: {
            currentPrice: Number(price.token1PerToken0),
            priceRangeSuggestions: priceRangeSuggestionsData,
          },
          poolData: {
            currentTick,
            sqrtRatio,
            tickSpacing,
          },
          tickLower: lower.toString(),
          tickUpper: upper.toString(),
        };
      } catch (error) {
        console.error("Error fetching price data:", error);
        return null;
      }
    },
    [token0, token1, signer, getCurrentPrice, getSlot0, getTickSpacing]
  );

  getSlot0 

  return {
    fetchPool,
    getAmountOut,
    fetchAmountOut,
    fetchPriceAndPoolData,
  };
};

import { useState, useCallback, useRef, useEffect } from "react";
import { JsonRpcSigner } from "ethers";
import { Token } from "@/lib/web3/tokens";
import { useQuote as useQuoteHook } from "@/hooks/useQuote";
import { QuoteData, QuoteCache } from "../types";
import {
  getNormalizedTokenAddress,
  isSameToken,
  calculatePriceImpact,
} from "../utils";

interface UseOptimizedQuoteProps {
  signer: JsonRpcSigner | null;
  chainId: number;
}

const CACHE_DURATION = 30000; // 30 seconds cache

export const useOptimizedQuote = ({ signer, chainId }: UseOptimizedQuoteProps) => {
  const { quoteExactInputSingle, quoteExactOutputSingle } = useQuoteHook(signer);

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Use refs to store debounce timers and cache
  const inputDebounceRef = useRef<NodeJS.Timeout>();
  const outputDebounceRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, QuoteCache>>(new Map());

  // Cleanup function
  useEffect(() => {
    return () => {
      if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);
      if (outputDebounceRef.current) clearTimeout(outputDebounceRef.current);
    };
  }, []);

  /**
   * Generate cache key for quote request
   */
  const getCacheKey = (
    tokenIn: string,
    tokenOut: string,
    amount: string,
    feeTier: number,
    isOutput: boolean
  ): string => {
    return `${tokenIn}-${tokenOut}-${amount}-${feeTier}-${isOutput}`;
  };

  /**
   * Check and retrieve from cache
   */
  const getFromCache = (key: string): QuoteData | null => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    // Remove expired cache entry
    if (cached) cacheRef.current.delete(key);
    return null;
  };

  /**
   * Store in cache
   */
  const setCache = (key: string, data: QuoteData) => {
    cacheRef.current.set(key, { key, data, timestamp: Date.now() });
  };

  /**
   * Fetch quote for input amount
   */
  const fetchQuoteForInput = useCallback(
    async (
      inputToken: Token,
      outputToken: Token,
      inputAmount: string,
      feeTier: number,
      slippage: number
    ) => {
      // Clear output debounce
      if (outputDebounceRef.current) clearTimeout(outputDebounceRef.current);

      // Validate input
      if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0) {
        setQuote(null);
        return;
      }

      // Check cache first
      const t1 = getNormalizedTokenAddress(inputToken, chainId, inputToken.symbol === "ETH");
      const t2 = getNormalizedTokenAddress(outputToken, chainId, outputToken.symbol === "ETH");
      const cacheKey = getCacheKey(t1, t2, inputAmount, feeTier, false);

      const cachedQuote = getFromCache(cacheKey);
      if (cachedQuote) {
        setQuote(cachedQuote);
        return;
      }

      // Check if tokens are the same
      if (isSameToken(t1, t2)) {
        const quote: QuoteData = {
          outputAmount: inputAmount,
          priceImpact: 0,
          gasEstimate: "0",
          route: [inputToken.symbol, outputToken.symbol],
          feeTier,
        };
        setQuote(quote);
        setCache(cacheKey, quote);
        return;
      }

      // Debounce the actual quote request
      if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);

      inputDebounceRef.current = setTimeout(async () => {
        try {
          setQuoteLoading(true);

          const quoteResult = await quoteExactInputSingle(
            t1,
            t2,
            feeTier,
            inputAmount,
            "0",
            inputToken.decimals,
            outputToken.decimals
          );

          if (quoteResult && quoteResult.amountOut) {
            const slippageBasisPoints = Math.floor(slippage * 100);
            const actualOutput = parseFloat(quoteResult.amountOut);
            const priceImpact = calculatePriceImpact(actualOutput, slippageBasisPoints);

            const newQuote: QuoteData = {
              outputAmount: quoteResult.amountOut,
              priceImpact,
              gasEstimate: "0.0015",
              route: [inputToken.symbol, outputToken.symbol],
              feeTier,
            };

            setQuote(newQuote);
            setCache(cacheKey, newQuote);
          } else {
            setQuote(null);
          }
        } catch (err) {
          console.error("Error getting input quote:", err);
          setQuote(null);
        } finally {
          setQuoteLoading(false);
        }
      }, 300); // Reduced debounce time from 500ms to 300ms
    },
    [signer, chainId, quoteExactInputSingle]
  );

  /**
   * Fetch quote for output amount
   */
  const fetchQuoteForOutput = useCallback(
    async (
      inputToken: Token,
      outputToken: Token,
      outputAmount: string,
      feeTier: number,
      slippage: number
    ) => {
      // Clear input debounce
      if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);

      // Validate output
      if (
        !outputAmount ||
        isNaN(parseFloat(outputAmount)) ||
        parseFloat(outputAmount) <= 0
      ) {
        setQuote(null);
        return;
      }

      // Check cache first
      const t1 = getNormalizedTokenAddress(inputToken, chainId, inputToken.symbol === "ETH");
      const t2 = getNormalizedTokenAddress(outputToken, chainId, outputToken.symbol === "ETH");
      const cacheKey = getCacheKey(t1, t2, outputAmount, feeTier, true);

      const cachedQuote = getFromCache(cacheKey);
      if (cachedQuote) {
        setQuote(cachedQuote);
        return;
      }

      // Check if tokens are the same
      if (isSameToken(t1, t2)) {
        const quote: QuoteData = {
          outputAmount: outputAmount,
          priceImpact: 0,
          gasEstimate: "0",
          route: [inputToken.symbol, outputToken.symbol],
          feeTier,
        };
        setQuote(quote);
        setCache(cacheKey, quote);
        return;
      }

      // Debounce the actual quote request
      if (outputDebounceRef.current) clearTimeout(outputDebounceRef.current);

      outputDebounceRef.current = setTimeout(async () => {
        try {
          setQuoteLoading(true);

          const quoteResult = await quoteExactOutputSingle(
            t1,
            t2,
            feeTier,
            outputAmount,
            "0",
            inputToken.decimals,
            outputToken.decimals
          );

          if (quoteResult && quoteResult.amountIn) {
            const actualInput = parseFloat(quoteResult.amountIn);
            const expectedInput = actualInput * (1 - slippage);
            const priceImpact = ((actualInput - expectedInput) / expectedInput) * 100;

            const newQuote: QuoteData = {
              outputAmount: quoteResult.amountIn,
              priceImpact: Math.max(0, priceImpact),
              gasEstimate: "0.0015",
              route: [inputToken.symbol, outputToken.symbol],
              feeTier,
            };

            setQuote(newQuote);
            setCache(cacheKey, newQuote);
          } else {
            setQuote(null);
          }
        } catch (err) {
          console.error("Error getting output quote:", err);
          setQuote(null);
        } finally {
          setQuoteLoading(false);
        }
      }, 300); // Reduced debounce time
    },
    [signer, chainId, quoteExactOutputSingle]
  );

  /**
   * Clear cache (useful when tokens change)
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    quote,
    quoteLoading,
    fetchQuoteForInput,
    fetchQuoteForOutput,
    clearCache,
  };
};

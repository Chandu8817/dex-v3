import { Token, COMMON_TOKENS, getNativeToken } from "@/lib/web3/tokens";
import { ethers } from "ethers";

/**
 * Convert token address to WETH if it's the native token
 * Memoized to avoid repeated lookups
 */
const tokenCache = new Map<string, string>();

export const getNormalizedTokenAddress = (
  token: Token,
  chainId: number,
  isNative: boolean
): string => {
  if (!isNative) return token.address;

  const cacheKey = `${chainId}-weth`;
  if (tokenCache.has(cacheKey)) {
    return tokenCache.get(cacheKey)!;
  }

  const wethToken = COMMON_TOKENS[chainId]?.find((t) => t.symbol === "WETH");
  if (wethToken) {
    tokenCache.set(cacheKey, wethToken.address);
    return wethToken.address;
  }

  return token.address;
};

/**
 * Check if two tokens are the same
 */
export const isSameToken = (token1: string, token2: string): boolean => {
  return token1.toLowerCase() === token2.toLowerCase();
};

/**
 * Format balance for display
 */
export const formatDisplayBalance = (balance: string, decimals: number): string => {
  try {
    const formatted = ethers.formatUnits(balance, decimals);
    return parseFloat(formatted).toFixed(4);
  } catch (e) {
    console.error("Error formatting balance:", e);
    return "0";
  }
};

/**
 * Calculate price impact with slippage
 */
export const calculatePriceImpact = (
  actualOutput: number,
  slippageBasisPoints: number
): number => {
  const bps = 10_000 - slippageBasisPoints;
  const expectedOutput = (actualOutput * bps) / 10000;
  const priceImpact = ((expectedOutput - actualOutput) / expectedOutput) * 100;
  return Math.max(0, priceImpact);
};

/**
 * Check if balance is sufficient
 */
export const hasSufficientBalance = (
  inputAmount: string,
  balance: string,
  decimals: number
): boolean => {
  if (!inputAmount || !balance) return false;
  try {
    const amountWei = ethers.parseUnits(inputAmount, decimals);
    return BigInt(balance) >= amountWei;
  } catch (e) {
    console.error("Error checking balance:", e);
    return false;
  }
};

/**
 * Calculate minimum output with slippage
 */
export const calculateMinimumOutput = (
  outputAmount: string,
  slippage: number,
  decimals: number
): bigint => {
  try {
    const outputWei = ethers.parseUnits(outputAmount, decimals);
    const slippageBasisPoints = BigInt(Math.floor(slippage * 100));
    return (outputWei * (10000n - slippageBasisPoints)) / 10000n;
  } catch (e) {
    console.error("Error calculating minimum output:", e);
    return 0n;
  }
};

import { ethers } from "ethers";

/**
 * Uniswap V3 uses Q64.96 fixed-point arithmetic for sqrtPriceX96
 * This module handles conversion between sqrtPriceX96, prices, and ticks
 * WITHOUT relying on Uniswap SDK
 */

/**
 * MIN_TICK and MAX_TICK from Uniswap V3
 * These define the valid tick range
 */
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

/**
 * Convert sqrtPriceX96 to price (token1 per token0)
 * sqrtPriceX96 = sqrt(price) * 2^96
 * price = (sqrtPriceX96 / 2^96)^2
 *
 * @param sqrtPriceX96 - sqrt price in Q64.96 format
 * @param decimals0 - decimals of token0
 * @param decimals1 - decimals of token1
 * @returns price as number (token1 per token0)
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  decimals0: number,
  decimals1: number
): number {
  // Convert to decimal: divide by 2^96
  const Q96 = BigInt(2) ** BigInt(96);
  const sqrtPrice = Number(sqrtPriceX96) / Number(Q96);
  
  // Price = (sqrtPrice)^2, adjusted for decimals
  const price = sqrtPrice * sqrtPrice;
  const decimalAdjustment = Math.pow(10, decimals1 - decimals0);
  
  return price * decimalAdjustment;
}

/**
 * Convert tick to price (token1 per token0)
 * price = 1.0001^tick
 *
 * @param tick - tick number
 * @param decimals0 - decimals of token0
 * @param decimals1 - decimals of token1
 * @returns price as number
 */
export function tickToPrice(
  tick: number,
  decimals0: number,
  decimals1: number
): number {
  // price = 1.0001^tick
  const price = Math.pow(1.0001, tick);
  const decimalAdjustment = Math.pow(10, decimals1 - decimals0);
  return price * decimalAdjustment;
}

/**
 * Convert price to tick
 * tick = log(price) / log(1.0001)
 *
 * @param price - price (token1 per token0)
 * @param decimals0 - decimals of token0
 * @param decimals1 - decimals of token1
 * @returns tick number (rounded down)
 */
export function priceToTick(
  price: number,
  decimals0: number,
  decimals1: number
): number {
  const decimalAdjustment = Math.pow(10, decimals0 - decimals1);
  const adjustedPrice = price * decimalAdjustment;
  const tick = Math.log(adjustedPrice) / Math.log(1.0001);
  return Math.floor(tick);
}

/**
 * Get sqrtPriceX96 from tick
 * sqrtPriceX96 = sqrt(1.0001^tick) * 2^96
 *
 * @param tick - tick number
 * @returns sqrtPriceX96 as bigint
 */
export function tickToSqrtPriceX96(tick: number): bigint {
  const sqrtPrice = Math.sqrt(Math.pow(1.0001, tick));
  const Q96 = BigInt(2) ** BigInt(96);
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

/**
 * Check if a position is in range
 *
 * @param currentTick - current pool tick
 * @param tickLower - position lower tick
 * @param tickUpper - position upper tick
 * @returns true if position is in range
 */
export function isInRange(
  currentTick: number,
  tickLower: number,
  tickUpper: number
): boolean {
  return currentTick >= tickLower && currentTick < tickUpper;
}

/**
 * Determine which side of the range the position is on
 *
 * @param currentTick - current pool tick
 * @param tickLower - position lower tick
 * @param tickUpper - position upper tick
 * @returns "BELOW" | "IN_RANGE" | "ABOVE"
 */
export function getPositionSide(
  currentTick: number,
  tickLower: number,
  tickUpper: number
): "BELOW" | "IN_RANGE" | "ABOVE" {
  if (currentTick < tickLower) return "BELOW";
  if (currentTick >= tickUpper) return "ABOVE";
  return "IN_RANGE";
}

/**
 * Calculate liquidity from token amounts using the formula:
 * L = min(amount0 * 2^96 / (sqrtPrice1 - sqrtPrice0), amount1 * 2^96 / (sqrtPrice0 - sqrtPrice1))
 *
 * @param amount0 - amount of token0 (in wei)
 * @param amount1 - amount of token1 (in wei)
 * @param sqrtPriceX96 - current sqrt price
 * @param sqrtPriceX96Lower - sqrt price at lower tick
 * @param sqrtPriceX96Upper - sqrt price at upper tick
 * @returns liquidity as bigint
 */
export function getLiquidityFromAmounts(
  amount0: bigint,
  amount1: bigint,
  sqrtPriceX96: bigint,
  sqrtPriceX96Lower: bigint,
  sqrtPriceX96Upper: bigint
): bigint {
  const Q96 = BigInt(2) ** BigInt(96);

  let liquidity = BigInt(0);

  if (sqrtPriceX96 <= sqrtPriceX96Lower) {
    // Only token0
    liquidity = (amount0 * Q96) / (sqrtPriceX96Upper - sqrtPriceX96Lower);
  } else if (sqrtPriceX96 >= sqrtPriceX96Upper) {
    // Only token1
    liquidity = (amount1 * Q96) / (sqrtPriceX96Upper - sqrtPriceX96Lower);
  } else {
    // Both tokens
    const liquidity0 = (amount0 * Q96) / (sqrtPriceX96Upper - sqrtPriceX96);
    const liquidity1 = (amount1 * Q96) / (sqrtPriceX96 - sqrtPriceX96Lower);
    liquidity = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  }

  return liquidity;
}

/**
 * Calculate token amounts from liquidity
 *
 * @param liquidity - liquidity amount
 * @param sqrtPriceX96 - current sqrt price
 * @param sqrtPriceX96Lower - sqrt price at lower tick
 * @param sqrtPriceX96Upper - sqrt price at upper tick
 * @returns { amount0, amount1 } in wei
 */
export function getAmountsFromLiquidity(
  liquidity: bigint,
  sqrtPriceX96: bigint,
  sqrtPriceX96Lower: bigint,
  sqrtPriceX96Upper: bigint
): { amount0: bigint; amount1: bigint } {
  const Q96 = BigInt(2) ** BigInt(96);

  let amount0 = BigInt(0);
  let amount1 = BigInt(0);

  if (sqrtPriceX96 <= sqrtPriceX96Lower) {
    // Only token0
    amount0 = (liquidity * (sqrtPriceX96Upper - sqrtPriceX96Lower)) / Q96;
  } else if (sqrtPriceX96 >= sqrtPriceX96Upper) {
    // Only token1
    amount1 = (liquidity * (sqrtPriceX96Upper - sqrtPriceX96Lower)) / Q96;
  } else {
    // Both tokens
    amount0 = (liquidity * (sqrtPriceX96Upper - sqrtPriceX96)) / Q96;
    amount1 = (liquidity * (sqrtPriceX96 - sqrtPriceX96Lower)) / Q96;
  }

  return { amount0, amount1 };
}

/**
 * Estimate amounts for a given primary token when increasing liquidity
 * This is a simplified estimate used for preview purposes
 *
 * @param primaryAmount - amount of primary token
 * @param sqrtPriceX96 - current sqrt price
 * @param sqrtPriceX96Lower - sqrt price at lower tick
 * @param sqrtPriceX96Upper - sqrt price at upper tick
 * @param isPrimary0 - is primary token token0?
 * @returns { amount0, amount1 } - estimated amounts
 */
export function estimateSecondaryAmountForIncrease(
  primaryAmount: bigint,
  sqrtPriceX96: bigint,
  sqrtPriceX96Lower: bigint,
  sqrtPriceX96Upper: bigint,
  isPrimary0: boolean
): { amount0: bigint; amount1: bigint } {
  const Q96 = BigInt(2) ** BigInt(96);

  if (sqrtPriceX96 <= sqrtPriceX96Lower) {
    // Below range, need only token0
    return isPrimary0
      ? { amount0: primaryAmount, amount1: BigInt(0) }
      : { amount0: BigInt(0), amount1: primaryAmount };
  } else if (sqrtPriceX96 >= sqrtPriceX96Upper) {
    // Above range, need only token1
    return isPrimary0
      ? { amount0: primaryAmount, amount1: BigInt(0) }
      : { amount0: BigInt(0), amount1: primaryAmount };
  } else {
    // In range, need both
    if (isPrimary0) {
      // Primary is token0, estimate token1
      const secondaryAmount = (primaryAmount * (sqrtPriceX96 - sqrtPriceX96Lower)) / (sqrtPriceX96Upper - sqrtPriceX96);
      return { amount0: primaryAmount, amount1: secondaryAmount };
    } else {
      // Primary is token1, estimate token0
      const secondaryAmount = (primaryAmount * (sqrtPriceX96Upper - sqrtPriceX96)) / (sqrtPriceX96 - sqrtPriceX96Lower);
      return { amount0: secondaryAmount, amount1: primaryAmount };
    }
  }
}

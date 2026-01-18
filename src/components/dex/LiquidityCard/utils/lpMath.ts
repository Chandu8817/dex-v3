import { Position, Pool } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token } from "@uniswap/sdk-core";
import { ethers } from "ethers";

export interface LpPreviewResult {
  amount0Used: string; // Formatted string (decimal)
  amount1Used: string; // Formatted string (decimal)
  amount0Max: string;  // User-provided amount
  amount1Max: string;  // User-provided amount
  liquidity: string;   // Minted liquidity
  amount0UsedWei: bigint;
  amount1UsedWei: bigint;
  imbalanceRatio: number; // 0-1, where 1 = perfectly balanced
  warning: string | null;
}

/**
 * Calculate LP preview using Uniswap V3 concentrated liquidity math
 * 
 * Replaces swap-based quote logic with actual LP math
 * Takes into account:
 * - Current pool price (sqrtPriceX96)
 * - Tick range (tickLower, tickUpper)
 * - Concentrated liquidity calculations
 * 
 * @param pool Uniswap V3 Pool instance
 * @param token0 Token0 from pool
 * @param token1 Token1 from pool
 * @param amount0Input User input for token0 (in decimal form, e.g., "5.0")
 * @param amount1Input User input for token1 (in decimal form, e.g., "4.96")
 * @param tickLower Lower tick of position
 * @param tickUpper Upper tick of position
 * @returns LpPreviewResult with accurate amounts
 */
export function getLpPreview(
  pool: Pool,
  token0: Token,
  token1: Token,
  amount0Input: string,
  amount1Input: string,
  tickLower: number,
  tickUpper: number
): LpPreviewResult {
  try {
    // Parse input amounts to wei
    const amount0Wei = ethers.parseUnits(amount0Input, token0.decimals);
    const amount1Wei = ethers.parseUnits(amount1Input, token1.decimals);

    // Create CurrencyAmounts for SDK
    const currencyAmount0 = CurrencyAmount.fromRawAmount(token0, amount0Wei.toString());
    const currencyAmount1 = CurrencyAmount.fromRawAmount(token1, amount1Wei.toString());

    // Calculate position using V3 SDK
    // This handles the concentrated liquidity math correctly
    const position = Position.fromAmounts({
      pool,
      tickLower,
      tickUpper,
      amount0: currencyAmount0.quotient.toString(),
      amount1: currencyAmount1.quotient.toString(),
      useFullPrecision: true,
    });

    // Extract actual amounts that will be used
    const amount0Used = position.amount0;
    const amount1Used = position.amount1;

    // Get liquidity that will be minted
    const liquidity = position.liquidity;

    // Calculate imbalance ratio (how much of each token is being used)
    // If ratio is close to 1, it means both tokens are being used proportionally
    const ratio0 = Number(amount0Used.quotient.toString()) / Number(currencyAmount0.quotient.toString());
    const ratio1 = Number(amount1Used.quotient.toString()) / Number(currencyAmount1.quotient.toString());
    
    // Imbalance: how much of the limiting token is being used
    const limitingRatio = Math.min(ratio0, ratio1);
    const imbalanceRatio = limitingRatio; // 1 = perfect, 0 = one token unused

    // Generate warning if imbalance is high
    let warning: string | null = null;
    if (imbalanceRatio < 0.5) {
      const unusedToken = ratio0 < ratio1 ? token0.symbol : token1.symbol;
      const unusedPercent = Math.round((1 - imbalanceRatio) * 100);
      warning = `${unusedPercent}% of ${unusedToken} won't be used at this price range`;
    }

    // Format amounts back to decimal strings
    const amount0UsedDecimal = ethers.formatUnits(
      amount0Used.quotient.toString(),
      token0.decimals
    );
    const amount1UsedDecimal = ethers.formatUnits(
      amount1Used.quotient.toString(),
      token1.decimals
    );

    return {
      amount0Used: amount0UsedDecimal,
      amount1Used: amount1UsedDecimal,
      amount0Max: amount0Input,
      amount1Max: amount1Input,
      liquidity: liquidity.toString(),
      amount0UsedWei: BigInt(amount0Used.quotient.toString()),
      amount1UsedWei: BigInt(amount1Used.quotient.toString()),
      imbalanceRatio,
      warning,
    };
  } catch (error) {
    console.error("Error calculating LP preview:", error);
    throw new Error(`Failed to calculate LP amounts: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get estimated amounts by primary token
 * User enters amount0, we calculate amount1 that will actually be used
 * 
 * @param pool Pool instance
 * @param token0 Token0
 * @param token1 Token1
 * @param primaryAmount Amount of primary token (as decimal string)
 * @param isPrimary0 Is token0 the primary input?
 * @param tickLower Lower tick
 * @param tickUpper Upper tick
 * @returns Preview with estimated secondary amount
 */
export function getLpPreviewByPrimaryAmount(
  pool: Pool,
  token0: Token,
  token1: Token,
  primaryAmount: string,
  isPrimary0: boolean,
  tickLower: number,
  tickUpper: number
): LpPreviewResult {
  try {
    // Start with a reasonable estimate for the secondary amount
    // This will be refined by Position.fromAmounts
    const estimatedSecondaryAmount = estimateSecondaryAmount(
      pool,
      token0,
      token1,
      primaryAmount,
      isPrimary0
    );

    const amount0Input = isPrimary0 ? primaryAmount : estimatedSecondaryAmount;
    const amount1Input = isPrimary0 ? estimatedSecondaryAmount : primaryAmount;

    return getLpPreview(
      pool,
      token0,
      token1,
      amount0Input,
      amount1Input,
      tickLower,
      tickUpper
    );
  } catch (error) {
    console.error("Error calculating LP preview by primary amount:", error);
    throw error;
  }
}

/**
 * Estimate secondary amount based on current pool price
 * This is a simple estimate, refined by Position.fromAmounts
 */
function estimateSecondaryAmount(
  pool: Pool,
  token0: Token,
  token1: Token,
  primaryAmount: string,
  isPrimary0: boolean
): string {
  try {
    const primaryWei = ethers.parseUnits(primaryAmount, isPrimary0 ? token0.decimals : token1.decimals);
    
    // Get current price from pool
    const price = pool.priceOf(token0);
    const priceDecimal = parseFloat(price.toSignificant(18));

    // Calculate secondary amount based on current price
    let secondaryAmount: bigint;
    if (isPrimary0) {
      // primaryAmount is token0, calculate token1
      const secondaryWei = BigInt(Math.floor(Number(primaryWei) * priceDecimal));
      secondaryAmount = secondaryWei;
    } else {
      // primaryAmount is token1, calculate token0
      const secondaryWei = BigInt(Math.floor(Number(primaryWei) / priceDecimal));
      secondaryAmount = secondaryWei;
    }

    return ethers.formatUnits(
      secondaryAmount,
      isPrimary0 ? token1.decimals : token0.decimals
    );
  } catch (error) {
    console.error("Error estimating secondary amount:", error);
    // Return same amount as fallback
    return primaryAmount;
  }
}

/**
 * Check if amounts are significantly imbalanced
 * Useful for showing warnings
 */
export function shouldShowImbalanceWarning(imbalanceRatio: number): boolean {
  return imbalanceRatio < 0.7; // Show warning if less than 70% of one token is used
}

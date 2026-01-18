import { ethers } from "ethers";
import { Token } from "@/lib/web3/tokens";
import {
  sqrtPriceX96ToPrice,
  tickToPrice,
  isInRange,
  getPositionSide,
  getAmountsFromLiquidity,
} from "./tickMath";

/**
 * Represents a user's Uniswap V3 liquidity position (NFT-based)
 */
export interface UserPosition {
  tokenId: string; // NFT token ID
  owner: string;
  token0: Token;
  token1: Token;
  fee: number; // fee tier in basis points (e.g., 3000 = 0.3%)
  liquidity: bigint; // LP liquidity amount
  tickLower: number;
  tickUpper: number;
  
  // Current state
  currentTick: number;
  inRange: boolean;
  side: "BELOW" | "IN_RANGE" | "ABOVE";
  
  // Prices
  currentPrice: number; // token1 per token0
  priceLower: number;
  priceUpper: number;
  
  // Estimated token amounts for current position
  estimatedAmount0: string; // formatted with decimals
  estimatedAmount1: string;
  
  // Fees
  uncollectedFees0: string; // formatted with decimals
  uncollectedFees1: string;
  
  // Metadata
  createdAt?: number;
}

/**
 * ABI for reading position data from NonfungiblePositionManager
 */
export const POSITION_MANAGER_ABI = [
  "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
];

/**
 * ABI for reading pool data
 */
export const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
];

/**
 * Fetch all position token IDs for a given owner
 */
export async function fetchPositionTokenIds(
  positionManagerAddress: string,
  owner: string,
  provider: ethers.Provider
): Promise<bigint[]> {
  const contract = new ethers.Contract(
    positionManagerAddress,
    POSITION_MANAGER_ABI,
    provider
  );

  const balance = await contract.balanceOf(owner);
  const tokenIds: bigint[] = [];

  for (let i = 0; i < Number(balance); i++) {
    const tokenId = await contract.tokenOfOwnerByIndex(owner, i);
    tokenIds.push(tokenId);
  }

  return tokenIds;
}

/**
 * Fetch position data from chain
 */
export async function fetchPositionData(
  positionManagerAddress: string,
  tokenId: bigint,
  provider: ethers.Provider
): Promise<{
  token0: string;
  token1: string;
  fee: number;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}> {
  const contract = new ethers.Contract(
    positionManagerAddress,
    POSITION_MANAGER_ABI,
    provider
  );

  const result = await contract.positions(tokenId);

  return {
    token0: result.token0,
    token1: result.token1,
    fee: result.fee,
    liquidity: result.liquidity,
    tickLower: result.tickLower,
    tickUpper: result.tickUpper,
    tokensOwed0: result.tokensOwed0,
    tokensOwed1: result.tokensOwed1,
  };
}

/**
 * Fetch current pool state
 */
export async function fetchPoolState(
  poolAddress: string,
  provider: ethers.Provider
): Promise<{
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
}> {
  const contract = new ethers.Contract(poolAddress, POOL_ABI, provider);

  const [slot0, liquidity] = await Promise.all([
    contract.slot0(),
    contract.liquidity(),
  ]);

  return {
    sqrtPriceX96: slot0.sqrtPriceX96,
    tick: slot0.tick,
    liquidity,
  };
}

/**
 * Build a complete UserPosition object from on-chain data
 * This combines position data, pool state, and token info
 */
export function buildUserPosition(
  tokenId: string,
  positionData: Awaited<ReturnType<typeof fetchPositionData>>,
  poolState: Awaited<ReturnType<typeof fetchPoolState>>,
  token0: Token,
  token1: Token,
  sqrtPriceX96Lower: bigint,
  sqrtPriceX96Upper: bigint
): UserPosition {
  const currentTick = poolState.tick;
  const inRange = isInRange(currentTick, positionData.tickLower, positionData.tickUpper);
  const side = getPositionSide(currentTick, positionData.tickLower, positionData.tickUpper);

  // Calculate prices
  const currentPrice = sqrtPriceX96ToPrice(
    poolState.sqrtPriceX96,
    token0.decimals,
    token1.decimals
  );
  const priceLower = tickToPrice(
    positionData.tickLower,
    token0.decimals,
    token1.decimals
  );
  const priceUpper = tickToPrice(
    positionData.tickUpper,
    token0.decimals,
    token1.decimals
  );

  // Calculate estimated token amounts
  const { amount0, amount1 } = getAmountsFromLiquidity(
    positionData.liquidity,
    poolState.sqrtPriceX96,
    sqrtPriceX96Lower,
    sqrtPriceX96Upper
  );

  return {
    tokenId,
    owner: "", // Will be set by caller
    token0,
    token1,
    fee: positionData.fee,
    liquidity: positionData.liquidity,
    tickLower: positionData.tickLower,
    tickUpper: positionData.tickUpper,
    currentTick,
    inRange,
    side,
    currentPrice,
    priceLower,
    priceUpper,
    estimatedAmount0: ethers.formatUnits(amount0, token0.decimals),
    estimatedAmount1: ethers.formatUnits(amount1, token1.decimals),
    uncollectedFees0: ethers.formatUnits(positionData.tokensOwed0, token0.decimals),
    uncollectedFees1: ethers.formatUnits(positionData.tokensOwed1, token1.decimals),
  };
}

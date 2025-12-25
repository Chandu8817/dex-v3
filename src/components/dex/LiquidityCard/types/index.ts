import { JsonRpcSigner } from "ethers";
import { Token } from "@/lib/web3/tokens";

export interface LiquidityState {
  token0: Token | null;
  token1: Token | null;
  amount0: string;
  amount1: string;
  feeTier: number;
  minPrice: string;
  maxPrice: string;
}

export interface LiquidityCardProps {
  signer: JsonRpcSigner | null;
}

export interface NotificationState {
  type: "success" | "error";
  message: string;
}

export interface PriceRangeSuggestion {
  label: string;
  min: number;
  max: number;
  range: number;
}

export interface PoolData {
  currentTick: number;
  sqrtRatio: number;
  tickSpacing: number;
  currentPrice: number;
}

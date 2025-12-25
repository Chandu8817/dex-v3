import type { JsonRpcSigner } from 'ethers';
import { ethers } from 'ethers';

export interface Token {
  id: string;
  symbol: string;
  decimals: number;
  poolCount?: number;
  volume?: string;
  volumeUSD?: string;
}

export interface Pool {
  id: string;
  feeTier: number;
  token0: Token;
  token1: Token;
  createdAtTimestamp: string;
  liquidity: string;
  totalValueLockedUSD: string;
}

export interface LiquidityTabProps {
  signer: JsonRpcSigner | null;
}

export interface PoolsTabProps {
  signer: ethers.Signer | null;
}

export type TabType = 'add' | 'remove';

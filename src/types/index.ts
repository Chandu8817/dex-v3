export interface Token {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  chainId?: number;
}

export interface Pool {
  token0: Token;
  token1: Token;
  fee: number;
  tvl: string;
  volume24h: string;
  feeTier: string;
  address?: string;
}
// Types
export type ExactInputSingleParams = {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  recipient: string;
  deadline: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96?: bigint;
};

export type ExactInputParams = {
  path: string;
  recipient: string;
  deadline: number;
  amountIn: bigint;
  amountOutMinimum: bigint;
};

export type ExactOutputSingleParams = {
  tokenIn: string;
  tokenOut: string;
  fee: number;
  recipient: string;
  deadline: number;
  amountOut: bigint;
  amountInMaximum: bigint;
  sqrtPriceLimitX96?: bigint;
};

export type ExactOutputParams = {
  path: string;
  recipient: string;
  deadline: number;
  amountOut: bigint;
  amountInMaximum: bigint;
};

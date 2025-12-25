import { ethers } from "ethers";

export const formatTokenAmount = (amount: string, decimals = 18): string => {
  try {
    return ethers.parseUnits(amount || "0", decimals).toString();
  } catch (e) {
    return "0";
  }
};

export const formatDisplayBalance = (balance: string, decimals: number): string => {
  try {
    return Number(ethers.formatUnits(balance, decimals)).toFixed(4);
  } catch (e) {
    return "0";
  }
};

export const snapTick = (tick: number, tickSpacing: number, isLower: boolean): number => {
  return isLower
    ? Math.floor(tick / tickSpacing) * tickSpacing
    : Math.ceil(tick / tickSpacing) * tickSpacing;
};

export const calculateSlippageAmount = (
  amount: bigint,
  slippageBasisPoints: bigint
): bigint => {
  return (amount * (10000n - slippageBasisPoints)) / 10000n;
};

import { Token } from "@/lib/web3/tokens";
import { ethers } from "ethers";

export const isTokenApproved = (
  amount: string,
  allowance: string,
  decimals: number
): boolean => {
  if (!amount) return false;
  try {
    const amountWei = ethers.parseUnits(amount, decimals);
    return BigInt(allowance) >= BigInt(amountWei);
  } catch (e) {
    return false;
  }
};

export const hasSufficientBalance = (
  amount0: string,
  amount1: string,
  balance0: string,
  balance1: string,
  token0: Token | null,
  token1: Token | null
): boolean => {
  if (!amount0 || !amount1 || !token0 || !token1) return false;
  try {
    const amount0Wei = ethers.parseUnits(amount0, token0.decimals);
    const amount1Wei = ethers.parseUnits(amount1, token1.decimals);
    return (
      BigInt(balance0) >= BigInt(amount0Wei) &&
      BigInt(balance1) >= BigInt(amount1Wei)
    );
  } catch (e) {
    return false;
  }
};

export const isValidRange = (
  minPrice: string,
  maxPrice: string,
  isFullRange: boolean
): boolean => {
  return (
    minPrice &&
    maxPrice &&
    (isFullRange || parseFloat(minPrice) < parseFloat(maxPrice))
  );
};

export const canAddLiquidity = (
  isConnected: boolean,
  token0: Token | null,
  token1: Token | null,
  amount0: string,
  amount1: string,
  isTokenAApproved: boolean,
  isTokenBApproved: boolean,
  hasSufficientBalance: boolean
): boolean => {
  return (
    isConnected &&
    token0 &&
    token1 &&
    amount0 &&
    parseFloat(amount0) > 0 &&
    amount1 &&
    parseFloat(amount1) > 0 &&
    isTokenAApproved &&
    isTokenBApproved &&
    hasSufficientBalance
  );
};

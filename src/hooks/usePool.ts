import { ethers, JsonRpcSigner } from 'ethers';
import POOL_ABI from '../abis/Pool.json';
import { useState } from 'react';
// import { encodeSqrtRatioX96 } from "../utils";

export function usePool(signer: JsonRpcSigner | null) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const initializePool = async (
    poolAddress: string,
    reserve0: bigint, // token0 (sorted)
    reserve1: bigint, // token1 (sorted)
  ) => {
    setLoading(true);
    setError(null);
    if (!signer) {
      setLoading(false);
      setError('Signer not provided');
      return;
    }
    if (!poolAddress) {
      setLoading(false);
      setError('Pool contract address not provided');
      return;
    }

    console.log('Creating Pool instance:', poolAddress);
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

    // Correct encoding: price = reserve1/reserve0 (token1 per token0)
    // ratio with decimals considered

    // const ratio = Number(reserve1) / Number(reserve0);

    // correct formula

    const sqrtPriceX96 = encodeSqrtRatioX96(reserve1, reserve0);
    console.log(sqrtPriceX96.toString());

    console.log(sqrtPriceX96.toString());

    try {
      const tx = await poolContract.initialize(sqrtPriceX96);
      await tx.wait();
      setLoading(false);
      return { txHash: tx.hash, success: true };
    } catch (err: any) {
      console.error('Error initializing pool:', err);
      setError(err.message || 'Failed to initialize pool');
      setLoading(false);
      return { txHash: null, success: false };
    }
  };

  const isPoolInitialized = async (poolAddress: string) => {
    if (!signer || !poolAddress) return false;
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
    const slot0 = await poolContract.slot0();
    return slot0.sqrtPriceX96 > 0n;
  };

  const getTickSpacing = async (poolAddress: string) => {
    if (!signer || !poolAddress) return null;
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
    const tickSpacing = await poolContract.tickSpacing();
    return tickSpacing;
  };

  const getSlot0 = async (poolAddress: string) => {
    if (!signer || !poolAddress) return null;
    try {
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
      const slot0 = await poolContract.slot0();
      return slot0;
    } catch (err) {
      console.error('Error getting slot0:', err);
      return null;
    }
  };

  // target price = token1 per token0
  function encodeSqrtRatioX96(amount1: bigint, amount0: bigint) {
    if (amount0 === 0n) throw new Error('amount0 cannot be 0');
    const ratio = Number(amount1) / Number(amount0);
    const sqrt = Math.sqrt(ratio);
    const Q96 = 2 ** 96;
    return BigInt(Math.floor(sqrt * Q96));
  }

  const getFee = async (poolAddress: string) => {
    if (!signer || !poolAddress) return null;
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
    const fee = await poolContract.fee();
    return fee;
  };
  const Q96 = 2n ** 96n;
const Q192 = Q96 * Q96;

const getCurrentPrice = async (
  poolAddress: string,
  token0Decimals: number,
  token1Decimals: number
) => {
  if (!signer || !poolAddress) return null;

  try {
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
    const slot0 = await poolContract.slot0();

    const sqrtPriceX96: bigint = slot0.sqrtPriceX96;

    if (sqrtPriceX96 === 0n) return null;

    // priceX192 = sqrtPriceX96^2
    const priceX192 = sqrtPriceX96 * sqrtPriceX96;

    // token1 per token0 (raw, without decimals)
    let price = Number(priceX192) / Number(Q192);

    // adjust decimals
    const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);
    price = price * decimalAdjustment;

    return {
      token1PerToken0: price,
      token0PerToken1: 1 / price,
    };
  } catch (err) {
    console.error('Error getting current price:', err);
    return null;
  }
};


  return {
    initializePool,
    isPoolInitialized,
    isLoading: loading,
    error,
    getSlot0,
    getTickSpacing,
    getFee,
    getCurrentPrice,
  };
}

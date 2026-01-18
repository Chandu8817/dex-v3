/**
 * Hook to create and initialize a pool if necessary
 */

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { UserPosition } from "@/lib/uniswapV3/positionData";
import {
  fetchPositionTokenIds,
  fetchPositionData,
  fetchPoolState,
  buildUserPosition,
  POSITION_MANAGER_ABI,
} from "@/lib/uniswapV3/positionData";
import { getPool } from "@/lib/web3/factory";
import { COMMON_TOKENS, Token } from "@/lib/web3/tokens";
import { tickToSqrtPriceX96 } from "@/lib/uniswapV3/tickMath";
import { uniswapContracts } from "@/lib/web3/config";

/**
 * Hook to fetch all positions for connected wallet
 */
export function useUserPositions(
  signer: ethers.Signer | null,
  chainId: number
) {
  const { address } = useAccount();
  const [positions, setPositions] = useState<UserPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!address || !signer) return;

    setIsLoading(true);
    setError(null);

    try {
      const positionManagerAddress = uniswapContracts[chainId]?.positionManager;
      if (!positionManagerAddress) throw new Error("Position manager not configured");

      const provider = signer.provider!;

      // Fetch all token IDs
      const tokenIds = await fetchPositionTokenIds(
        positionManagerAddress,
        address,
        provider
      );

      // Fetch data for each position
      const userPositions: UserPosition[] = [];

      for (const tokenId of tokenIds) {
        try {
          const positionData = await fetchPositionData(
            positionManagerAddress,
            tokenId,
            provider
          );

          // Get token details
          const token0 = COMMON_TOKENS[chainId]?.find(
            (t) => t.address.toLowerCase() === positionData.token0.toLowerCase()
          );
          const token1 = COMMON_TOKENS[chainId]?.find(
            (t) => t.address.toLowerCase() === positionData.token1.toLowerCase()
          );

          if (!token0 || !token1) continue;

          // Fetch pool state
          const poolAddress = await getPool(
            positionData.token0,
            positionData.token1,
            positionData.fee,
            provider,
            chainId
          );

          if (!poolAddress) continue;

          const poolState = await fetchPoolState(poolAddress, provider);

          // Calculate sqrt prices for ticks
          const sqrtPriceX96Lower = tickToSqrtPriceX96(positionData.tickLower);
          const sqrtPriceX96Upper = tickToSqrtPriceX96(positionData.tickUpper);

          // Build position object
          const position = buildUserPosition(
            tokenId.toString(),
            positionData,
            poolState,
            token0,
            token1,
            sqrtPriceX96Lower,
            sqrtPriceX96Upper
          );
          position.owner = address;

          userPositions.push(position);
        } catch (err) {
          console.error(`Error fetching position ${tokenId}:`, err);
        }
      }

      setPositions(userPositions);
    } catch (err) {
      console.error("Failed to fetch positions:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, chainId]);

  useEffect(() => {
    const interval = setInterval(fetchPositions, 30000); // Refresh every 30s
    fetchPositions();

    return () => clearInterval(interval);
  }, [fetchPositions]);

  const refetch = useCallback(async () => {
    await fetchPositions();
  }, [fetchPositions]);

  return { positions, isLoading, error, refetch };
}

/**
 * Hook to increase liquidity on existing position
 */
export function useIncreaseLiquidity(signer: ethers.Signer | null, chainId: number) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const increaseLiquidity = useCallback(
    async (
      tokenId: string,
      amount0: string,
      amount1: string,
      token0Address: string,
      token1Address: string
    ) => {
      if (!signer) throw new Error("Signer not available");

      setIsLoading(true);
      setError(null);

      try {
        const positionManagerAddress = uniswapContracts[chainId]?.positionManager;
        if (!positionManagerAddress) throw new Error("Position manager not configured");

        // Convert amounts to wei (assumes token decimals available)
        const amount0Wei = ethers.parseUnits(amount0, 18); // Adjust decimals as needed
        const amount1Wei = ethers.parseUnits(amount1, 6);  // Adjust decimals as needed

        const contract = new ethers.Contract(
          positionManagerAddress,
          POSITION_MANAGER_ABI,
          signer
        );

        // Call increaseLiquidity
        const tx = await contract.increaseLiquidity(
          {
            tokenId: tokenId,
            amount0Desired: amount0Wei,
            amount1Desired: amount1Wei,
            amount0Min: 0n,
            amount1Min: 0n,
            deadline: Math.floor(Date.now() / 1000) + 30 * 60,
          }
        );

        const receipt = await tx.wait();
        return receipt;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signer, chainId]
  );

  return { increaseLiquidity, isLoading, error };
}

/**
 * Hook to decrease liquidity (partial or full removal)
 */
export function useDecreaseLiquidity(signer: ethers.Signer | null, chainId: number) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decreaseLiquidity = useCallback(
    async (tokenId: string, liquidityPercent: number) => {
      if (!signer) throw new Error("Signer not available");
      if (liquidityPercent < 0 || liquidityPercent > 100) {
        throw new Error("Liquidity percent must be between 0 and 100");
      }

      setIsLoading(true);
      setError(null);

      try {
        const positionManagerAddress = uniswapContracts[chainId]?.positionManager;
        if (!positionManagerAddress) throw new Error("Position manager not configured");

        const provider = signer.provider!;
        const positionData = await fetchPositionData(positionManagerAddress, BigInt(tokenId), provider);

        // Calculate liquidity to remove
        const liquidityToRemove = (positionData.liquidity * BigInt(liquidityPercent)) / BigInt(100);

        const contract = new ethers.Contract(
          positionManagerAddress,
          [
            "function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)",
            "function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
          ],
          signer
        );

        // Decrease liquidity
        const tx1 = await contract.decreaseLiquidity({
          tokenId,
          liquidity: liquidityToRemove,
          amount0Min: 0n,
          amount1Min: 0n,
          deadline: Math.floor(Date.now() / 1000) + 30 * 60,
        });

        await tx1.wait();

        // Collect tokens and fees
        const address = await signer.getAddress();
        const MAX_UINT128 = (BigInt(1) << BigInt(128)) - BigInt(1);
        const tx2 = await contract.collect({
          tokenId,
          recipient: address,
          amount0Max: MAX_UINT128,
          amount1Max: MAX_UINT128,
        });

        const receipt = await tx2.wait();
        return receipt;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signer, chainId]
  );

  return { decreaseLiquidity, isLoading, error };
}

/**
 * Hook to collect uncollected fees
 */
export function useCollectFees(signer: ethers.Signer | null, chainId: number) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collectFees = useCallback(
    async (tokenId: string) => {
      if (!signer) throw new Error("Signer not available");

      setIsLoading(true);
      setError(null);

      try {
        const positionManagerAddress = uniswapContracts[chainId]?.positionManager;
        if (!positionManagerAddress) throw new Error("Position manager not configured");

        const contract = new ethers.Contract(
          positionManagerAddress,
          [
            "function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)",
          ],
          signer
        );

        const address = await signer.getAddress();
        const MAX_UINT128 = (BigInt(1) << BigInt(128)) - BigInt(1);

        const tx = await contract.collect({
          tokenId,
          recipient: address,
          amount0Max: MAX_UINT128,
          amount1Max: MAX_UINT128,
        });

        const receipt = await tx.wait();
        return receipt;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signer, chainId]
  );

  return { collectFees, isLoading, error };
}



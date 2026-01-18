import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { JsonRpcSigner } from 'ethers';
import POSITION_MANAGER_ABI from '../abis/PositionManager.json';
import { uniswapContracts } from '@/lib/web3/config';
import { useChainId } from 'wagmi';
import { Token } from '@/lib/web3/tokens';


// Types
type MintParams = {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  recipient: string;
  deadline: number;
};

export type IncreaseLiquidityParams = {
  tokenId: bigint;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: number;
};

export type DecreaseLiquidityParams = {
  tokenId: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: number;
};

export type CollectParams = {
  tokenId: bigint;
  recipient: string;
  amount0Max: bigint;
  amount1Max: bigint;
};

// Contract address from environment variables or default

export const usePositionManager = (signer: JsonRpcSigner | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const chainId  = useChainId();
  const POSITION_MANAGER_ADDRESS = uniswapContracts[chainId]?.positionManager;

  // Initialize contract
  useEffect(() => {
    if (!signer) {
      setContract(null);
      return;
    }

    try {
      const contractInstance = new ethers.Contract(
        POSITION_MANAGER_ADDRESS,
        POSITION_MANAGER_ABI,
        signer,
      );
      setContract(contractInstance);
      setError(null);
    } catch (err) {
      console.error('Error initializing Position Manager:', err);
      setError('Failed to initialize Position Manager');
    }
  }, [signer]);

  // Helper function to execute contract methods with error handling
  const executeContractMethod = useCallback(
    async <T>(method: () => Promise<T>): Promise<T> => {
      if (!contract) throw new Error('Contract not initialized');
      try {
        setLoading(true);
        setError(null);
        return await method();
      } catch (err: any) {
        const errorMsg = err.reason || err.message || 'Transaction failed';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [contract],
  );

  // Position Management
  const mint = useCallback(
    async (params: MintParams, value?: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        
        const tx = await contract.mint(
          [
            params.token0,
            params.token1,
            params.fee,
            params.tickLower,
            params.tickUpper,
            params.amount0Desired,
            params.amount1Desired,
            params.amount0Min,
            params.amount1Min,
            params.recipient,
            params.deadline,
          ],
          { value: value },
        );
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  const increaseLiquidity = useCallback(
    async (params: IncreaseLiquidityParams, value?: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.increaseLiquidity(
          {
            tokenId: params.tokenId,
            amount0Desired: params.amount0Desired,
            amount1Desired: params.amount1Desired,
            amount0Min: params.amount0Min,
            amount1Min: params.amount1Min,
            deadline: params.deadline,
          },
          { value: value },
        );
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  const decreaseLiquidity = useCallback(
    async (params: DecreaseLiquidityParams, value?: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.decreaseLiquidity(
          {
            tokenId: params.tokenId,
            liquidity: params.liquidity,
            amount0Min: params.amount0Min,
            amount1Min: params.amount1Min,
            deadline: params.deadline,
          },
          { value: value },
        );
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  const collect = useCallback(
    async (params: CollectParams, value?: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.collect(
          {
            tokenId: params.tokenId,
            recipient: params.recipient,
            amount0Max: params.amount0Max,
            amount1Max: params.amount1Max,
          },
          { value: value },
        );
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  // Token Management
  const burn = useCallback(
    async (tokenId: bigint, value?: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.burn(tokenId, { value: value });
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  // Position Views
  const positions = useCallback(
    async (tokenId: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        return await contract.positions(tokenId);
      });
    },
    [executeContractMethod, contract],
  );

  // ERC721 Methods
  const approve = useCallback(
    async (to: string, tokenId: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.approve(to, tokenId);
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  const setApprovalForAll = useCallback(
    async (operator: string, approved: boolean) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.setApprovalForAll(operator, approved);
        await tx.wait();
        return tx;
      });
    },
    [executeContractMethod, contract],
  );

  const getApproved = useCallback(
    async (tokenId: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        return await contract.getApproved(tokenId);
      });
    },
    [executeContractMethod, contract],
  );

  const isApprovedForAll = useCallback(
    async (owner: string, operator: string) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        return await contract.isApprovedForAll(owner, operator);
      });
    },
    [executeContractMethod, contract],
  );

  // Token Metadata
  const tokenURI = useCallback(
    async (tokenId: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        return await contract.tokenURI(tokenId);
      });
    },
    [executeContractMethod, contract],
  );

  // Contract Info
  const factory = useCallback(async () => {
    return executeContractMethod(async () => {
      if (!contract) throw new Error('Contract not initialized');
      return await contract.factory();
    });
  }, [executeContractMethod, contract]);

  const WETH9 = useCallback(async () => {
    return executeContractMethod(async () => {
      if (!contract) throw new Error('Contract not initialized');
      return await contract.WETH9();
    });
  }, [executeContractMethod, contract]);

  const multicall = useCallback(
    async (data: string[], value?: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
     try{   const tx = await contract.multicall(data, { value: value });
        await tx.wait();
        return tx;}
        catch(e){
          console.log(e)
          return undefined
        }
      });
    },
   
    [executeContractMethod, contract],
  );

  // Get all positions of a user
  const getUserPositions = async (user: string) => {
    if (!contract) throw new Error('Contract not initialized');
    const balance = await contract.balanceOf(user);
    const positions: any[] = [];

    for (let i = 0; i < balance; i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(user, i);
      const pos = await contract.positions(tokenId);
      positions.push({
        tokenId: tokenId.toString(),
        token0: pos.token0,
        token1: pos.token1,
        fee: pos.fee,
        tickLower: pos.tickLower,
        tickUpper: pos.tickUpper,
        liquidity: pos.liquidity.toString(),
        tokensOwed0: pos.tokensOwed0.toString(),
        tokensOwed1: pos.tokensOwed1.toString(),
        user: user,
      });
    }

    return positions;
  };

  const getAmountsDecreaseLiquidity = async (position: any) => {
    if (!contract) throw new Error('Contract not initialized');
    const amounts = await contract.decreaseLiquidity.staticCall({
      tokenId: position.tokenId,                // your LP tokenId
      liquidity: position.liquidity,    // how much liquidity you want to remove
      amount0Min: 0n,
      amount1Min: 0n,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10
    })
    
    return { amount0: amounts.amount0, amount1: amounts.amount1 }
  }
    function encodeSqrtRatioX96(amount1: bigint, amount0: bigint) {
    if (amount0 === 0n) throw new Error('amount0 cannot be 0');
    const ratio = Number(amount1) / Number(amount0);
    const sqrt = Math.sqrt(ratio);
    const Q96 = 2 ** 96;
    return BigInt(Math.floor(sqrt * Q96));
  }

   const createAndInitializePoolIfNecessary = useCallback(
      async (
        signer: ethers.Signer,
        tokenA: Token,
        tokenB: Token,
        feeTier: number,
        reserve0: bigint,
        reserve1: bigint,
        chainId: number
      ): Promise<{txHash: string}> => {
       
        setError(null);
        try {
          const positionManagerAddress = uniswapContracts[chainId]?.positionManager;
          if (!positionManagerAddress) {
            throw new Error("Position manager not configured");
          }
          const contract = new ethers.Contract(
            positionManagerAddress,
            POSITION_MANAGER_ABI,
            signer
          );
            const sqrtPriceX96 = encodeSqrtRatioX96(reserve1, reserve0);
    console.log(sqrtPriceX96.toString());

          const tx = await contract.createAndInitializePoolIfNecessary(
            tokenA.address,
            tokenB.address,
            feeTier,
            sqrtPriceX96
          );
          await tx.wait();
          return {txHash: tx.hash};
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unknown error");
          throw err;
        } finally {
          setLoading(false);
        }
      },
      []
    );
  return {
    // Core Position Management
    mint,
    increaseLiquidity,
    decreaseLiquidity,
    collect,
    burn,
    positions,
    getUserPositions,
    getAmountsDecreaseLiquidity,
    createAndInitializePoolIfNecessary,
    // ERC721 Methods
    approve,
    setApprovalForAll,
    getApproved,
    isApprovedForAll,

    // Token Metadata
    tokenURI,

    // Contract Info
    factory,
    WETH9,
    multicall,

    // State
    contract,
    loading,
    error,
    isInitialized: !!contract,
  };
};

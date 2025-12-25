import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { JsonRpcSigner } from 'ethers';
import SWAP_ROUTER_ABI from '../abis/SwapRouter.json';

import type {
  ExactInputSingleParams,
  ExactInputParams,
  ExactOutputSingleParams,
  ExactOutputParams,
} from '../types';
import { uniswapContracts } from '@/lib/web3/config';
import { useChainId } from 'wagmi';

// Contract address from environment variables


export const useSwapRouter = (signer: JsonRpcSigner | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chainId  = useChainId();
  const SWAP_ROUTER_ADDRESS = uniswapContracts[chainId]?.swapRouter;

  // Initialize contract
  useEffect(() => {
    if (!signer) {
      setContract(null);
      return;
    }

    try {
      if (!SWAP_ROUTER_ADDRESS) {
        throw new Error('Swap Router address not configured');
      }

      const contractInstance = new ethers.Contract(SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI, signer);

      setContract(contractInstance);
      setError(null);
    } catch (err) {
      console.error('Error initializing Swap Router:', err);
      setError('Failed to initialize Swap Router');
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

  // Exact Input Single
  const exactInputSingle = useCallback(
    async (params: ExactInputSingleParams, value: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.exactInputSingle(
          {
            ...params,
            sqrtPriceLimitX96: params.sqrtPriceLimitX96 || 0n,
          },
          { value: value },
        );
        return await tx.wait();
      });
    },
    [executeContractMethod, contract],
  );

  // Exact Input
  const exactInput = useCallback(
    async (params: ExactInputParams, value: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.exactInput(params, { value: value });
        return await tx.wait();
      });
    },
    [executeContractMethod, contract],
  );

  // Exact Output Single
  const exactOutputSingle = useCallback(
    async (params: ExactOutputSingleParams, value: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');

        const tx = await contract.exactOutputSingle(
          {
            ...params,
            sqrtPriceLimitX96: params.sqrtPriceLimitX96 || 0n,
          },
          { value: value },
        );
        return await tx.wait();
      });
    },
    [executeContractMethod, contract],
  );

  // Exact Output
  const exactOutput = useCallback(
    async (params: ExactOutputParams, value: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.exactOutput(params, { value: value });
        return await tx.wait();
      });
    },
    [executeContractMethod, contract],
  );

  // Multicall
  const multicall = useCallback(
    async (data: string[], value: bigint) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        return await contract.multicall(data, { value: value });
      });
    },
    [executeContractMethod, contract],
  );

  // Refund ETH
  const refundETH = useCallback(async () => {
    return executeContractMethod(async () => {
      if (!contract) throw new Error('Contract not initialized');
      const tx = await contract.refundETH();
      return await tx.wait();
    });
  }, [executeContractMethod, contract]);

  // Unwrap WETH9
  const unwrapWETH9 = useCallback(
    async (amountMinimum: bigint, recipient: string) => {
      return executeContractMethod(async () => {
        if (!contract) throw new Error('Contract not initialized');
        const tx = await contract.unwrapWETH9(amountMinimum, recipient);
        return await tx.wait();
      });
    },
    [executeContractMethod, contract],
  );

  return {
    // Core swap methods
    exactInputSingle,
    exactInput,
    exactOutputSingle,
    exactOutput,

    // Multicall
    multicall,

    // ETH handling
    refundETH,
    unwrapWETH9,
    contract,

    // State
    loading,
    error,
    isInitialized: !!contract,
  };
};

import { useState } from 'react';
import { ethers } from 'ethers';
import { JsonRpcSigner } from 'ethers';
import ERC20_ABI from '../abis/ERC20.json';

export const useERC20 = (signer: JsonRpcSigner | null) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getBalance = async (address: string, contractAddress: string, symbol: string) => {
    if (signer) {
      if (symbol === 'ETH') {
        try {
          setLoading(true);
          setError(null);

          const balance = await signer.provider.getBalance(address);
          return balance;
        } catch (err: any) {
          console.error('Error getting balance:', err);
          setError(err.message || 'Failed to get balance');
          throw err;
        } finally {
          setLoading(false);
        }
      }

      const contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      try {
        setLoading(true);
        setError(null);

        const balance = await contractInstance.balanceOf(address);
        return balance;
      } catch (err: any) {
        console.error('Error getting balance:', err);
        setError(err.message || 'Failed to get balance');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const approve = async (spender: string, amount: bigint, contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      try {
        setLoading(true);
        setError(null);

        const tx = await contractInstance.approve(spender, amount);
        await tx.wait();
        return tx.hash;
      } catch (err: any) {
        console.error('Error approving:', err);
        setError(err.message || 'Failed to approve');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const checkOrApproveAll = async (
    tokenA: string,
    tokenB: string,
    amount0: bigint,
    amount1: bigint,
    spender: string,
    symbolA: string,
    symbolB: string,
  ) => {
    const allowanceA = await getAllowance(signer?.address as string, spender, tokenA, symbolA);
    let tx;
    if (allowanceA < amount0) {
      tx = await approve(spender, amount0, tokenA);
    }
    const allowanceB = await getAllowance(signer?.address as string, spender, tokenB, symbolB);
    if (allowanceB < amount1) {
      tx = await approve(spender, amount1, tokenB);
    }

    return tx ? tx :true
  };

  const getAllowance = async (
    owner: string,
    spender: string,
    contractAddress: string,
    symbol: string,
  ) => {
    if (signer) {
      if (symbol === 'ETH') {
        return ethers.MaxUint256;
      }
      const contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      try {
        setLoading(true);
        setError(null);

        const allowance = await contractInstance.allowance(owner, spender);
        return allowance;
      } catch (err: any) {
        console.error('Error getting allowance:', err);
        setError(err.message || 'Failed to get allowance');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const getDecimal = async (contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      try {
        setLoading(true);
        setError(null);

        const decimal = await contractInstance.decimals();
        return decimal;
      } catch (err: any) {
        console.error('Error getting decimal:', err);
        setError(err.message || 'Failed to get decimal');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  const getSymbol = async (contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      try {
        setLoading(true);
        setError(null);

        const symbol = await contractInstance.symbol();
        return symbol;
      } catch (err: any) {
        console.error('Error getting symbol:', err);
        setError(err.message || 'Failed to get symbol');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };
  const getName = async (contractAddress: string) => {
    if (signer) {
      const contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

      try {
        setLoading(true);
        setError(null);

        const name = await contractInstance.name();
        return name;
      } catch (err: any) {
        console.error('Error getting name:', err);
        setError(err.message || 'Failed to get name');
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    getBalance,
    approve,
    getAllowance,
    getDecimal,
    getSymbol,
    getName,
    checkOrApproveAll,
    loading,
    error,
    isInitialized: !!signer,
  };
};

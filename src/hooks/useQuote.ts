import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { JsonRpcSigner } from 'ethers';
import QUOTE_ABI from '../abis/Quote.json';
import { uniswapContracts } from '@/lib/web3/config';
import { useChainId } from 'wagmi';


// Contract address from environment variables


export const useQuote = (signer: JsonRpcSigner | null) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chainId  = useChainId();
  const QUOTE_ADDRESS = uniswapContracts[chainId]?.quoter;

  useEffect(() => {
    if (signer) {
      try {
        if (!QUOTE_ADDRESS) {
          throw new Error('Quote contract address not configured');
        }

        const contractInstance = new ethers.Contract(QUOTE_ADDRESS, QUOTE_ABI, signer);

        setContract(contractInstance);
        setError(null);
      } catch (err) {
        console.error('Error creating Quote contract instance:', err);
        setError('Failed to initialize Quote contract');
      }
    } else {
      setContract(null);
    }
  }, [signer]);

  const quoteExactInputSingle = async (
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    sqrtPriceLimitX96: string = '0',
    decimalsIn: number = 18,
    decimalsOut: number = 18,
  ) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      setError(null);
      const amountInWei = ethers.parseUnits(amountIn, Number(decimalsIn));
      let sqrtPriceLimit = BigInt(sqrtPriceLimitX96);
      if (sqrtPriceLimit < 0n || sqrtPriceLimit > 2n ** 160n - 1n) {
        throw new Error('sqrtPriceLimitX96 out of range');
      }

      const quote = await contract.quoteExactInputSingle.staticCall({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: amountInWei,
        fee: fee,
        sqrtPriceLimitX96: sqrtPriceLimit,
      });

      return {
        amountOut: ethers.formatUnits(quote.amountOut.toString(), Number(decimalsOut)),
        amountOutWei: quote.amountOut.toString(),
      };
    } catch (err: any) {
      let errorMessage = 'Failed to get quote';
      if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const quoteExactOutputSingle = async (
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountOut: string,
    sqrtPriceLimitX96: string = '0',
    decimalsIn: number = 18,
    decimalsOut: number = 18,
  ) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setLoading(true);
      setError(null);

      const amountOutWei = ethers.parseUnits(amountOut, Number(decimalsOut));
      let sqrtPriceLimit = BigInt(sqrtPriceLimitX96);
      if (sqrtPriceLimit < 0n || sqrtPriceLimit > 2n ** 160n - 1n) {
        throw new Error('sqrtPriceLimitX96 out of range');
      }
      
      const amountIn = await contract.quoteExactOutputSingle.staticCall([
        tokenIn,
        tokenOut,
        amountOutWei,
        fee,
        sqrtPriceLimit,
      ]);

      return {
        amountIn: ethers.formatUnits(amountIn.amountIn.toString(), Number(decimalsIn)),
        amountInWei: amountIn.amountIn.toString(),
      };
    } catch (err: any) {
      setError(err.message || 'Failed to get quote');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const quoteExactInput = async (path: string, amountIn: bigint) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    try {
      setLoading(true);
      setError(null);
      const tx = await contract.quoteExactInput.staticCall(path, amountIn);

      return {
        amountOutWei: tx.amountOut.toString(),
      };
    } catch (error: any) {
      setError(error.message || 'Failed to get quote');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const quoteExactOutput = async (path: string, amountOut: bigint) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }
    try {
      setLoading(true);
      setError(null);
      const tx = await contract.quoteExactOutput.staticCall(path, amountOut);

      return {
        amountInWei: tx.amountIn.toString(),
      };
    } catch (error: any) {
      setError(error.message || 'Failed to get quote');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getQuote = async (
    tokenIn: string,
    tokenOut: string,
    fee: number,
    amountIn: string,
    decimalsIn: number = 18,
    decimalsOut: number = 18,
  ) => {
    // For backward compatibility, default to quoteExactInputSingle
    return quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, '0', decimalsIn, decimalsOut);
  };

  return {
    // Main functions
    quoteExactInputSingle,
    quoteExactOutputSingle,
    quoteExactInput,
    quoteExactOutput,
    getQuote, // For backward compatibility

    // State
    loading,
    error,
    isInitialized: !!contract,
  };
};

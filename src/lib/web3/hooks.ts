import { useAccount, useBalance, useChainId } from 'wagmi';
import { useMemo } from 'react';
import { chainMetadata, uniswapContracts } from './config';
import { COMMON_TOKENS, getNativeToken, Token } from './tokens';

// Get current chain metadata
export function useChainMetadata() {
  const chainId = useChainId();
  return useMemo(() => chainMetadata[chainId as keyof typeof chainMetadata], [chainId]);
}

// Get Uniswap contracts for current chain
export function useUniswapContracts() {
  const chainId = useChainId();
  return useMemo(() => uniswapContracts[chainId as keyof typeof uniswapContracts], [chainId]);
}

// Get common tokens for current chain
export function useCommonTokens(): Token[] {
  const chainId = useChainId();
  return useMemo(() => {
    const nativeToken = getNativeToken(chainId);
    const tokens = COMMON_TOKENS[chainId] || [];
    return [nativeToken, ...tokens];
  }, [chainId]);
}

// Get native balance
export function useNativeBalance() {
  const { address } = useAccount();
  return useBalance({
    address,
  });
}

// Format address for display
export function useFormattedAddress() {
  const { address } = useAccount();
  return useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);
}

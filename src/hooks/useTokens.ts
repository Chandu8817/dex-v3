import { useCallback, useEffect, useState } from 'react';
import type { Token } from '../types';
import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';

import { COMMON_TOKENS } from '@/lib/web3/tokens';
import { useChainId } from 'wagmi';

// Common tokens that will be available in the app
interface TokenData {
  tokens: Token[];
}

export function useTokens() {
  const [error] = useState<Error | null>(null);
   const chainId = useChainId();
  const [tokens, setTokens] = useState<Token[]>([]);
  const { data: tokenData, loading: isLoading } = useQuery<Partial<TokenData>>(gql`
    query {
      tokens {
        id
        symbol
        decimals
        name
      }
    }
  `);
     const common_tokens = COMMON_TOKENS[chainId] || [];

  // Always build tokensWithLogo from latest tokenData
  useEffect(() => {
    if (tokenData) {
      const tokens = (tokenData?.tokens || []).map((token: Token) => {
        const logo = common_tokens.find(
          (logo) => logo.symbol.toLowerCase() === token.symbol.toLowerCase(),
        );
        return {
          ...token,
          logoURI:
            logo?.logoURI ||
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
        };
      });
      const eth = {
        id: '0x8e91D1043A2bcC8b68cd25e73847Cb392e3a604D',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
      };
      tokens.push(eth);
      setTokens(tokens);
    }
  }, [tokenData]);

  // Find token by address
  const getTokenByAddress = useCallback(
    (address: string): Token | undefined => {
      return tokens?.find((token) => token?.id.toLowerCase() === address.toLowerCase());
    },
    [tokens],
  );

  // Find token by symbol
  const getTokenBySymbol = useCallback(
    (symbol: string): Token | undefined => {
      const token = tokens?.find((token) => token.symbol.toLowerCase() === symbol.toLowerCase());
      return token;
    },
    [tokens],
  );

  return {
    tokens,
    isLoading,
    error,
    getTokenByAddress,
    getTokenBySymbol,
  };
}

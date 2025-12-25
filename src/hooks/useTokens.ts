import { useCallback, useEffect, useState } from 'react';

import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';

import { COMMON_TOKENS, Token } from '@/lib/web3/tokens';
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
          address: token?.id || token.address, // Map GraphQL 'id' to 'address'
          logoURI:
            logo?.logoURI ||
            'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
        };
      });
      

      setTokens(tokens);
    }
  }, [tokenData, common_tokens]);

  // Find token by address
  const getTokenByAddress = useCallback(
    (address: string): Token | undefined => {
      if (!address) return undefined;
      return tokens?.find((token) => token.address !== undefined && token.address.toLowerCase() === address.toLowerCase());
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

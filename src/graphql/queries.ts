import { gql } from '@apollo/client';

export const POOLS_QUERY = gql`
  query {
    pools {
      id
      feeTier
      token0 {
        id
        symbol
        decimals
        poolCount
      }
      token1 {
        id
        symbol
        decimals
        volume
        volumeUSD
      }
      createdAtTimestamp
      liquidity
      totalValueLockedUSD
    }
  }
`;

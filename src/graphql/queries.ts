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

export const USER_POSITIONS_QUERY = gql`
  query GetUserPositions($owner: String!) {
    positions(where: { owner: $owner }) {
      id
      tokenId
      owner
      pool {
        id
        feeTier
        token0 {
          id
          symbol
          decimals
          name
        }
        token1 {
          id
          symbol
          decimals
          name
        }
      }
      tickLower
      tickUpper
      liquidity
      depositedToken0
      depositedToken1
      collectedFeesToken0
      collectedFeesToken1
      withdrawnToken0
      withdrawnToken1
      createdAtTimestamp
    }
  }
`;

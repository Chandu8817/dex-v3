import { mainnet, arbitrum, optimism, polygon, sepolia } from 'wagmi/chains';

export interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
}

// Common tokens per chain
export const COMMON_TOKENS: Record<number, Token[]> = {
  [mainnet.id]: [
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      chainId: mainnet.id,
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      chainId: mainnet.id,
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      chainId: mainnet.id,
    },
    {
      address: '0x6B175474E89094C44Da98b954EesdfD9cAaaD3F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedsfsC9cAaaD3F/logo.png',
      chainId: mainnet.id,
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      chainId: mainnet.id,
    },
    {
      address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      symbol: 'UNI',
      name: 'Uniswap',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
      chainId: mainnet.id,
    },
  ],
  [arbitrum.id]: [
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      chainId: arbitrum.id,
    },
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      chainId: arbitrum.id,
    },
    {
      address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
      symbol: 'ARB',
      name: 'Arbitrum',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
      chainId: arbitrum.id,
    },
  ],
  [optimism.id]: [
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      chainId: optimism.id,
    },
    {
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      chainId: optimism.id,
    },
    {
      address: '0x4200000000000000000000000000000000000042',
      symbol: 'OP',
      name: 'Optimism',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
      chainId: optimism.id,
    },
  ],
  [polygon.id]: [
    {
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      chainId: polygon.id,
    },
    {
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      chainId: polygon.id,
    },
    {
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      symbol: 'WMATIC',
      name: 'Wrapped Matic',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
      chainId: polygon.id,
    },
  ],
  [sepolia.id]: [
    {
      address: '0x8e91d1043a2bcc8b68cd25e73847cb392e3a604d',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      chainId: sepolia.id,
    },
    {
      address: '0x0438b27c71af60ba908c49bb9741b0e7f248ee51',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
      chainId: sepolia.id,
    },
    {
      address: '0x83af5b9c55e32a2533b0856fa49b4b05ce5a7ed7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
      chainId: sepolia.id,
    },
    {
      address: '0x303bd233c80a9a424d8ed0559e734b7d5c907c30',
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      decimals: 8,
      logoURI: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
      chainId: sepolia.id,
    }
  ],
};

// Native token placeholder address
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// Get native token for chain
export function getNativeToken(chainId: number): Token {
  switch (chainId) {
    case polygon.id:
      return {
        address: NATIVE_TOKEN_ADDRESS,
        symbol: 'MATIC',
        name: 'Matic',
        decimals: 18,
        chainId,
      };
    default:
      return {
        address: NATIVE_TOKEN_ADDRESS,
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        chainId,
      };
  }
}

// Format token amount with decimals
export function formatTokenAmount(amount: bigint, decimals: number, precision = 6): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return integerPart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, precision).replace(/0+$/, '');

  if (trimmedFractional === '') {
    return integerPart.toString();
  }

  return `${integerPart}.${trimmedFractional}`;
}

// Parse token amount to bigint
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [integerPart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(integerPart + paddedFractional);
}

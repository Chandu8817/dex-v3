import { http, createConfig } from 'wagmi';
import { mainnet, arbitrum, optimism, polygon, sepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// Supported chains for the DEX
export const supportedChains = [mainnet, arbitrum, optimism, polygon,sepolia] as const;

// Chain metadata for UI
export const chainMetadata = {
  [mainnet.id]: {
    name: 'Ethereum',
    shortName: 'ETH',
    color: '#627EEA',
    icon: '⟠',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: 'ETH',
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    shortName: 'ARB',
    color: '#28A0F0',
    icon: '🔵',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: 'ETH',
  },
  [optimism.id]: {
    name: 'Optimism',
    shortName: 'OP',
    color: '#FF0420',
    icon: '🔴',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: 'ETH',
  },
  [polygon.id]: {
    name: 'Polygon',
    shortName: 'MATIC',
    color: '#8247E5',
    icon: '🟣',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
  },
  [sepolia.id]: {
    name: 'Sepolia',
    shortName: 'SEP',
    color: '#2F6BED',
    icon: '🟠',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: 'ETH',
  }
} as const;

// Uniswap V3 contract addresses per chain
export const uniswapContracts = {
  [mainnet.id]: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as const,
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const,
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as const,
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const,
    positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as const,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
  },
  [arbitrum.id]: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as const,
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const,
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as const,
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const,
    positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as const,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
  },
  [optimism.id]: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as const,
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const,
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as const,
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const,
    positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as const,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
  },
  [polygon.id]: {
    factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984' as const,
    swapRouter: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const,
    quoter: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6' as const,
    quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const,
    positionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as const,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
  },
  [sepolia.id]: {
    factory: '0x22646E27aB580686fbaC0613d7fC4576E0F0C040' as const,
    swapRouter: '0xec95F62fc99f14E75E0C8caA12387E7270486fd7' as const,
    quoter: '0x6318139bDb31F6687C542918bC80A6f97D0017fd' as const,
    positionManager: '0x5b048c2Eb80693810117652428d35883881E55A9' as const,
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
  },
} as const;

// Fee tiers available on Uniswap V3
export const FEE_TIERS = {
  LOWEST: 100,    // 0.01%
  LOW: 500,       // 0.05%
  MEDIUM: 3000,   // 0.3%
  HIGH: 10000,    // 1%
} as const;

export const FEE_TIER_LABELS = {
  [FEE_TIERS.LOWEST]: '0.01%',
  [FEE_TIERS.LOW]: '0.05%',
  [FEE_TIERS.MEDIUM]: '0.3%',
  [FEE_TIERS.HIGH]: '1%',
} as const;

export const FEE_TIER_DESCRIPTIONS = {
  [FEE_TIERS.LOWEST]: 'Best for very stable pairs',
  [FEE_TIERS.LOW]: 'Best for stable pairs',
  [FEE_TIERS.MEDIUM]: 'Best for most pairs',
  [FEE_TIERS.HIGH]: 'Best for exotic pairs',
} as const;

// RainbowKit + Wagmi config
export const wagmiConfig = getDefaultConfig({
  appName: 'V3 DEX',
  projectId: '53232c749b61a2e34426d68ef6bf220d', // Replace with actual WalletConnect project ID
  chains: supportedChains,
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
  },
});

// Subgraph endpoints for each chain
export const subgraphEndpoints = {
  [mainnet.id]: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
  [arbitrum.id]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
  [optimism.id]: 'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
  [polygon.id]: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
  [sepolia.id]: 'https://api.studio.thegraph.com/query/118492/dex-v-3/version/latest',
} as const;


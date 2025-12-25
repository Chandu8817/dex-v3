import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/web3/config';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

// Custom dark theme matching our design system
const customTheme = darkTheme({
  accentColor: 'hsl(190, 100%, 50%)',
  accentColorForeground: 'hsl(222, 47%, 5%)',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            ...customTheme,
            colors: {
              ...customTheme.colors,
              modalBackground: 'hsl(222, 47%, 8%)',
              modalBorder: 'hsl(222, 40%, 18%)',
              profileForeground: 'hsl(222, 47%, 10%)',
              closeButtonBackground: 'hsl(222, 40%, 15%)',
              generalBorder: 'hsl(222, 40%, 18%)',
              menuItemBackground: 'hsl(222, 47%, 12%)',
            },
          }}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

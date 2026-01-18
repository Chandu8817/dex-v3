import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Droplets, LayoutGrid, BarChart3, History, Menu, X } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChainSelector } from '@/components/dex/ChainSelector';
import { SwapCard } from '@/components/dex/SwapCard';
import { LiquidityCard } from '@/components/dex/LiquidityCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ethers } from 'ethers';
import { useWalletClient } from 'wagmi';
import { Pools } from './PoolsList';

type Tab = 'swap' | 'liquidity' | 'positions' | 'pools' | 'history';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'swap', label: 'Swap', icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: 'liquidity', label: 'Liquidity', icon: <Droplets className="h-4 w-4" /> },
 
  { id: 'pools', label: 'Pools', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'history', label: 'History', icon: <History className="h-4 w-4" /> },
];

export function DexLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const { data: walletClient, isSuccess } = useWalletClient();

  useEffect(() => {
    async function setupSigner() {
      if (isSuccess && walletClient) {
        // Convert wagmi’s walletClient → ethers signer
        const provider = new ethers.BrowserProvider(walletClient.transport as any);
        const s = await provider.getSigner();
        setSigner(s);
      }
    }
    setupSigner();
  }, [walletClient, isSuccess]);
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-xl font-bold hidden sm:block">UniDEX</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <ChainSelector />  
            <ConnectButton 
              showBalance={false}
              chainStatus="none"
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
            />
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 bg-background"
            >
              <div className="container mx-auto px-4 py-2 flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      activeTab === tab.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'swap' && <SwapCard signer={signer} />}
            {activeTab === 'liquidity' && <LiquidityCard signer={signer} />}
            {activeTab === 'pools' &&<Pools signer={signer} />
}

            
            {activeTab === 'history' && (
              <div className="text-center py-20 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-semibold mb-2">Transaction History</h2>
                <p>Your swap and liquidity history will appear here</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

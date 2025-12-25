import { useChainId, useSwitchChain } from 'wagmi';
import { ChevronDown, Check } from 'lucide-react';
import { supportedChains, chainMetadata } from '@/lib/web3/config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ChainSelector() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  
  const currentChain = chainMetadata[chainId as keyof typeof chainMetadata];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" className="gap-2" disabled={isPending}>
          {isPending ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-lg">{currentChain?.icon || '⟠'}</span>
          )}
          <span className="hidden sm:inline">{currentChain?.shortName || 'Network'}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-card border-border" align="end">
        {supportedChains.map((chain) => {
          const meta = chainMetadata[chain.id as keyof typeof chainMetadata];
          const isActive = chain.id === chainId;
          
          return (
            <DropdownMenuItem
              key={chain.id}
              onClick={() => switchChain({ chainId: chain.id })}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <span className="text-lg">{meta?.icon}</span>
              <span className="flex-1">{meta?.name}</span>
              {isActive && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

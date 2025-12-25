import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Token, COMMON_TOKENS, getNativeToken } from '@/lib/web3/tokens';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  chainId: number;
  selectedToken?: Token;
  disabledToken?: Token;
}

export function TokenSelector({
  open,
  onClose,
  onSelect,
  chainId,
  selectedToken,
  disabledToken,
}: TokenSelectorProps) {
  const [search, setSearch] = useState('');

  const tokens = useMemo(() => {
    const nativeToken = getNativeToken(chainId);
    const chainTokens = COMMON_TOKENS[chainId] || [];
    return [nativeToken, ...chainTokens];
  }, [chainId]);

  const filteredTokens = useMemo(() => {
    if (!search) return tokens;
    const searchLower = search.toLowerCase();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(searchLower) ||
        token.name.toLowerCase().includes(searchLower) ||
        token.address.toLowerCase().includes(searchLower)
    );
  }, [tokens, search]);

  const handleSelect = (token: Token) => {
    onSelect(token);
    onClose();
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Select a token</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or paste address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted border-border focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-2 py-2">
          {tokens.slice(0, 6).map((token) => (
            <Button
              key={token.address}
              variant="glass"
              size="sm"
              onClick={() => handleSelect(token)}
              disabled={disabledToken?.address === token.address}
              className={cn(
                "gap-2",
                selectedToken?.address === token.address && "border-primary"
              )}
            >
              <TokenIcon token={token} size="sm" />
              {token.symbol}
            </Button>
          ))}
        </div>

        <div className="border-t border-border pt-2 -mx-6 px-6">
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            <AnimatePresence mode="popLayout">
              {filteredTokens.map((token) => (
                <motion.button
                  key={token.address}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => handleSelect(token)}
                  disabled={disabledToken?.address === token.address}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left",
                    selectedToken?.address === token.address && "bg-muted/50",
                    disabledToken?.address === token.address && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <TokenIcon token={token} />
                  <div className="flex-1">
                    <div className="font-semibold">{token.symbol}</div>
                    <div className="text-sm text-muted-foreground">{token.name}</div>
                  </div>
                  {selectedToken?.address === token.address && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface TokenIconProps {
  token: Token;
  size?: 'sm' | 'md' | 'lg';
}

export function TokenIcon({ token, size = 'md' }: TokenIconProps) {
  const [error, setError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  if (error || !token.logoURI) {
    return (
      <div className={cn(
        sizeClasses[size],
        "rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold",
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {token.symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={token.logoURI}
      alt={token.symbol}
      className={cn(sizeClasses[size], "rounded-full")}
      onError={() => setError(true)}
    />
  );
}

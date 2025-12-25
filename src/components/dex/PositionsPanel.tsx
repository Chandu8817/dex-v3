import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, Percent, ExternalLink } from 'lucide-react';
import { useChainId } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenIcon } from '@/components/dex/TokenSelector';
import { COMMON_TOKENS, getNativeToken, Token } from '@/lib/web3/tokens';
import { chainMetadata } from '@/lib/web3/config';
import { cn } from '@/lib/utils';

interface Position {
  id: string;
  token0: Token;
  token1: Token;
  feeTier: number;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  inRange: boolean;
  uncollectedFees0: string;
  uncollectedFees1: string;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
}

// Mock positions data
const mockPositions: Position[] = [
  {
    id: '12345',
    token0: { address: '0x', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 1 },
    token1: { address: '0x', symbol: 'USDC', name: 'USD Coin', decimals: 6, chainId: 1 },
    feeTier: 3000,
    liquidity: '1500.00',
    tickLower: -887220,
    tickUpper: 887220,
    inRange: true,
    uncollectedFees0: '0.0234',
    uncollectedFees1: '43.21',
    currentPrice: 1850,
    minPrice: 1500,
    maxPrice: 2200,
  },
  {
    id: '12346',
    token0: { address: '0x', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8, chainId: 1 },
    token1: { address: '0x', symbol: 'ETH', name: 'Ethereum', decimals: 18, chainId: 1 },
    feeTier: 500,
    liquidity: '2500.00',
    tickLower: -887220,
    tickUpper: 887220,
    inRange: false,
    uncollectedFees0: '0.00012',
    uncollectedFees1: '0.0156',
    currentPrice: 16.5,
    minPrice: 14,
    maxPrice: 15.5,
  },
];

export function PositionsPanel() {
  const chainId = useChainId();
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const meta = chainMetadata[chainId as keyof typeof chainMetadata];

  const totalValue = mockPositions.reduce((acc, p) => acc + parseFloat(p.liquidity), 0);
  const totalFees = mockPositions.reduce((acc, p) => {
    return acc + parseFloat(p.uncollectedFees0) * 1850 + parseFloat(p.uncollectedFees1);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Value</div>
                <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Uncollected Fees</div>
                <div className="text-2xl font-bold">${totalFees.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-secondary/10">
                <Percent className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Positions</div>
                <div className="text-2xl font-bold">{mockPositions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions List */}
      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Positions</CardTitle>
          <Button variant="default" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Position
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockPositions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-lg mb-2">No positions yet</div>
              <div className="text-sm">Add liquidity to start earning fees</div>
            </div>
          ) : (
            mockPositions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                isSelected={selectedPosition === position.id}
                onSelect={() => setSelectedPosition(position.id === selectedPosition ? null : position.id)}
                explorerUrl={meta?.explorerUrl}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface PositionCardProps {
  position: Position;
  isSelected: boolean;
  onSelect: () => void;
  explorerUrl?: string;
}

function PositionCard({ position, isSelected, onSelect, explorerUrl }: PositionCardProps) {
  const rangeWidth = ((position.currentPrice - position.minPrice) / (position.maxPrice - position.minPrice)) * 100;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border transition-all cursor-pointer",
        isSelected 
          ? "bg-muted border-primary/50" 
          : "bg-background/50 border-border hover:border-border-glow"
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <TokenIcon token={position.token0} />
            <TokenIcon token={position.token1} />
          </div>
          <div>
            <div className="font-semibold">
              {position.token0.symbol}/{position.token1.symbol}
            </div>
            <div className="text-sm text-muted-foreground">
              {(position.feeTier / 10000).toFixed(2)}% fee
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge 
            variant={position.inRange ? "default" : "secondary"}
            className={cn(
              position.inRange 
                ? "bg-in-range/20 text-in-range border-in-range/30" 
                : "bg-out-of-range/20 text-out-of-range border-out-of-range/30"
            )}
          >
            {position.inRange ? 'In Range' : 'Out of Range'}
          </Badge>
          <div className="text-right">
            <div className="font-semibold">${position.liquidity}</div>
            <div className="text-sm text-muted-foreground">Liquidity</div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border"
        >
          <div className="p-4 space-y-4">
            {/* Price Range Visualization */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price Range</span>
                <span>
                  {position.minPrice.toLocaleString()} - {position.maxPrice.toLocaleString()} {position.token1.symbol}
                </span>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "absolute h-full rounded-full",
                    position.inRange ? "bg-in-range" : "bg-out-of-range"
                  )}
                  style={{ 
                    left: '10%', 
                    right: '10%',
                    width: '80%'
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full"
                  style={{ left: `${Math.min(Math.max(rangeWidth, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{position.minPrice.toLocaleString()}</span>
                <span>Current: {position.currentPrice.toLocaleString()}</span>
                <span>{position.maxPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Uncollected Fees */}
            <div className="bg-background/50 rounded-xl p-3">
              <div className="text-sm text-muted-foreground mb-2">Uncollected Fees</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <TokenIcon token={position.token0} size="sm" />
                    <span className="font-medium">{position.uncollectedFees0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TokenIcon token={position.token1} size="sm" />
                    <span className="font-medium">{position.uncollectedFees1}</span>
                  </div>
                </div>
                <Button variant="success" size="sm">
                  Collect
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="glass" className="flex-1 gap-2">
                <Plus className="h-4 w-4" />
                Increase
              </Button>
              <Button variant="glass" className="flex-1 gap-2">
                <Minus className="h-4 w-4" />
                Remove
              </Button>
              {explorerUrl && (
                <Button variant="ghost" size="icon" asChild>
                  <a 
                    href={`${explorerUrl}/token/${position.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, Percent, ExternalLink, AlertCircle, Loader } from 'lucide-react';
import { useChainId } from 'wagmi';
import { useAccount } from 'wagmi';
import { useQuery } from '@apollo/client/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TokenIcon } from '@/components/dex/TokenSelector';
import { chainMetadata } from '@/lib/web3/config';
import { useCollectFees, useDecreaseLiquidity } from '@/hooks/usePositions';
import { POOLS_QUERY, USER_POSITIONS_QUERY } from '@/graphql/queries';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PositionsPanel() {
  const chainId = useChainId();
  const { address } = useAccount();
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const meta = chainMetadata[chainId as keyof typeof chainMetadata];

  // Fetch positions from subgraph (using Mint events)
  const { data, loading: isLoading, error, refetch } = useQuery<any>(POOLS_QUERY, {
    variables: {
      owner: address?.toLowerCase() || '',
    },
    skip: !address,
    pollInterval: 10000, // Refresh every 10 seconds
  });

  const mints = data?.mints || [];

  const totalValue = mints.reduce((acc: number, mint: any) => {
    const amount0 = parseFloat(mint.amount0) || 0;
    const amount1 = parseFloat(mint.amount1) || 0;
    return acc + amount0 + amount1;
  }, 0);

  const totalFees = mints.reduce((acc: number, mint: any) => {
    const amountUSD = parseFloat(mint.amountUSD) || 0;
    // Note: Mints don't track fees directly, using deposited amount as proxy
    return acc + (amountUSD * 0.01); // Rough estimate
  }, 0);

  if (error) {
    return (
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{error.message}</span>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => refetch()} 
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

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
                <div className="text-2xl font-bold">{mints.length}</div>
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
          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="h-5 w-5 animate-spin mx-auto mb-2" />
              <div className="text-muted-foreground">Loading positions...</div>
            </div>
          ) : mints.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-lg mb-2">No positions yet</div>
              <div className="text-sm">Add liquidity to start earning fees</div>
            </div>
          ) : (
            mints.map((mint: any) => (
              <PositionCard
                key={mint.id}
                position={mint}
                isSelected={selectedPosition === mint.id}
                onSelect={() => setSelectedPosition(mint.id === selectedPosition ? null : mint.id)}
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
  position: any;
  isSelected: boolean;
  onSelect: () => void;
  explorerUrl?: string;
}

function PositionCard({ position, isSelected, onSelect, explorerUrl }: PositionCardProps) {
  const chainId = useChainId();
  const { collectFees, isLoading: isCollecting } = useCollectFees(undefined, chainId);
  const { decreaseLiquidity, isLoading: isDecreasing } = useDecreaseLiquidity(undefined, chainId);

  // Extract data from Mint event
  const mint = position;
  const pool = mint.pool || {};
  const token0 = pool.token0 || {};
  const token1 = pool.token1 || {};
  const feeTier = pool.feeTier || 0;
  const liquidity = parseFloat(mint.liquidity) || 0;
  const amount0 = parseFloat(mint.amount0) || 0;
  const amount1 = parseFloat(mint.amount1) || 0;
  const amountUSD = parseFloat(mint.amountUSD) || 0;

  const handleCollectFees = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Mint events from subgraph don't include tokenId
    // This would require querying the blockchain for NFT positions
    toast.info("Fee collection requires on-chain position data");
  };

  const handleRemoveLiquidity = async (e: React.MouseEvent, percent: number) => {
    e.stopPropagation();
    // Mint events from subgraph don't include tokenId
    // This would require querying the blockchain for NFT positions
    toast.info("Liquidity management requires on-chain position data");
  };

  // Simplified visualization (without on-chain price data)
  const positionValue = amount0 + amount1;

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
            {token0.id && <div className="w-6 h-6 rounded-full bg-primary/30" />}
            {token1.id && <div className="w-6 h-6 rounded-full bg-secondary/30" />}
          </div>
          <div>
            <div className="font-semibold">
              {token0.symbol || 'Token0'}/{token1.symbol || 'Token1'}
            </div>
            <div className="text-sm text-muted-foreground">
              {(feeTier / 10000).toFixed(2)}% fee
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge 
            variant="default"
            className="bg-blue-500/20 text-blue-500 border-blue-500/30"
          >
            Active
          </Badge>
          <div className="text-right">
            <div className="font-semibold">${positionValue.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Value</div>
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
            {/* Position Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Amount0</div>
                <div className="font-semibold">{amount0.toFixed(6)} {token0.symbol}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Amount1</div>
                <div className="font-semibold">{amount1.toFixed(6)} {token1.symbol}</div>
              </div>
            </div>

            {/* Tick Info */}
            <div className="bg-background/50 rounded-xl p-3">
              <div className="text-sm text-muted-foreground mb-2">Position Range</div>
              <div className="flex justify-between text-sm">
                <span>Lower Tick: {position.tickLower}</span>
                <span>Upper Tick: {position.tickUpper}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Liquidity: {liquidity.toLocaleString()}
              </div>
            </div>

            {/* Fees Info */}
            <div className="bg-background/50 rounded-xl p-3">
              <div className="text-sm text-muted-foreground mb-2">Transaction Info</div>
              <div className="text-sm text-muted-foreground">
                <div>Timestamp: {new Date(parseInt(mint.timestamp) * 1000).toLocaleString()}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="glass" className="flex-1 gap-2" disabled={isDecreasing}>
                <Plus className="h-4 w-4" />
                Increase
              </Button>
              <Button 
                variant="glass" 
                className="flex-1 gap-2" 
                onClick={(e) => handleRemoveLiquidity(e, 50)}
                disabled={isDecreasing}
              >
                {isDecreasing ? <Loader className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
                Remove
              </Button>
              {explorerUrl && (
                <Button variant="ghost" size="icon" asChild>
                  <a 
                    href={`${explorerUrl}/tx/${mint.transaction?.id}`}
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

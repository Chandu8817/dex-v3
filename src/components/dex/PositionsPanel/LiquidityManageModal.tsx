import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Position {
  id: string;
  tokenId: string;
  token0: any;
  token1: any;
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

interface LiquidityManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: Position;
  mode?: 'increase' | 'remove';
}

export function LiquidityManageModal({
  isOpen,
  onClose,
  position,
  mode = 'increase',
}: LiquidityManageModalProps) {
  const [activeMode, setActiveMode] = useState<'increase' | 'remove'>(mode);
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !position) return null;

  const handleSubmit = async () => {
    if (!amount0 || !amount1) return;

    try {
      setIsProcessing(true);
      // Add liquidity management logic here
      console.log('Managing liquidity:', {
        tokenId: position.tokenId,
        mode: activeMode,
        amount0,
        amount1,
      });
      
      onClose();
    } catch (error) {
      console.error('Error managing liquidity:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <Card variant="glass" className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border">
            <div className="space-y-1">
              <CardTitle>
                {activeMode === 'increase' ? 'Increase' : 'Remove'} Liquidity
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {position.token0.symbol}/{position.token1.symbol} • {(position.feeTier / 10000).toFixed(2)}%
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Mode Selector */}
            <div className="flex gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveMode('increase')}
                className={cn(
                  'flex-1 py-2 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2',
                  activeMode === 'increase'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Plus className="h-4 w-4" />
                Increase
              </button>
              <button
                onClick={() => setActiveMode('remove')}
                className={cn(
                  'flex-1 py-2 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2',
                  activeMode === 'remove'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Minus className="h-4 w-4" />
                Remove
              </button>
            </div>

            {/* Position Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 border border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Liquidity</span>
                <span className="font-medium">${position.liquidity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fee Tier</span>
                <span className="font-medium">{(position.feeTier / 10000).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={cn(
                  'font-medium text-sm',
                  position.inRange ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                )}>
                  {position.inRange ? 'In Range' : 'Out of Range'}
                </span>
              </div>
            </div>

            {/* Amount Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {position.token0.symbol} Amount
                </label>
                <input
                  type="number"
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {position.token1.symbol} Amount
                </label>
                <input
                  type="number"
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Warning for Remove */}
            {activeMode === 'remove' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Removing liquidity will close your position. Make sure to collect uncollected fees first.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!amount0 || !amount1 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : activeMode === 'increase' ? 'Increase' : 'Remove'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

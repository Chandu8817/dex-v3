import { useState } from 'react';
import { Settings, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SlippageSettingsProps {
  slippage: number;
  onSlippageChange: (slippage: number) => void;
  deadline: number;
  onDeadlineChange: (deadline: number) => void;
}

const PRESET_SLIPPAGES = [0.1, 0.5, 1.0];

export function SlippageSettings({
  slippage,
  onSlippageChange,
  deadline,
  onDeadlineChange,
}: SlippageSettingsProps) {
  const [customSlippage, setCustomSlippage] = useState('');
  const isHighSlippage = slippage > 1;

  const handleCustomSlippage = (value: string) => {
    setCustomSlippage(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && num <= 50) {
      onSlippageChange(num);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border" align="end">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold">Slippage tolerance</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your transaction will revert if the price changes unfavorably by more than this percentage.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              {PRESET_SLIPPAGES.map((preset) => (
                <Button
                  key={preset}
                  variant={slippage === preset ? 'default' : 'glass'}
                  size="sm"
                  onClick={() => {
                    onSlippageChange(preset);
                    setCustomSlippage('');
                  }}
                >
                  {preset}%
                </Button>
              ))}
              <div className="relative flex-1">
                <Input
                  type="number"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => handleCustomSlippage(e.target.value)}
                  className={cn(
                    "pr-6 bg-muted border-border text-right",
                    isHighSlippage && "border-warning"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
            {isHighSlippage && (
              <p className="text-warning text-xs mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                High slippage tolerance. Your transaction may be frontrun.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold">Transaction deadline</span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Your transaction will revert if it is pending for more than this period of time.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={deadline}
                onChange={(e) => onDeadlineChange(parseInt(e.target.value) || 30)}
                className="w-20 bg-muted border-border text-right"
              />
              <span className="text-muted-foreground">minutes</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

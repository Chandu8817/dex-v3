import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { AmountInput } from "@/components/dex/AmountInput";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Token } from "@/lib/web3/tokens";
import { PriceRangeSuggestion } from "../types";
import { formatDisplayBalance } from "../utils/formatting";

interface PriceRangeInputProps {
  token0: Token | null;
  token1: Token | null;
  minPrice: string;
  maxPrice: string;
  currentPrice: number;
  isFullRange: boolean;
  priceRangeSuggestions: PriceRangeSuggestion[];

  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onFullRangeChange: (isFullRange: boolean) => void;
  onSuggestionSelect: (suggestion: PriceRangeSuggestion) => void;
}

export function PriceRangeInput({
  token0,
  token1,
  minPrice,
  maxPrice,
  currentPrice,
  isFullRange,
  priceRangeSuggestions,
  onMinPriceChange,
  onMaxPriceChange,
  onFullRangeChange,
  onSuggestionSelect,
}: PriceRangeInputProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Set Price Range (Optional)
        </label>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Leave blank for full range. Concentrated liquidity earns more fees
              but has higher impermanent loss risk.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Price Range Visualization */}
      <div className="bg-muted rounded-xl p-4">
        <div className="text-center mb-4">
          <span className="text-sm text-muted-foreground">Current Price </span>
          <div className="text-lg font-bold">
            {currentPrice > 0
              ? currentPrice.toFixed(3).toString()
              : "Loading..."}{" "}
            {token1?.symbol || "T1"}/{token0?.symbol || "T0"}
          </div>
        </div>

        <div className="relative h-12 mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-secondary/40 to-secondary/20 rounded-lg" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Min Price</label>
            <div className="bg-background rounded-xl p-3">
              <AmountInput
                value={minPrice}
                onChange={(v) => {
                  onFullRangeChange(false);
                  onMinPriceChange(v);
                }}
                placeholder="0"
                className="text-xl"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {token1?.symbol} per {token0?.symbol}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Max Price</label>
            <div className="bg-background rounded-xl p-3">
              <AmountInput
                value={isFullRange ? "" : maxPrice}
                onChange={(v) => {
                  onFullRangeChange(false);
                  onMaxPriceChange(v);
                }}
                placeholder={isFullRange ? "∞" : "0"}
                className="text-xl"
                disabled={isFullRange}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {token1?.symbol} per {token0?.symbol}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {priceRangeSuggestions.map((suggestion) => (
            <Button
              key={suggestion.label}
              variant="muted"
              size="sm"
              onClick={() => {
                onFullRangeChange(false);
                onSuggestionSelect(suggestion);
              }}
              className="flex-1"
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

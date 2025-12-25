import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FEE_TIERS, FEE_TIER_LABELS } from "@/lib/web3/config";

interface FeeTierSelectorProps {
  feeTier: number;
  onFeeTierChange: (fee: number) => void;
}

export function FeeTierSelector({ feeTier, onFeeTierChange }: FeeTierSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Fee Tier
        </label>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              Higher fee tiers earn more per swap but receive less volume.
              Choose based on the pair's volatility.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(FEE_TIERS).map(([key, value]) => (
          <button
            key={key}
            onClick={() => onFeeTierChange(value)}
            className={cn(
              "p-3 rounded-xl border text-center transition-all",
              feeTier === value
                ? "bg-secondary/20 border-secondary text-foreground"
                : "bg-muted border-border text-muted-foreground hover:border-border-glow"
            )}
          >
            <div className="font-semibold">{FEE_TIER_LABELS[value]}</div>
            <div className="text-xs mt-1 opacity-70">
              {key === "LOWEST" && "Stable"}
              {key === "LOW" && "Stable"}
              {key === "MEDIUM" && "Standard"}
              {key === "HIGH" && "Exotic"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

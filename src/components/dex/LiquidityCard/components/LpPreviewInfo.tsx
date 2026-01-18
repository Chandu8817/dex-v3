import { AlertCircle } from "lucide-react";

interface LpPreviewInfoProps {
  lpPreview: any;
  warning: string | null;
  token0Symbol?: string;
  token1Symbol?: string;
}

export function LpPreviewInfo({ lpPreview, warning, token0Symbol, token1Symbol }: LpPreviewInfoProps) {
  if (!lpPreview) return null;

  const imbalancePercent = Math.round((1 - lpPreview.imbalanceRatio) * 100);

  return (
    <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border border-border">
      <div className="text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max {token0Symbol || "Token0"}:</span>
          <span className="text-foreground font-medium">{lpPreview.amount0Max}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Will Use {token0Symbol || "Token0"}:</span>
          <span className="text-accent font-medium">{parseFloat(lpPreview.amount0Used).toFixed(6)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Max {token1Symbol || "Token1"}:</span>
          <span className="text-foreground font-medium">{lpPreview.amount1Max}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Will Use {token1Symbol || "Token1"}:</span>
          <span className="text-accent font-medium">{parseFloat(lpPreview.amount1Used).toFixed(6)}</span>
        </div>
      </div>

      {warning && (
        <div className="flex gap-2 p-2 bg-warning/10 rounded border border-warning/30">
          <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning">{warning}</p>
        </div>
      )}

      {imbalancePercent > 0 && (
        <div className="text-xs text-muted-foreground">
          Imbalance: {imbalancePercent}% of capital unused at this price range
        </div>
      )}
    </div>
  );
}

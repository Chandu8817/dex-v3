import { AlertTriangle } from "lucide-react";

interface ImpermanentLossWarningProps {
  isFullRange: boolean;
  minPrice: string;
  maxPrice: string;
}

export function ImpermanentLossWarning({
  isFullRange,
  minPrice,
  maxPrice,
}: ImpermanentLossWarningProps) {
  if (isFullRange || !minPrice || !maxPrice) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <span>
        Concentrated liquidity positions have higher impermanent loss risk. Your
        position may go out of range if the price moves significantly.
      </span>
    </div>
  );
}

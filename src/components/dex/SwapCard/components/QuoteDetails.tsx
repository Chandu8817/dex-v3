import { AnimatePresence, motion } from "framer-motion";
import { Info, Zap, AlertTriangle } from "lucide-react";
import { FEE_TIER_LABELS } from "@/lib/web3/config";
import { QuoteData } from "../types";
import { cn } from "@/lib/utils";

interface QuoteDetailsProps {
  quote: QuoteData | null;
  inputSymbol: string;
  outputSymbol: string;
}

export function QuoteDetails({
  quote,
  inputSymbol,
  outputSymbol,
}: QuoteDetailsProps) {
  const isHighPriceImpact = quote && quote.priceImpact > 3;

  return (
    <AnimatePresence>
      {quote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="bg-background/50 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rate</span>
              <span>
                1 {inputSymbol} = 1,850 {outputSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                Price Impact
                <Info className="h-3 w-3" />
              </span>
              <span className={cn(isHighPriceImpact && "text-warning")}>
                {quote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fee Tier</span>
              <span>
                {
                  FEE_TIER_LABELS[
                    quote.feeTier as keyof typeof FEE_TIER_LABELS
                  ]
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Est. Gas
              </span>
              <span>~{quote.gasEstimate} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Route</span>
              <span className="flex items-center gap-1">
                {quote.route.join(" → ")}
              </span>
            </div>
          </div>

          {isHighPriceImpact && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm mt-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>High price impact! Consider reducing your trade size.</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

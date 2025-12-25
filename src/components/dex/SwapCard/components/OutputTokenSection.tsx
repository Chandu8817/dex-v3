import { Button } from "@/components/ui/button";
import { ChevronDown, Loader } from "lucide-react";
import { Token } from "@/lib/web3/tokens";
import { TokenIcon, TokenSelector } from "@/components/dex/TokenSelector";
import { AmountInput } from "@/components/dex/AmountInput";
import { formatDisplayBalance } from "../utils";

interface OutputTokenSectionProps {
  outputToken: Token | null;
  outputAmount: string;
  balanceOut: string;
  quoteLoading: boolean;
  onAmountChange: (value: string) => void;
  onTokenSelect: () => void;
  onTokenSelectorOpen: (token: "input" | "output" | null) => void;
  onTokenSelected: (token: Token) => void;
  tokenSelectorOpen: "input" | "output" | null;
  chainId: number;
  disabledToken: Token | null;
}

export function OutputTokenSection({
  outputToken,
  outputAmount,
  balanceOut,
  quoteLoading,
  onAmountChange,
  onTokenSelect,
  onTokenSelectorOpen,
  onTokenSelected,
  tokenSelectorOpen,
  chainId,
  disabledToken,
}: OutputTokenSectionProps) {
  return (
    <>
      <div className="bg-muted rounded-2xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>You receive</span>
          <span>
            Balance:{" "}
            {formatDisplayBalance(balanceOut, outputToken?.decimals || 18)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <AmountInput
              value={outputAmount}
              onChange={onAmountChange}
              disabled={false}
              className="flex-1"
            />
            {quoteLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            )}
          </div>
          <Button
            variant="glass"
            onClick={onTokenSelect}
            className="gap-2 shrink-0"
          >
            {outputToken ? (
              <>
                <TokenIcon token={outputToken} size="sm" />
                <span className="font-semibold">{outputToken.symbol}</span>
              </>
            ) : (
              <span>Select</span>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {outputAmount &&
            `≈ $${parseFloat(outputAmount || "0").toFixed(2)}`}
        </span>
      </div>

      <TokenSelector
        open={tokenSelectorOpen === "output"}
        onClose={() => onTokenSelectorOpen(null)}
        onSelect={onTokenSelected}
        chainId={chainId}
        selectedToken={outputToken || undefined}
        disabledToken={disabledToken || undefined}
      />
    </>
  );
}

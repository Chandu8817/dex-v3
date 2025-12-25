import { Button } from "@/components/ui/button";
import { ChevronDown, Loader } from "lucide-react";
import { Token } from "@/lib/web3/tokens";
import { TokenIcon, TokenSelector } from "@/components/dex/TokenSelector";
import { AmountInput } from "@/components/dex/AmountInput";
import { formatDisplayBalance } from "../utils";

interface InputTokenSectionProps {
  inputToken: Token | null;
  inputAmount: string;
  balanceIn: string;
  quoteLoading: boolean;
  onAmountChange: (value: string) => void;
  onTokenSelect: () => void;
  onTokenSelectorOpen: (token: "input" | "output" | null) => void;
  onTokenSelected: (token: Token) => void;
  tokenSelectorOpen: "input" | "output" | null;
  chainId: number;
  disabledToken: Token | null;
}

export function InputTokenSection({
  inputToken,
  inputAmount,
  balanceIn,
  quoteLoading,
  onAmountChange,
  onTokenSelect,
  onTokenSelectorOpen,
  onTokenSelected,
  tokenSelectorOpen,
  chainId,
  disabledToken,
}: InputTokenSectionProps) {
  return (
    <>
      <div className="bg-muted rounded-2xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>You pay</span>
          <span>
            Balance:{" "}
            {formatDisplayBalance(balanceIn, inputToken?.decimals || 18)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AmountInput
            value={inputAmount}
            onChange={onAmountChange}
            className="flex-1"
          />
          <Button
            variant="glass"
            onClick={onTokenSelect}
            className="gap-2 shrink-0"
          >
            {inputToken ? (
              <>
                <TokenIcon token={inputToken} size="sm" />
                <span className="font-semibold">{inputToken.symbol}</span>
              </>
            ) : (
              <span>Select</span>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">
            {inputAmount &&
              `≈ $${(parseFloat(inputAmount || "0") * 1850).toFixed(2)}`}
          </span>
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                className="px-2 py-0.5 text-xs rounded-md bg-background/50 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onAmountChange("1.0")}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TokenSelector
        open={tokenSelectorOpen === "input"}
        onClose={() => onTokenSelectorOpen(null)}
        onSelect={onTokenSelected}
        chainId={chainId}
        selectedToken={inputToken || undefined}
        disabledToken={disabledToken || undefined}
      />
    </>
  );
}

import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Token } from "@/lib/web3/tokens";
import { TokenIcon, TokenSelector } from "@/components/dex/TokenSelector";

interface TokenPairSelectorProps {
  token0: Token | null;
  token1: Token | null;
  tokenSelectorOpen: "token0" | "token1" | null;
  onTokenSelectorOpen: (token: "token0" | "token1" | null) => void;
  onTokenSelect: (token: Token) => void;
  chainId: number;
}

export function TokenPairSelector({
  token0,
  token1,
  tokenSelectorOpen,
  onTokenSelectorOpen,
  onTokenSelect,
  chainId,
}: TokenPairSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Select Pair
      </label>
      <div className="flex gap-3">
        <Button
          variant="glass"
          className="flex-1 justify-between h-14"
          onClick={() => onTokenSelectorOpen("token0")}
        >
          {token0 ? (
            <div className="flex items-center gap-2">
              <TokenIcon token={token0} />
              <span className="font-semibold">{token0.symbol}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select token</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          variant="glass"
          className="flex-1 justify-between h-14"
          onClick={() => onTokenSelectorOpen("token1")}
        >
          {token1 ? (
            <div className="flex items-center gap-2">
              <TokenIcon token={token1} />
              <span className="font-semibold">{token1.symbol}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select token</span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <TokenSelector
        open={tokenSelectorOpen !== null}
        onClose={() => onTokenSelectorOpen(null)}
        onSelect={onTokenSelect}
        chainId={chainId}
        selectedToken={
          tokenSelectorOpen === "token0"
            ? token0 || undefined
            : token1 || undefined
        }
        disabledToken={
          tokenSelectorOpen === "token0"
            ? token1 || undefined
            : token0 || undefined
        }
      />
    </div>
  );
}

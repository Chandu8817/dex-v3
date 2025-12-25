import { Token } from "@/lib/web3/tokens";
import { AmountInput } from "@/components/dex/AmountInput";
import { TokenIcon } from "@/components/dex/TokenSelector";
import { formatDisplayBalance } from "../utils/formatting";

interface DepositAmountsProps {
  token0: Token | null;
  token1: Token | null;
  amount0: string;
  amount1: string;
  balanceA: string;
  balanceB: string;
  onAmount0Change: (value: string) => void;
  onAmount1Change: (value: string) => void;
}

export function DepositAmounts({
  token0,
  token1,
  amount0,
  amount1,
  balanceA,
  balanceB,
  onAmount0Change,
  onAmount1Change,
}: DepositAmountsProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Deposit Amounts
      </label>

      <div className="bg-muted rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{token0?.symbol || "Token 0"}</span>
          <span>
            Balance:{" "}
            {token0 ? formatDisplayBalance(balanceA, token0.decimals) : "0"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AmountInput
            value={amount0}
            onChange={onAmount0Change}
            className="flex-1"
          />
          {token0 && <TokenIcon token={token0} />}
        </div>
      </div>

      <div className="bg-muted rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{token1?.symbol || "Token 1"}</span>
          <span>
            Balance:{" "}
            {token1 ? formatDisplayBalance(balanceB, token1.decimals) : "0"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AmountInput
            value={amount1}
            onChange={onAmount1Change}
            className="flex-1"
          />
          {token1 && <TokenIcon token={token1} />}
        </div>
      </div>
    </div>
  );
}

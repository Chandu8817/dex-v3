import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Position } from "@/types";
import { JsonRpcSigner } from "ethers";
import { usePositionManager } from "@/hooks/usePositionManager";
const MAX_UINT128 = (1n << 128n) - 1n;
interface LiquidityManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: Position;
  mode?: "increase" | "remove";
  signer: JsonRpcSigner | null;
}

export function LiquidityManageModal({
  isOpen,
  onClose,
  position,
  signer,
  mode = "increase",
}: LiquidityManageModalProps) {
  const [activeMode, setActiveMode] = useState<"increase" | "remove">(mode);
  const [direction, setDirection] = useState<"add" | "decrease">("add");

  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [percent, setPercent] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const { increaseLiquidity, decreaseLiquidity, collect, burn } =
    usePositionManager(signer);

  useEffect(() => {
    setActiveMode(mode);
    setDirection("add");
    setAmount0("");
    setAmount1("");
    setPercent(0);
  }, [mode, position]);

  if (!isOpen || !position) return null;

  const liquidityDelta = (BigInt(position.liquidity) * BigInt(percent)) / 100n;

  const handleSubmit = async () => {
    try {
      setIsProcessing(true);

      if (direction === "add") {
        console.log("Increase liquidity", amount0, amount1);
        // await positionManager.increaseLiquidity(...)
        return onClose();
      }

      console.log("Decrease liquidity:", liquidityDelta.toString());

      await closePosition(BigInt(position.tokenId));

      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  async function closePosition(tokenId: bigint) {
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // 1. remove liquidity if needed
    if (BigInt(position.liquidity) > 0n) {
      decreaseLiquidity({
        tokenId,
        liquidity: BigInt(position.liquidity),
        amount0Min: 0n,
        amount1Min: 0n,
        deadline,
      });
    }

    // 2. collect fees/tokens
    if (
      BigInt(position.tokensOwed0) > 0n ||
      BigInt(position.tokensOwed1) > 0n
    ) {
      const MAX_UINT128 = (1n << 128n) - 1n;

      await collect({
        tokenId,
        recipient: await signer.getAddress(),
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      });
    }

    // 3. re-check

    if (
      BigInt(position.liquidity) === 0n &&
      BigInt(position.tokensOwed0) === 0n &&
      BigInt(position.tokensOwed1) === 0n
    ) {
      await burn(tokenId);
    }
  }

  return (
    <>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex justify-between border-b">
            <div>
              <CardTitle>Manage Liquidity</CardTitle>
              <p className="text-sm text-muted-foreground">
                {position.token0.symbol}/{position.token1.symbol}
              </p>
            </div>
            <button onClick={onClose}>
              <X />
            </button>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {/* Mode */}
            {/* <div className="flex gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setActiveMode('increase')}
                className={cn(
                  'flex-1 py-2 rounded-md',
                  activeMode === 'increase'
                    ? 'bg-primary text-primary-foreground'
                    : ''
                )}
              >
                
                Manage LP
              </button>

              <button
                onClick={() => setActiveMode('remove')}
                className={cn(
                  'flex-1 py-2 rounded-md',
                  activeMode === 'remove'
                    ? 'bg-primary text-primary-foreground'
                    : ''
                )}
              >
                <Minus className="inline h-4 w-4 mr-1" />
                Remove LP 
              </button>
            </div> */}

            {/* Direction */}
            {activeMode === "increase" && (
              <div className="flex gap-2 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setDirection("add")}
                  className={cn(
                    "flex-1 py-2 rounded-md",
                    direction === "add"
                      ? "bg-primary text-primary-foreground"
                      : "",
                  )}
                >
                  <Plus className="inline h-4 w-4 mr-1" />
                  Increase
                </button>

                <button
                  onClick={() => setDirection("decrease")}
                  className={cn(
                    "flex-1 py-2 rounded-md",
                    direction === "decrease"
                      ? "bg-primary text-primary-foreground"
                      : "",
                  )}
                >
                  <Minus className="inline h-4 w-4 mr-1" />
                  Decrease
                </button>
              </div>
            )}

            {/* ADD INPUTS */}
            {activeMode === "increase" && direction === "add" && (
              <>
                <input
                  placeholder={`${position.token0.symbol} amount`}
                  value={amount0}
                  onChange={(e) => setAmount0(e.target.value)}
                  className="w-full p-2 border rounded"
                />

                <input
                  placeholder={`${position.token1.symbol} amount`}
                  value={amount1}
                  onChange={(e) => setAmount1(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </>
            )}

            {/* DECREASE SLIDER */}
            {activeMode === "increase" && direction === "decrease" && (
              <div className="space-y-3">
                <label>Remove Liquidity: {percent}%</label>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="w-full"
                />

                <div className="bg-muted p-3 rounded text-sm">
                  LP Removed: {liquidityDelta.toString()}
                </div>
              </div>
            )}

            {/* REMOVE */}
            {/* {activeMode === 'remove' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm">
                This will permanently burn your position NFT.
              </div>
            )} */}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1">
                Cancel
              </Button>

              {activeMode === "increase" ? (
                <Button
                  onClick={handleSubmit}
                  disabled={
                    direction === "add" ? !amount0 || !amount1 : !percent
                  }
                  className="flex-1"
                >
                  {direction === "add"
                    ? "Add Liquidity"
                    : BigInt(position.liquidity) > 0n
                      ? "Decrease LP"
                      : BigInt(position.tokensOwed0) > 0n ||
                          BigInt(position.tokensOwed1) > 0n
                        ? "Collect LP"
                        : "Burn Position"}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  Burn Position
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

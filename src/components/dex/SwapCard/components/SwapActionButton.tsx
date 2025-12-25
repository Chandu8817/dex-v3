import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader } from "lucide-react";

interface SwapActionButtonProps {
  isConnected: boolean;
  isSwapping: boolean;
  isLoading: boolean;
  hasSufficientBalance: boolean;
  needsApproval: boolean;
  hasInputAmount: boolean;
  hasQuote: boolean;
  onApprove: () => Promise<void>;
  onSwap: () => Promise<void>;
}

export function SwapActionButton({
  isConnected,
  isSwapping,
  isLoading,
  hasSufficientBalance,
  needsApproval,
  hasInputAmount,
  hasQuote,
  onApprove,
  onSwap,
}: SwapActionButtonProps) {
  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <Button
            variant="swap"
            size="xl"
            className="w-full"
            onClick={openConnectModal}
          >
            Connect Wallet
          </Button>
        )}
      </ConnectButton.Custom>
    );
  }

  if (!hasSufficientBalance && hasInputAmount) {
    return (
      <Button variant="swap" size="xl" className="w-full" disabled>
        Insufficient Balance
      </Button>
    );
  }

  if (needsApproval) {
    return (
      <Button
        variant="swap"
        size="xl"
        className="w-full"
        disabled={isSwapping || !hasInputAmount || isLoading}
        onClick={onApprove}
      >
        {isSwapping ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Approving...
          </>
        ) : (
          "Approve"
        )}
      </Button>
    );
  }

  const canSwap = hasInputAmount && hasQuote && !isLoading;

  return (
    <Button
      variant="swap"
      size="xl"
      className="w-full"
      disabled={!canSwap || isSwapping}
      onClick={onSwap}
    >
      {isSwapping ? (
        <>
          <Loader className="h-4 w-4 animate-spin mr-2" />
          Swapping...
        </>
      ) : !hasInputAmount ? (
        "Enter an amount"
      ) : (
        "Swap"
      )}
    </Button>
  );
}

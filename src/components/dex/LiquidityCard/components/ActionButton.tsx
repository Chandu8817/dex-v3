import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader } from "lucide-react";

interface ActionButtonProps {
  isConnected: boolean;
  isProcessing: boolean;
  hasTokens: boolean;
  hasAmounts: boolean;
  isTokenAApproved: boolean;
  isTokenBApproved: boolean;
  hasSufficientBalance: boolean;
  canAddLiquidity: boolean;
  onApproveTokenA: () => Promise<void>;
  onApproveTokenB: () => Promise<void>;
  onAddLiquidity: () => Promise<void>;
}

export function ActionButton({
  isConnected,
  isProcessing,
  hasTokens,
  hasAmounts,
  isTokenAApproved,
  isTokenBApproved,
  hasSufficientBalance,
  canAddLiquidity,
  onApproveTokenA,
  onApproveTokenB,
  onAddLiquidity,
}: ActionButtonProps) {
  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <Button
            variant="secondary"
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

  if (!hasSufficientBalance && hasAmounts) {
    return (
      <Button variant="secondary" size="xl" className="w-full" disabled>
        Insufficient Balance
      </Button>
    );
  }

  if (!isTokenAApproved) {
    return (
      <Button
        variant="secondary"
        size="xl"
        className="w-full"
        disabled={isProcessing}
        onClick={onApproveTokenA}
      >
        {isProcessing ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Approving Token A...
          </>
        ) : (
          "Approve Token A"
        )}
      </Button>
    );
  }

  if (!isTokenBApproved) {
    return (
      <Button
        variant="secondary"
        size="xl"
        className="w-full"
        disabled={isProcessing}
        onClick={onApproveTokenB}
      >
        {isProcessing ? (
          <>
            <Loader className="h-4 w-4 animate-spin mr-2" />
            Approving Token B...
          </>
        ) : (
          "Approve Token B"
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      size="xl"
      className="w-full"
      disabled={!canAddLiquidity || isProcessing}
      onClick={onAddLiquidity}
    >
      {isProcessing ? (
        <>
          <Loader className="h-4 w-4 animate-spin mr-2" />
          Adding Liquidity...
        </>
      ) : !hasTokens ? (
        "Select tokens"
      ) : !hasAmounts ? (
        "Enter amounts"
      ) : (
        "Add Liquidity"
      )}
    </Button>
  );
}

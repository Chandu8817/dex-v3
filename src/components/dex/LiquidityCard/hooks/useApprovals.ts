import { useCallback } from "react";
import { JsonRpcSigner, ethers } from "ethers";
import { Token } from "@/lib/web3/tokens";
import { useERC20 } from "@/hooks/useERC20";

interface UseApprovalsProps {
  signer: JsonRpcSigner | null;
}

export const useApprovals = ({ signer }: UseApprovalsProps) => {
  const { approve: approveA } = useERC20(signer);
  const { approve: approveB } = useERC20(signer);

  const handleApproveTokenA = useCallback(
    async (
      amount: string,
      token: Token,
      positionManagerAddress: string
    ): Promise<void> => {
      if (!amount || !token) return;
      const amountWei = ethers.parseUnits(amount, token.decimals);
      await approveA(positionManagerAddress, amountWei, token.address);
    },
    [approveA]
  );

  const handleApproveTokenB = useCallback(
    async (
      amount: string,
      token: Token,
      positionManagerAddress: string
    ): Promise<void> => {
      if (!amount || !token) return;
      const amountWei = ethers.parseUnits(amount, token.decimals);
      await approveB(positionManagerAddress, amountWei, token.address);
    },
    [approveB]
  );

  return { handleApproveTokenA, handleApproveTokenB };
};

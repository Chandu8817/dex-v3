import { useCallback } from "react";
import { JsonRpcSigner, ethers } from "ethers";
import { Token, COMMON_TOKENS, getNativeToken } from "@/lib/web3/tokens";
import { useERC20 } from "@/hooks/useERC20";
import { getNormalizedTokenAddress, hasSufficientBalance as checkBalance } from "../utils";

interface UseSwapBalancesProps {
  signer: JsonRpcSigner | null;
  address: string | undefined;
  swapRouterAddress: string | undefined;
  chainId: number;
}

export const useSwapBalances = ({
  signer,
  address,
  swapRouterAddress,
  chainId,
}: UseSwapBalancesProps) => {
  const { getBalance, getAllowance } = useERC20(signer);

  const fetchBalances = useCallback(
    async (inputToken: Token, outputToken: Token) => {
      if (!signer || !address || !inputToken || !outputToken) return null;

      try {
        const [balanceIn, balanceOut] = await Promise.all([
          getBalance(address, inputToken.address, inputToken.symbol),
          getBalance(address, outputToken.address, outputToken.symbol),
        ]);

        let allowanceIn = ethers.MaxUint256.toString();

        if (inputToken.symbol !== "ETH") {
          allowanceIn = (
            await getAllowance(
              address,
              swapRouterAddress!,
              inputToken.address,
              inputToken.symbol
            )
          ).toString();
        }

        return {
          balanceIn: balanceIn.toString(),
          balanceOut: balanceOut.toString(),
          allowanceIn,
        };
      } catch (err) {
        console.error("Error fetching balances:", err);
        return null;
      }
    },
    [signer, address, getBalance, getAllowance, swapRouterAddress]
  );

  const needsApproval = useCallback(
    (inputToken: Token, inputAmount: string, allowanceIn: string): boolean => {
      if (inputToken.symbol === "ETH") return false;
      if (!inputAmount) return false;

      try {
        const amountInWei = ethers.parseUnits(inputAmount, inputToken.decimals);
        return BigInt(allowanceIn) < amountInWei;
      } catch (e) {
        return false;
      }
    },
    []
  );

  const hasSufficientBalance = useCallback(
    (inputToken: Token, inputAmount: string, balanceIn: string): boolean => {
      return checkBalance(inputAmount, balanceIn, inputToken.decimals);
    },
    []
  );

  return {
    fetchBalances,
    needsApproval,
    hasSufficientBalance,
  };
};

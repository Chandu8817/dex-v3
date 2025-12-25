import { useCallback, useEffect } from "react";
import { JsonRpcSigner } from "ethers";
import { Token } from "@/lib/web3/tokens";
import { useERC20 } from "@/hooks/useERC20";

interface UseBalancesProps {
  signer: JsonRpcSigner | null;
  address: string | undefined;
  token0: Token | null;
  token1: Token | null;
  positionManagerAddress: string | undefined;
}

interface BalancesState {
  balanceA: string;
  balanceB: string;
  allowanceA: string;
  allowanceB: string;
}

export const useBalances = ({
  signer,
  address,
  token0,
  token1,
  positionManagerAddress,
}: UseBalancesProps) => {
  const {
    getBalance: getBalanceA,
    getAllowance: getAllowanceA,
  } = useERC20(signer);
  const {
    getBalance: getBalanceB,
    getAllowance: getAllowanceB,
  } = useERC20(signer);

  const fetchBalancesAndAllowances = useCallback(
    async (): Promise<BalancesState | null> => {
      if (!signer || !address || !token0 || !token1) return null;

      try {
        const [balanceA, balanceB, allowanceA, allowanceB] = await Promise.all([
          getBalanceA(address, token0.address, token0.symbol),
          getBalanceB(address, token1.address, token1.symbol),
          getAllowanceA(
            address,
            positionManagerAddress!,
            token0.address,
            token0.symbol
          ),
          getAllowanceB(
            address,
            positionManagerAddress!,
            token1.address,
            token1.symbol
          ),
        ]);

        return {
          balanceA: balanceA.toString(),
          balanceB: balanceB.toString(),
          allowanceA: allowanceA.toString(),
          allowanceB: allowanceB.toString(),
        };
      } catch (err) {
        console.error("Error fetching balances:", err);
        throw err;
      }
    },
    [signer, address, token0, token1, getBalanceA, getBalanceB, getAllowanceA, getAllowanceB, positionManagerAddress]
  );

  return { fetchBalancesAndAllowances };
};

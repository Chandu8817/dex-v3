import { ethers, JsonRpcProvider } from "ethers";
import { uniswapContracts } from "./config";

const FACTORY_ABI = [
  {
    constant: true,
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ internalType: "address", name: "pool", type: "address" }],
    type: "function",
  },
];

/**
 * Get pool address from factory for given token pair and fee
 */
export async function getPool(
  tokenA: string,
  tokenB: string,
  fee: number,
  provider: JsonRpcProvider,
  chainId?: number
): Promise<string | null> {
  try {
    const config = uniswapContracts[chainId || 1];
    if (!config?.factory) return null;

    const factoryContract = new ethers.Contract(
      config.factory,
      FACTORY_ABI,
      provider
    );

    const poolAddress = await factoryContract.getPool(tokenA, tokenB, fee);
    return poolAddress === ethers.ZeroAddress ? null : poolAddress;
  } catch (err) {
    console.error("Error fetching pool address:", err);
    return null;
  }
}

import { JsonRpcSigner } from "ethers";
import { Token } from "@/lib/web3/tokens";

export interface SwapState {
  inputToken: Token | null;
  outputToken: Token | null;
  inputAmount: string;
  outputAmount: string;
  slippage: number;
  deadline: number;
  feeTier?: number;
}

export interface SwapCardProps {
  signer: JsonRpcSigner | null;
}

export interface QuoteData {
  outputAmount: string;
  priceImpact: number;
  gasEstimate: string;
  route: string[];
  feeTier: number;
}

export interface NotificationState {
  type: "success" | "error";
  message: string;
}

export interface QuoteCache {
  key: string;
  data: QuoteData;
  timestamp: number;
}

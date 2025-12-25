import { useAccount } from "wagmi";

// Re-export the refactored SwapCard component for backward compatibility
export { SwapCard } from "./SwapCard/SwapCard";
export type { SwapState } from "./SwapCard/types";

// Legacy: This file is kept for backward compatibility
// New imports should use: import { SwapCard } from "@/components/dex/SwapCard"

function SwapCardLegacy() {
  const { isConnected, address } = useAccount();
  // Legacy function - kept as reference

  return null;
}

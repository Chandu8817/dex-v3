import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Web3Provider } from "@/providers/Web3Provider";
import { DexLayout } from "@/components/dex/DexLayout";
import ApolloClientProvider from "./providers/ApolloProvider";



const App = () => (
  <Web3Provider>
    <ApolloClientProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DexLayout />
    </TooltipProvider>
    </ApolloClientProvider>
  </Web3Provider>
);

export default App;


import { ApolloProvider } from "@apollo/client/react";
import { useChainId } from "wagmi";
import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client";
import { subgraphEndpoints } from "../lib/web3/config";

const ApolloClientProvider = ({children}) => {
  const chainId = useChainId();
  const httpLink = createHttpLink({
    uri: subgraphEndpoints[chainId], // default to mainnet if chainId not found
  });

  const apolloClient = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
  });

   return (
    

   
      <ApolloProvider client={apolloClient} >
        {children}
       
      </ApolloProvider>
    
  )
};

export default ApolloClientProvider;

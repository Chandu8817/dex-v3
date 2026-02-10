import { JsonRpcSigner } from "ethers";
import { useEffect, useState } from "react";
import tokenLogos from "../../../data/tokens.json";
import { useQuery } from "@apollo/client/react";
import { POOLS_QUERY } from "../../../graphql/queries";
import { ethers } from "ethers";
import { useFactory } from "../../../hooks/useFactory";
import { usePool } from "../../../hooks/usePool";
import { usePositionManager } from "../../../hooks/usePositionManager";
import { useERC20 } from "../../../hooks/useERC20";
import { useTokens } from "../../../hooks/useTokens";
import {
  Token,
  COMMON_TOKENS,
  NATIVE_TOKEN_ADDRESS,
  getWrappedNativeToken,
} from "../../../lib/web3/tokens";
import { TokenSelector } from "../TokenSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useChainId } from "wagmi";
import { add } from "date-fns";
import { LiquidityManageModal } from "../PositionsPanel/LiquidityManageModal";
import { Position } from "@/types";

export interface PoolProps {
  signer: JsonRpcSigner | null;
  onSelectPool?: (selection: { token0: Token; token1: Token; feeTier: number; poolAddress?: string }) => void;
}

interface Pool {
  id: string;
  feeTier: number;
  token0: Token;
  token1: Token;
  liquidity: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  txCount?: string;
  createdAtTimestamp?: string;
}

const POSITION_MANAGER_ADDRESS = "0xC36442b4a4522E871399CD717aBDD847Ab11fe88";

export function Pools({ signer, onSelectPool }: PoolProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPositions, setUserPositions] = useState<Pool[]>([]);
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [feeTier, setFeeTier] = useState(3000);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "your">("all");
  const [reserve0, setReserve0] = useState<number>(0);
  const [reserve1, setReserve1] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  const [tokenSelectorOpenFor, setTokenSelectorOpenFor] = useState<
    "token0" | "token1" | null
  >(null);
  const chainId = useChainId();

  const { data, loading: isLoadingPools } = useQuery<any>(POOLS_QUERY, {
    variables: {
      first: 50,
      skip: 0,
      orderBy: "volumeUSD",
      orderDirection: "desc",
      where: {},
    },
  });

  const { getTokenByAddress } = useTokens();
  const { getPoolAddress, createPool } = useFactory(signer);
  const { getUserPositions, mint, createAndInitializePoolIfNecessary } =
    usePositionManager(signer);
  const { initializePool, isPoolInitialized, getSlot0, getTickSpacing, computeUniswapV3PoolAddress } =
    usePool(signer);
  const { checkOrApproveAll, getSymbol } = useERC20(signer);

  // Map pools with logos
  useEffect(() => {
    if (!data?.pools || data.pools.length === 0) return;

    const mappedPools = (data.pools || []).map((pool: any) => {
      const token0Logo = tokenLogos.find(
        (logo) =>
          logo.symbol.toLowerCase() === pool.token0.symbol.toLowerCase(),
      );
      const token1Logo = tokenLogos.find(
        (logo) =>
          logo.symbol.toLowerCase() === pool.token1.symbol.toLowerCase(),
      );

      return {
        ...pool,
        token0: {
          ...pool.token0,
          address: pool.token0.id,
          logoURI:
            token0Logo?.url ||
            "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        },
        token1: {
          ...pool.token1,
          address: pool.token1.id,
          logoURI:
            token1Logo?.url ||
            "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        },
      };
    });

    setPools(mappedPools);
  }, [data?.pools]);

  // Fetch user positions
  useEffect(() => {
    const fetchUserPools = async () => {
      if (!signer || activeTab !== "your") return;

      try {
        setIsLoading(true);
  
         const userAddress = await signer.getAddress();
        const positions = await getUserPositions(userAddress);
      




        // Map positions with token data
     const detailedPositions = (
  await Promise.all(
    positions.map(async (pos: any) => {
      if (
        !pos.token0 ||
        !pos.token1 ||
        typeof pos.token0 !== "string" ||
        typeof pos.token1 !== "string"
      ) {
        return null;
      }

      const token0 = getTokenByAddress(pos.token0);
      const token1 = getTokenByAddress(pos.token1);

      if (!token0 || !token1) return null;

      const sortedTokens = [token0, token1].sort((a, b) =>
        a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
      ) as [Token, Token];

      const [sortedToken0, sortedToken1] = sortedTokens;

      const poolAddress = await getPoolAddress(
        sortedToken0,
        sortedToken1,
        feeTier
       
      );

      let inRange = false;
      const slot0 = await getSlot0(poolAddress);
     if (!slot0) return null;
       inRange =
        slot0.tick >= pos.tickLower &&
        slot0.tick < pos.tickUpper;

      return {
        ...pos,
        token0,
        token1,
        inRange,
      };
    })
  )
).filter(Boolean);

console.log("Detailed user positions:", detailedPositions);
        setUserPositions(detailedPositions);
      } catch (err) {
        console.error("Error fetching user positions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPools();
  }, [signer, activeTab]);

  const handleCreatePool = async () => {
    if (!tokenA || !tokenB) {
      console.error("Both tokens must be selected");
      return;
    }

    try {
      setIsLoading(true);

      // Use wrapped token if native
      let _tokenA = tokenA;
      let _tokenB = tokenB;
      // NATIVE_TOKEN_ADDRESS and wrapped token logic assumed available in scope
      if (tokenA.address === NATIVE_TOKEN_ADDRESS) {
        _tokenA = getWrappedNativeToken(chainId, tokenA.symbol)!;
      }
      if (tokenB.address === NATIVE_TOKEN_ADDRESS) {
        _tokenB = getWrappedNativeToken(chainId, tokenB.symbol)!;
      }

      const token0: Token = _tokenA!;
      const token1: Token = _tokenB!;

      const sortedTokens = [token0, token1].sort((a, b) =>
        a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1,
      ) as [Token, Token];

      const [sortedToken0, sortedToken1] = sortedTokens;
      let amount0, amount1;

      if (sortedToken0.address.toLowerCase() === tokenA.address.toLowerCase()) {
        amount0 = ethers.parseUnits(
          reserve0.toString(),
          Number(sortedToken0.decimals),
        );
        amount1 = ethers.parseUnits(
          reserve1.toString(),
          Number(sortedToken1.decimals),
        );
      } else {
        amount0 = ethers.parseUnits(
          reserve1.toString(),
          Number(sortedToken0.decimals),
        );
        amount1 = ethers.parseUnits(
          reserve0.toString(),
          Number(sortedToken1.decimals),
        );
      }

      // Check if pool already exists
      let poolAddress = await getPoolAddress(
        sortedToken0,
        sortedToken1,
        feeTier,
      );
      const poolExists = poolAddress !== ethers.ZeroAddress;

      if (poolExists) {
        const isInitialized = await isPoolInitialized(poolAddress);
        if (isInitialized) {
          console.log("Pool already initialized");
          return;
        }

        await initializePool(poolAddress, amount0, amount1);
      }

      // Create the pool
      console.log("Creating pool with:", {
        token0: sortedToken0,
        token1: sortedToken1,
        feeTier,
      });
 const newPoolAddress = computeUniswapV3PoolAddress(
        
          sortedToken0.address,
          sortedToken1.address,
          feeTier,
          chainId)
      
      const { txHash,  } =
        await createAndInitializePoolIfNecessary(
          signer,
          sortedToken0,
          sortedToken1,
          feeTier,
          BigInt(amount0),
          BigInt(amount1),
          chainId,
        );

      console.log("Pool creation tx hash:", txHash);

   
      console.log("New pool address:", newPoolAddress);

      console.log("Pool created at:", newPoolAddress);

      const symbolA = await getSymbol(sortedToken0.address);
      const symbolB = await getSymbol(sortedToken1.address);

      await checkOrApproveAll(
        sortedToken0.address,
        sortedToken1.address,
        amount0,
        amount1,
        POSITION_MANAGER_ADDRESS,
        symbolA,
        symbolB,
      );

      const slot0 = await getSlot0(newPoolAddress);
      const currentTick = slot0.tick;
      const tickSpacing = await getTickSpacing(newPoolAddress);
      const range = Math.max(
        1,
        Math.round(Math.abs(Number(currentTick)) * 0.02),
      );
      const lower = currentTick - range;
      const upper = currentTick + range;

      // mint lp position
      const mintTx = await mint({
        token0: sortedToken0.address,
        token1: sortedToken1.address,
        fee: feeTier,
        tickLower: lower,
        tickUpper: upper,
        amount0Desired: amount0,
        amount1Desired: amount1,
        amount0Min: 0n,
        amount1Min: 0n,
        recipient: await signer!.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
      });
      console.log("Mint tx hash:", mintTx);

      // Reset the form
      setTokenA(null);
      setTokenB(null);
      setFeeTier(3000);
      setReserve0(0);
      setReserve1(0);
    } catch (err: any) {
      console.error("Error creating pool:", err);
      setError(err instanceof Error ? err : new Error("Failed to create pool"));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPools = pools.filter((pool: Pool) => {
    const matchesSearch =
      searchQuery === "" ||
      pool.token0.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pool.token1.symbol.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleAddLiquidity = (pool: Pool) => {
    
    setSelectedPool(pool);
    setIsManageModalOpen(true);
    onSelectPool?.({ token0: pool.token0, token1: pool.token1, feeTier: Number(pool.feeTier), poolAddress: pool.id });
  };

  const handleManageLiquidity = (pool: Position) => {
    
    try {
   

       setSelectedPosition(pool);
      setIsManageModalOpen(true);
    } catch (error) {
      console.error('Error in handleManageLiquidity:', error);
      // In a real app, show a user-friendly error message
    }
  };

  if (error) {
    return (
      <Card variant="glass" className="w-full">
        <CardContent className="p-6">
          <div className="text-red-600 text-center">
            <p className="font-semibold mb-2">Error loading pools</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setError(null)}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
          <LiquidityManageModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        signer={signer as ethers.JsonRpcSigner}
        position={selectedPosition || undefined}
        mode="increase"

      />
      {/* Pool Creation Section */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Create Pool</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Token A */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Token 1
              </label>
              <Button
                variant="glass"
                className="w-full justify-between"
                onClick={() => setTokenSelectorOpenFor("token0")}
              >
                {tokenA ? (
                  <span>{tokenA.symbol}</span>
                ) : (
                  <span className="text-muted-foreground">Select token</span>
                )}
              </Button>
              <input
                type="number"
                value={reserve0}
                onChange={(e) => setReserve0(Number(e.target.value))}
                placeholder="Initial Reserve"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Token B */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Token 2
              </label>
              <Button
                variant="glass"
                className="w-full justify-between"
                onClick={() => setTokenSelectorOpenFor("token1")}
              >
                {tokenB ? (
                  <span>{tokenB.symbol}</span>
                ) : (
                  <span className="text-muted-foreground">Select token</span>
                )}
              </Button>
              <input
                type="number"
                value={reserve1}
                onChange={(e) => setReserve1(Number(e.target.value))}
                placeholder="Initial Reserve"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Fee Tier
            </label>
            <select
              value={feeTier}
              onChange={(e) => setFeeTier(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {/* <option value={100}>0.01% - Stable pairs</option> */}
              <option value={500}>0.05% - Stable pairs</option>
              <option value={3000}>0.3% - Most pairs</option>
              <option value={10000}>1% - Exotic pairs</option>
            </select>
          </div>

          <Button
            onClick={handleCreatePool}
            disabled={!tokenA || !tokenB || isLoading}
            className="w-full"
          >
            {isLoading ? "Creating..." : "Create Pool"}
          </Button>
        </CardContent>
      </Card>

      {/* Pools List Section */}
      <Card variant="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pools</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm rounded-lg ${
                activeTab === "all"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              All Pools
            </button>
            <button
              onClick={() => setActiveTab("your")}
              className={`px-4 py-2 text-sm rounded-lg ${
                activeTab === "your"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Your Positions
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search pools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Pools Table */}
          {isLoadingPools || isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === "all" ? (
            filteredPools.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pools found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Pool</th>
                      <th className="text-left px-4 py-3 font-medium">TVL</th>
                      <th className="text-left px-4 py-3 font-medium">
                        Volume
                      </th>
                      <th className="text-left px-4 py-3 font-medium">
                        Fee Tier
                      </th>
                      <th className="text-right px-4 py-3 font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPools.map((pool: Pool) => (
                      <tr
                        key={pool.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={pool.token0.logoURI}
                              alt={pool.token0.symbol}
                              className="w-6 h-6 rounded-full"
                            />
                            <img
                              src={pool.token1.logoURI}
                              alt={pool.token1.symbol}
                              className="w-6 h-6 rounded-full -ml-2"
                            />
                            <span className="font-medium">
                              {pool.token0.symbol}/{pool.token1.symbol}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          $
                          {parseFloat(pool.totalValueLockedUSD).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 },
                          )}
                        </td>
                        <td className="px-4 py-3">
                          $
                          {parseFloat(pool.volumeUSD).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 0 },
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {(Number(pool.feeTier) / 10000).toFixed(2)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddLiquidity(pool)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add LP
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : userPositions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No positions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">
                      Position
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      Liquidity
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      Fee Tier
                    </th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userPositions.map((pos: any, index: number) => (
                    <tr
                      key={index}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              pos.token0?.logoURI ||
                              "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
                            }
                            alt={pos.token0?.symbol}
                            className="w-6 h-6 rounded-full"
                          />
                          <img
                            src={
                              pos.token1?.logoURI ||
                              "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png"
                            }
                            alt={pos.token1?.symbol}
                            className="w-6 h-6 rounded-full -ml-2"
                          />
                          <span className="font-medium">
                            {pos.token0?.symbol}/{pos.token1?.symbol}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {pos.liquidity
                          ? parseFloat(pos.liquidity).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 },
                            )
                          : "0"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {pos.fee
                            ? (Number(pos.fee) / 10000).toFixed(2)
                            : "0.00"}
                          %
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageLiquidity(pos)}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Selector Modal */}
      <TokenSelector
        open={tokenSelectorOpenFor !== null}
        onClose={() => setTokenSelectorOpenFor(null)}
        onSelect={(token) => {
          if (tokenSelectorOpenFor === "token0") {
            setTokenA(token);
          } else {
            setTokenB(token);
          }
          setTokenSelectorOpenFor(null);
        }}
        chainId={chainId}
      />
    </div>
  );
}

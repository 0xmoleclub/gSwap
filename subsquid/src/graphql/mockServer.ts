/**
 * Mock GraphQL server simulating Subsquid indexer
 * Serves the mock data via GraphQL queries
 */

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import {
  getAllTokens,
  getPoolByAddress,
  getTokenByAddress,
  getPoolsByToken,
  POOLS,
} from '../data/mockData.js';

const typeDefs = `#graphql
  type Token {
    id: ID!
    address: String!
    symbol: String!
    decimals: Int!
    name: String!
    totalPools: Int!
  }

  type Pool {
    id: ID!
    address: String!
    token0: Token!
    token1: Token!
    reserve0: String!
    reserve1: String!
    swapFee: Int!
    totalSupply: String!
    blockNumber: String!
    timestamp: String!
    # Computed
    price0: String!
    price1: String!
    liquidityUSD: String!
  }

  type GraphEdge {
    pool: Pool!
    tokenIn: Token!
    tokenOut: Token!
    rate: String!
    liquidity: String!
    fee: Int!
  }

  type GraphNode {
    token: Token!
    edges: [GraphEdge!]!
  }

  type ArbitrageRoute {
    id: ID!
    tokens: [String!]!
    pools: [String!]!
    expectedProfit: String
    timestamp: String!
  }

  type Query {
    # Basic queries
    tokens: [Token!]!
    token(address: String!): Token
    pools: [Pool!]!
    pool(address: String!): Pool
    poolsByToken(token: String!): [Pool!]!
    
    # Graph queries for arbitrage
    graph: [GraphNode!]!
    graphEdges(token: String!): [GraphEdge!]!
    
    # Find cyclic arbitrage routes
    arbitrageRoutes(startToken: String!, maxHops: Int = 4): [[String!]!]!
    
    # Calculate potential profit for a specific route
    calculateRouteProfit(
      route: [String!]!
      amountIn: String!
    ): RouteProfitResult!
  }

  type RouteProfitResult {
    route: [String!]!
    amountIn: String!
    amountOut: String!
    profit: String!
    profitPercent: String!
    gasEstimate: String!
    viable: Boolean!
  }
`;

// Helper to calculate price from reserves
function calculatePrice(reserve0: bigint, reserve1: bigint, decimals0: number, decimals1: number): number {
  if (reserve0 === 0n) return 0;
  const r0 = Number(reserve0) / 10 ** decimals0;
  const r1 = Number(reserve1) / 10 ** decimals1;
  return r1 / r0;
}

// Helper to calculate output amount with fee
function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  swapFee: number
): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  
  const amountInWithFee = amountIn * BigInt(10000 - swapFee);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000n + amountInWithFee;
  return numerator / denominator;
}

const resolvers = {
  Query: {
    tokens: () => getAllTokens().map(t => ({ 
      ...t, 
      id: t.address,
      totalPools: getPoolsByToken(t.address).length 
    })),
    
    token: (_: any, { address }: { address: string }) => 
      getTokenByAddress(address),
    
    pools: () => POOLS.map(poolToGraphQL),
    
    pool: (_: any, { address }: { address: string }) => {
      const pool = getPoolByAddress(address);
      return pool ? poolToGraphQL(pool) : null;
    },
    
    poolsByToken: (_: any, { token }: { token: string }) =>
      getPoolsByToken(token).map(poolToGraphQL),
    
    // Build complete graph from pools
    graph: () => {
      const tokenEdges = new Map<string, any[]>();
      
      for (const pool of POOLS) {
        const price0 = calculatePrice(pool.reserve0, pool.reserve1, pool.token0.decimals, pool.token1.decimals);
        const price1 = calculatePrice(pool.reserve1, pool.reserve0, pool.token1.decimals, pool.token0.decimals);
        const liquidity = pool.reserve0 + pool.reserve1;
        
        // Edge: token0 -> token1
        const edges0 = tokenEdges.get(pool.token0.address) || [];
        edges0.push({
          pool: poolToGraphQL(pool),
          tokenIn: pool.token0,
          tokenOut: pool.token1,
          rate: price0.toString(),
          liquidity: liquidity.toString(),
          fee: pool.swapFee,
        });
        tokenEdges.set(pool.token0.address, edges0);
        
        // Edge: token1 -> token0
        const edges1 = tokenEdges.get(pool.token1.address) || [];
        edges1.push({
          pool: poolToGraphQL(pool),
          tokenIn: pool.token1,
          tokenOut: pool.token0,
          rate: price1.toString(),
          liquidity: liquidity.toString(),
          fee: pool.swapFee,
        });
        tokenEdges.set(pool.token1.address, edges1);
      }
      
      const nodes = [];
      for (const [tokenAddr, edges] of tokenEdges) {
        const token = getTokenByAddress(tokenAddr);
        if (token) {
          nodes.push({ token, edges });
        }
      }
      return nodes;
    },
    
    graphEdges: (_: any, { token }: { token: string }) => {
      const pools = getPoolsByToken(token);
      const edges = [];
      
      for (const pool of pools) {
        const isToken0 = pool.token0.address.toLowerCase() === token.toLowerCase();
        const tokenIn = isToken0 ? pool.token0 : pool.token1;
        const tokenOut = isToken0 ? pool.token1 : pool.token0;
        const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
        const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;
        const price = calculatePrice(reserveIn, reserveOut, tokenIn.decimals, tokenOut.decimals);
        
        edges.push({
          pool: poolToGraphQL(pool),
          tokenIn,
          tokenOut,
          rate: price.toString(),
          liquidity: (reserveIn + reserveOut).toString(),
          fee: pool.swapFee,
        });
      }
      return edges;
    },
    
    // Find cyclic arbitrage routes using DFS
    arbitrageRoutes: (_: any, { startToken, maxHops }: { startToken: string, maxHops: number }) => {
      const start = startToken.toLowerCase();
      const adj = new Map<string, string[]>();
      
      // Build adjacency list
      for (const pool of POOLS) {
        const t0 = pool.token0.address.toLowerCase();
        const t1 = pool.token1.address.toLowerCase();
        
        if (!adj.has(t0)) adj.set(t0, []);
        if (!adj.has(t1)) adj.set(t1, []);
        
        adj.get(t0)!.push(t1);
        adj.get(t1)!.push(t0);
      }
      
      // DFS to find cycles
      const routes: string[][] = [];
      const visited = new Set<string>();
      
      function dfs(current: string, path: string[], depth: number) {
        if (depth > maxHops) return;
        
        // Found a cycle back to start (min 3 hops for triangle arbitrage)
        if (depth > 2 && current === start) {
          routes.push([...path]);
          return;
        }
        
        const neighbors = adj.get(current) || [];
        for (const next of neighbors) {
          // Avoid immediate backtrack and revisiting non-start nodes
          if (next !== start && visited.has(next)) continue;
          
          visited.add(next);
          path.push(next);
          dfs(next, path, depth + 1);
          path.pop();
          visited.delete(next);
        }
      }
      
      dfs(start, [start], 1);
      return routes;
    },
    
    // Calculate profit for a specific route
    calculateRouteProfit: (_: any, { route, amountIn }: { route: string[], amountIn: string }) => {
      const startToken = route[0];
      let currentAmount = BigInt(amountIn);
      let currentToken = startToken;
      const poolsUsed: string[] = [];
      
      // Simulate swaps through the route
      for (let i = 1; i < route.length; i++) {
        const nextToken = route[i];
        
        // Find pool for this pair
        const pool = POOLS.find(p => 
          (p.token0.address.toLowerCase() === currentToken.toLowerCase() && 
           p.token1.address.toLowerCase() === nextToken.toLowerCase()) ||
          (p.token1.address.toLowerCase() === currentToken.toLowerCase() && 
           p.token0.address.toLowerCase() === nextToken.toLowerCase())
        );
        
        if (!pool) {
          return {
            route,
            amountIn,
            amountOut: '0',
            profit: '0',
            profitPercent: '0',
            gasEstimate: '0',
            viable: false,
          };
        }
        
        poolsUsed.push(pool.address);
        
        // Determine swap direction
        const isToken0In = pool.token0.address.toLowerCase() === currentToken.toLowerCase();
        const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
        const reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;
        
        // Calculate output
        currentAmount = getAmountOut(currentAmount, reserveIn, reserveOut, pool.swapFee);
        currentToken = nextToken;
      }
      
      const amountOut = currentAmount;
      const amountInBig = BigInt(amountIn);
      const profit = amountOut > amountInBig ? amountOut - amountInBig : 0n;
      const profitPercent = amountInBig > 0n 
        ? (Number(profit) / Number(amountInBig) * 100).toFixed(4)
        : '0';
      
      // Estimate gas (simplified: ~150k per swap)
      const gasEstimate = (poolsUsed.length * 150000).toString();
      
      return {
        route,
        amountIn,
        amountOut: amountOut.toString(),
        profit: profit.toString(),
        profitPercent: `${profitPercent}%`,
        gasEstimate,
        viable: amountOut > amountInBig,
      };
    },
  },
};

// Helper to convert Pool to GraphQL format
function poolToGraphQL(pool: typeof POOLS[0]) {
  const price0 = calculatePrice(pool.reserve0, pool.reserve1, pool.token0.decimals, pool.token1.decimals);
  const price1 = calculatePrice(pool.reserve1, pool.reserve0, pool.token1.decimals, pool.token0.decimals);
  
  // Simplified USD liquidity estimation (assume USDC/DAI = $1, ETH = $2000, BTC = $40000)
  const ethPrice = 2000;
  const btcPrice = 40000;
  let liquidityUSD = 0;
  
  if (pool.token0.symbol === 'WETH') liquidityUSD += Number(pool.reserve0) / 1e18 * ethPrice;
  if (pool.token0.symbol === 'WBTC') liquidityUSD += Number(pool.reserve0) / 1e8 * btcPrice;
  if (pool.token0.symbol === 'USDC') liquidityUSD += Number(pool.reserve0) / 1e6;
  if (pool.token0.symbol === 'DAI') liquidityUSD += Number(pool.reserve0) / 1e18;
  
  if (pool.token1.symbol === 'WETH') liquidityUSD += Number(pool.reserve1) / 1e18 * ethPrice;
  if (pool.token1.symbol === 'WBTC') liquidityUSD += Number(pool.reserve1) / 1e8 * btcPrice;
  if (pool.token1.symbol === 'USDC') liquidityUSD += Number(pool.reserve1) / 1e6;
  if (pool.token1.symbol === 'DAI') liquidityUSD += Number(pool.reserve1) / 1e18;
  
  return {
    id: pool.address,
    address: pool.address,
    token0: { ...pool.token0, id: pool.token0.address },
    token1: { ...pool.token1, id: pool.token1.address },
    reserve0: pool.reserve0.toString(),
    reserve1: pool.reserve1.toString(),
    swapFee: pool.swapFee,
    totalSupply: pool.totalSupply.toString(),
    blockNumber: pool.blockNumber.toString(),
    timestamp: pool.timestamp.toISOString(),
    price0: price0.toString(),
    price1: price1.toString(),
    liquidityUSD: liquidityUSD.toFixed(2),
  };
}

export async function startMockGraphQLServer(port = 4000): Promise<{ server: ApolloServer; url: string }> {
  const server = new ApolloServer({ typeDefs, resolvers });
  
  try {
    const { url } = await startStandaloneServer(server, { listen: { port } });
    console.log(`🚀 Mock GraphQL server ready at ${url}`);
    return { server, url };
  } catch (err: any) {
    // Enhance error with port info for better handling upstream
    if (err.code === 'EADDRINUSE') {
      err.message = `Port ${port} is already in use`;
    }
    throw err;
  }
}

// Export for programmatic use
export { typeDefs, resolvers };

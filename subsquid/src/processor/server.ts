// GraphQL server with custom resolvers for arbitrage
// Works with simplified state-only schema (no historical events)

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { DataSource } from 'typeorm';
import { Pool, Token } from '../model/index.js';

const typeDefs = `#graphql
  type Token {
    id: ID!
    address: String!
    symbol: String
    name: String
    decimals: Int
    totalPools: Int!
    pools0: [Pool!]!
    pools1: [Pool!]!
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
    updatedAt: String!
    createdAt: String!
    volumeToken0: String!
    volumeToken1: String!
    txCount: Int!
    # Computed fields
    price0: String
    price1: String
    liquidityUSD: String
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

  type RouteProfitResult {
    route: [String!]!
    amountIn: String!
    amountOut: String!
    profit: String!
    profitPercent: String!
    gasEstimate: String!
    viable: Boolean!
  }

  type Query {
    tokens: [Token!]!
    token(address: String!): Token
    pools: [Pool!]!
    pool(address: String!): Pool
    poolsByToken(token: String!): [Pool!]!
    
    # Graph queries for arbitrage
    graph: [GraphNode!]!
    graphEdges(token: String!): [GraphEdge!]!
    arbitrageRoutes(startToken: String!, maxHops: Int = 4): [[String!]!]!
    calculateRouteProfit(route: [String!]!, amountIn: String!): RouteProfitResult!
  }
`;

export async function createServer(dataSource: DataSource) {
  const poolRepo = dataSource.getRepository(Pool);
  const tokenRepo = dataSource.getRepository(Token);

  // Helper to calculate price from reserves
  const getPrice = (pool: Pool, direction: 0 | 1) => {
    if (direction === 0) {
      // price of token0 in terms of token1
      return pool.reserve0 > 0n 
        ? (Number(pool.reserve1) / Number(pool.reserve0)).toString()
        : '0';
    } else {
      // price of token1 in terms of token0
      return pool.reserve1 > 0n
        ? (Number(pool.reserve0) / Number(pool.reserve1)).toString()
        : '0';
    }
  };

  const resolvers = {
    Query: {
      tokens: () => tokenRepo.find(),
      token: (_: any, { address }: { address: string }) => 
        tokenRepo.findOne({ where: { address: address.toLowerCase() } }),
      
      pools: () => poolRepo.find({ relations: ['token0', 'token1'] }),
      pool: (_: any, { address }: { address: string }) => 
        poolRepo.findOne({ 
          where: { address: address.toLowerCase() },
          relations: ['token0', 'token1']
        }),
      poolsByToken: async (_: any, { token }: { token: string }) => {
        const addr = token.toLowerCase();
        return poolRepo.find({
          where: [
            { token0: { address: addr } },
            { token1: { address: addr } }
          ],
          relations: ['token0', 'token1']
        });
      },

      // Build graph from current pools
      graph: async () => {
        const pools = await poolRepo.find({ relations: ['token0', 'token1'] });
        const tokenEdges = new Map<string, any[]>();

        for (const pool of pools) {
          const liquidity = (pool.reserve0 + pool.reserve1).toString();
          
          // Edge: token0 -> token1
          const edges0 = tokenEdges.get(pool.token0.address) || [];
          edges0.push({
            pool,
            tokenIn: pool.token0,
            tokenOut: pool.token1,
            rate: getPrice(pool, 0),
            liquidity,
            fee: pool.swapFee
          });
          tokenEdges.set(pool.token0.address, edges0);

          // Edge: token1 -> token0
          const edges1 = tokenEdges.get(pool.token1.address) || [];
          edges1.push({
            pool,
            tokenIn: pool.token1,
            tokenOut: pool.token0,
            rate: getPrice(pool, 1),
            liquidity,
            fee: pool.swapFee
          });
          tokenEdges.set(pool.token1.address, edges1);
        }

        const nodes = [];
        for (const [tokenAddr, edges] of tokenEdges) {
          const token = await tokenRepo.findOne({ where: { address: tokenAddr } });
          if (token) {
            nodes.push({ token, edges });
          }
        }
        return nodes;
      },

      graphEdges: async (_: any, { token }: { token: string }) => {
        const pools = await poolRepo.find({
          where: [
            { token0: { address: token.toLowerCase() } },
            { token1: { address: token.toLowerCase() } }
          ],
          relations: ['token0', 'token1']
        });

        const edges = [];
        for (const pool of pools) {
          const liquidity = (pool.reserve0 + pool.reserve1).toString();
          
          if (pool.token0.address === token.toLowerCase()) {
            edges.push({
              pool,
              tokenIn: pool.token0,
              tokenOut: pool.token1,
              rate: getPrice(pool, 0),
              liquidity,
              fee: pool.swapFee
            });
          } else {
            edges.push({
              pool,
              tokenIn: pool.token1,
              tokenOut: pool.token0,
              rate: getPrice(pool, 1),
              liquidity,
              fee: pool.swapFee
            });
          }
        }
        return edges;
      },

      // Find cyclic arbitrage routes
      arbitrageRoutes: async (_: any, { startToken, maxHops }: { startToken: string, maxHops: number }) => {
        const pools = await poolRepo.find({ relations: ['token0', 'token1'] });
        
        // Build adjacency list
        const adj = new Map<string, string[]>();
        for (const pool of pools) {
          const t0 = pool.token0.address;
          const t1 = pool.token1.address;
          
          if (!adj.has(t0)) adj.set(t0, []);
          if (!adj.has(t1)) adj.set(t1, []);
          
          adj.get(t0)!.push(t1);
          adj.get(t1)!.push(t0);
        }

        // DFS to find cycles
        const routes: string[][] = [];

        function dfs(current: string, path: string[], visited: Set<string>, depth: number) {
          if (depth > maxHops) return;

          if (depth > 2 && current === startToken.toLowerCase()) {
            routes.push([...path]);
            return;
          }

          const neighbors = adj.get(current) || [];
          for (const next of neighbors) {
            if (visited.has(next)) continue;
            
            visited.add(next);
            path.push(next);
            dfs(next, path, visited, depth + 1);
            path.pop();
            visited.delete(next);
          }
        }

        const visited = new Set<string>();
        visited.add(startToken.toLowerCase());
        dfs(startToken.toLowerCase(), [startToken.toLowerCase()], visited, 1);
        return routes;
      },

      // Calculate profit for a given route
      calculateRouteProfit: async (_: any, { route, amountIn }: { route: string[], amountIn: string }) => {
        let currentAmount = BigInt(amountIn);
        const amountInBigInt = currentAmount;
        
        try {
          for (let i = 0; i < route.length - 1; i++) {
            const tokenIn = route[i].toLowerCase();
            const tokenOut = route[i + 1].toLowerCase();
            
            // Find pool for this pair
            const pool = await poolRepo.findOne({
              where: [
                { token0: { address: tokenIn }, token1: { address: tokenOut } },
                { token1: { address: tokenIn }, token0: { address: tokenOut } }
              ],
              relations: ['token0', 'token1']
            });
            
            if (!pool) {
              return {
                route,
                amountIn,
                amountOut: '0',
                profit: '0',
                profitPercent: '0',
                gasEstimate: '0',
                viable: false
              };
            }
            
            // Calculate swap output (x * y = k, 0.3% fee)
            const isToken0In = pool.token0.address === tokenIn;
            const reserveIn = isToken0In ? pool.reserve0 : pool.reserve1;
            const reserveOut = isToken0In ? pool.reserve1 : pool.reserve0;
            
            if (reserveIn === 0n || reserveOut === 0n) {
              return {
                route,
                amountIn,
                amountOut: '0',
                profit: '0',
                profitPercent: '0',
                gasEstimate: '0',
                viable: false
              };
            }
            
            // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
            const amountInWithFee = currentAmount * 997n;
            const numerator = amountInWithFee * reserveOut;
            const denominator = (reserveIn * 1000n) + amountInWithFee;
            currentAmount = numerator / denominator;
          }
          
          const profit = currentAmount - amountInBigInt;
          const profitPercent = amountInBigInt > 0n 
            ? ((Number(profit) / Number(amountInBigInt)) * 100).toFixed(4)
            : '0';
          
          // Gas estimate: ~150k per swap
          const gasEstimate = (150000 * (route.length - 1)).toString();
          
          return {
            route,
            amountIn,
            amountOut: currentAmount.toString(),
            profit: profit.toString(),
            profitPercent,
            gasEstimate,
            viable: profit > 0n
          };
        } catch (error) {
          return {
            route,
            amountIn,
            amountOut: '0',
            profit: '0',
            profitPercent: '0',
            gasEstimate: '0',
            viable: false
          };
        }
      }
    },

    Pool: {
      reserve0: (pool: Pool) => pool.reserve0.toString(),
      reserve1: (pool: Pool) => pool.reserve1.toString(),
      totalSupply: (pool: Pool) => pool.totalSupply.toString(),
      blockNumber: (pool: Pool) => pool.blockNumber.toString(),
      timestamp: (pool: Pool) => pool.timestamp.toISOString(),
      updatedAt: (pool: Pool) => pool.updatedAt.toISOString(),
      createdAt: (pool: Pool) => pool.createdAt.toISOString(),
      volumeToken0: (pool: Pool) => pool.volumeToken0.toString(),
      volumeToken1: (pool: Pool) => pool.volumeToken1.toString(),
      price0: (pool: Pool) => getPrice(pool, 0),
      price1: (pool: Pool) => getPrice(pool, 1),
      liquidityUSD: (pool: Pool) => '0', // Would need price oracle
    }
  };

  const server = new ApolloServer({ typeDefs, resolvers });
  
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀 GraphQL server ready at ${url}`);
  return server;
}

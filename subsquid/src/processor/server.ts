// GraphQL server with custom resolvers for arbitrage

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { DataSource } from 'typeorm';
import { Pool, Token, Sync } from '../model/index.js';

const typeDefs = `#graphql
  type Token {
    id: ID!
    address: String!
    symbol: String
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
    blockNumber: String!
    timestamp: String!
    reserveUSD: String
  }

  type GraphEdge {
    pool: Pool!
    tokenIn: Token!
    tokenOut: Token!
    rate: String!
    liquidity: String!
  }

  type GraphNode {
    token: Token!
    edges: [GraphEdge!]!
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
  }
`;

export async function createServer(dataSource: DataSource) {
  const poolRepo = dataSource.getRepository(Pool);
  const tokenRepo = dataSource.getRepository(Token);
  const syncRepo = dataSource.getRepository(Sync);

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
          // Edge: token0 -> token1
          const edges0 = tokenEdges.get(pool.token0.address) || [];
          edges0.push({
            pool,
            tokenIn: pool.token0,
            tokenOut: pool.token1,
            rate: pool.reserve0 > 0n ? Number(pool.reserve1) / Number(pool.reserve0) : 0,
            liquidity: (pool.reserve0 + pool.reserve1).toString()
          });
          tokenEdges.set(pool.token0.address, edges0);

          // Edge: token1 -> token0
          const edges1 = tokenEdges.get(pool.token1.address) || [];
          edges1.push({
            pool,
            tokenIn: pool.token1,
            tokenOut: pool.token0,
            rate: pool.reserve1 > 0n ? Number(pool.reserve0) / Number(pool.reserve1) : 0,
            liquidity: (pool.reserve0 + pool.reserve1).toString()
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
          if (pool.token0.address === token.toLowerCase()) {
            edges.push({
              pool,
              tokenIn: pool.token0,
              tokenOut: pool.token1,
              rate: pool.reserve0 > 0n ? Number(pool.reserve1) / Number(pool.reserve0) : 0,
              liquidity: (pool.reserve0 + pool.reserve1).toString()
            });
          } else {
            edges.push({
              pool,
              tokenIn: pool.token1,
              tokenOut: pool.token0,
              rate: pool.reserve1 > 0n ? Number(pool.reserve0) / Number(pool.reserve1) : 0,
              liquidity: (pool.reserve0 + pool.reserve1).toString()
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
        const visited = new Set<string>();

        function dfs(current: string, path: string[], depth: number) {
          if (depth > maxHops) return;

          if (depth > 2 && current === startToken.toLowerCase()) {
            routes.push([...path]);
            return;
          }

          const neighbors = adj.get(current) || [];
          for (const next of neighbors) {
            if (next !== startToken.toLowerCase() && visited.has(next)) continue;
            
            visited.add(next);
            path.push(next);
            dfs(next, path, depth + 1);
            path.pop();
            visited.delete(next);
          }
        }

        dfs(startToken.toLowerCase(), [startToken.toLowerCase()], 1);
        return routes;
      }
    },

    Pool: {
      reserve0: (pool: Pool) => pool.reserve0.toString(),
      reserve1: (pool: Pool) => pool.reserve1.toString(),
      blockNumber: (pool: Pool) => pool.blockNumber.toString(),
      timestamp: (pool: Pool) => pool.timestamp.toISOString(),
    }
  };

  const server = new ApolloServer({ typeDefs, resolvers });
  
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀 GraphQL server ready at ${url}`);
  return server;
}

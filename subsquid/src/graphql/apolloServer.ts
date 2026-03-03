/**
 * Real Apollo GraphQL server backed by PostgreSQL
 * Serves live chain data seeded from Blockscout
 */

import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME || 'gswap',
});

const typeDefs = `#graphql
  type Token {
    id: ID!
    address: String!
    symbol: String
    name: String
    decimals: Int
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
    updatedAt: String!
    createdAt: String!
    volumeToken0: String!
    volumeToken1: String!
    txCount: Int!
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
    graph: [GraphNode!]!
    graphEdges(token: String!): [GraphEdge!]!
    arbitrageRoutes(startToken: String!, maxHops: Int = 4): [[String!]!]!
    calculateRouteProfit(route: [String!]!, amountIn: String!): RouteProfitResult!
  }
`;

// --- Helpers ---

async function getToken(id: string) {
  const { rows } = await pool.query('SELECT * FROM token WHERE id = $1', [id]);
  return rows[0] ? mapToken(rows[0]) : null;
}

function mapToken(row: any) {
  return {
    id: row.id,
    address: row.address,
    symbol: row.symbol,
    name: row.name,
    decimals: row.decimals,
    totalPools: row.total_pools,
  };
}

function calculatePrice(reserve0: bigint, reserve1: bigint, decimals0: number, decimals1: number): number {
  if (reserve0 === 0n) return 0;
  return (Number(reserve1) / 10 ** decimals1) / (Number(reserve0) / 10 ** decimals0);
}

async function mapPool(row: any) {
  const token0 = await getToken(row.token0_id);
  const token1 = await getToken(row.token1_id);
  const r0 = BigInt(row.reserve0 || '0');
  const r1 = BigInt(row.reserve1 || '0');
  const d0 = token0?.decimals ?? 18;
  const d1 = token1?.decimals ?? 18;
  const price0 = calculatePrice(r0, r1, d0, d1);
  const price1 = calculatePrice(r1, r0, d1, d0);

  return {
    id: row.id,
    address: row.address,
    token0,
    token1,
    reserve0: row.reserve0?.toString() || '0',
    reserve1: row.reserve1?.toString() || '0',
    swapFee: row.swap_fee,
    totalSupply: row.total_supply?.toString() || '0',
    blockNumber: row.block_number?.toString() || '0',
    timestamp: row.timestamp?.toISOString?.() || new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString?.() || new Date().toISOString(),
    createdAt: row.created_at?.toISOString?.() || new Date().toISOString(),
    volumeToken0: row.volume_token0?.toString() || '0',
    volumeToken1: row.volume_token1?.toString() || '0',
    txCount: row.tx_count || 0,
    price0: price0.toString(),
    price1: price1.toString(),
    liquidityUSD: '0',
  };
}

function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, swapFee: number): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const amountInWithFee = amountIn * BigInt(10000 - swapFee);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000n + amountInWithFee;
  return numerator / denominator;
}

const resolvers = {
  Query: {
    tokens: async () => {
      const { rows } = await pool.query('SELECT * FROM token ORDER BY total_pools DESC');
      return rows.map(mapToken);
    },

    token: async (_: any, { address }: { address: string }) => {
      const { rows } = await pool.query('SELECT * FROM token WHERE address = $1', [address.toLowerCase()]);
      return rows[0] ? mapToken(rows[0]) : null;
    },

    pools: async () => {
      const { rows } = await pool.query('SELECT * FROM pool ORDER BY block_number DESC');
      return Promise.all(rows.map(mapPool));
    },

    pool: async (_: any, { address }: { address: string }) => {
      const { rows } = await pool.query('SELECT * FROM pool WHERE address = $1', [address.toLowerCase()]);
      return rows[0] ? mapPool(rows[0]) : null;
    },

    poolsByToken: async (_: any, { token }: { token: string }) => {
      const addr = token.toLowerCase();
      const { rows } = await pool.query(
        'SELECT * FROM pool WHERE token0_id = $1 OR token1_id = $1',
        [addr]
      );
      return Promise.all(rows.map(mapPool));
    },

    graph: async () => {
      const { rows: pools } = await pool.query('SELECT * FROM pool');
      const tokenEdges = new Map<string, any[]>();

      for (const p of pools) {
        const mapped = await mapPool(p);
        const token0 = mapped.token0;
        const token1 = mapped.token1;
        if (!token0 || !token1) continue;

        const r0 = BigInt(p.reserve0 || '0');
        const r1 = BigInt(p.reserve1 || '0');
        const price0 = calculatePrice(r0, r1, token0.decimals ?? 18, token1.decimals ?? 18);
        const price1 = calculatePrice(r1, r0, token1.decimals ?? 18, token0.decimals ?? 18);
        const liquidity = (r0 + r1).toString();

        const edges0 = tokenEdges.get(token0.address) || [];
        edges0.push({ pool: mapped, tokenIn: token0, tokenOut: token1, rate: price0.toString(), liquidity, fee: p.swap_fee });
        tokenEdges.set(token0.address, edges0);

        const edges1 = tokenEdges.get(token1.address) || [];
        edges1.push({ pool: mapped, tokenIn: token1, tokenOut: token0, rate: price1.toString(), liquidity, fee: p.swap_fee });
        tokenEdges.set(token1.address, edges1);
      }

      const nodes = [];
      for (const [addr, edges] of tokenEdges) {
        const token = await getToken(addr);
        if (token) nodes.push({ token, edges });
      }
      return nodes;
    },

    graphEdges: async (_: any, { token }: { token: string }) => {
      const addr = token.toLowerCase();
      const { rows: pools } = await pool.query(
        'SELECT * FROM pool WHERE token0_id = $1 OR token1_id = $1',
        [addr]
      );
      const edges = [];
      for (const p of pools) {
        const mapped = await mapPool(p);
        const isToken0 = p.token0_id === addr;
        edges.push({
          pool: mapped,
          tokenIn: isToken0 ? mapped.token0 : mapped.token1,
          tokenOut: isToken0 ? mapped.token1 : mapped.token0,
          rate: isToken0 ? mapped.price0 : mapped.price1,
          liquidity: (BigInt(p.reserve0 || '0') + BigInt(p.reserve1 || '0')).toString(),
          fee: p.swap_fee,
        });
      }
      return edges;
    },

    arbitrageRoutes: async (_: any, { startToken, maxHops }: { startToken: string; maxHops: number }) => {
      const start = startToken.toLowerCase();
      const { rows: pools } = await pool.query('SELECT * FROM pool');
      const adj = new Map<string, string[]>();

      for (const p of pools) {
        const t0 = p.token0_id;
        const t1 = p.token1_id;
        if (!adj.has(t0)) adj.set(t0, []);
        if (!adj.has(t1)) adj.set(t1, []);
        adj.get(t0)!.push(t1);
        adj.get(t1)!.push(t0);
      }

      const routes: string[][] = [];
      const visited = new Set<string>();

      function dfs(current: string, path: string[], depth: number) {
        if (depth > maxHops) return;
        if (depth > 2 && current === start) {
          routes.push([...path]);
          return;
        }
        const neighbors = adj.get(current) || [];
        for (const next of neighbors) {
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

    calculateRouteProfit: async (_: any, { route, amountIn }: { route: string[]; amountIn: string }) => {
      const { rows: allPools } = await pool.query('SELECT * FROM pool');
      let currentAmount = BigInt(amountIn);
      let currentToken = route[0];

      for (let i = 1; i < route.length; i++) {
        const nextToken = route[i];
        const p = allPools.find(
          (p: any) =>
            (p.token0_id === currentToken && p.token1_id === nextToken) ||
            (p.token1_id === currentToken && p.token0_id === nextToken)
        );
        if (!p) {
          return { route, amountIn, amountOut: '0', profit: '0', profitPercent: '0', gasEstimate: '0', viable: false };
        }
        const isToken0In = p.token0_id === currentToken;
        const reserveIn = BigInt(isToken0In ? p.reserve0 : p.reserve1);
        const reserveOut = BigInt(isToken0In ? p.reserve1 : p.reserve0);
        currentAmount = getAmountOut(currentAmount, reserveIn, reserveOut, p.swap_fee);
        currentToken = nextToken;
      }

      const amountInBig = BigInt(amountIn);
      const profit = currentAmount > amountInBig ? currentAmount - amountInBig : 0n;
      const profitPercent = amountInBig > 0n ? (Number(profit) / Number(amountInBig) * 100).toFixed(4) : '0';
      const gasEstimate = ((route.length - 1) * 150000).toString();

      return {
        route,
        amountIn,
        amountOut: currentAmount.toString(),
        profit: profit.toString(),
        profitPercent: `${profitPercent}%`,
        gasEstimate,
        viable: currentAmount > amountInBig,
      };
    },
  },
};

async function startApolloServer(port = 4000) {
  const server = new ApolloServer({ typeDefs, resolvers });
  const { url } = await startStandaloneServer(server, { listen: { port } });
  console.log(`🚀 Apollo GraphQL server ready at ${url}`);
  console.log(`   Backed by PostgreSQL at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
  return { server, url };
}

// Standalone entry point
startApolloServer(4000).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import { useEffect, useState } from 'react';
import { Token, Pool, IndexerStats } from '@/types/token';
import { fetchGraphQL } from '@/lib/graphql';

// ------------------------------------------------------------------
// GraphQL query — fetches everything we need in a single round-trip
// ------------------------------------------------------------------

const POOL_GRAPH_QUERY = `
  query GetPoolGraph {
    tokens {
      id
      address
      symbol
      name
      decimals
      totalPools
    }
    pools {
      id
      address
      token0 { id address symbol name decimals totalPools }
      token1 { id address symbol name decimals totalPools }
      reserve0
      reserve1
      swapFee
      totalSupply
      volumeToken0
      volumeToken1
      txCount
      price0
      price1
    }
  }
`;

// ------------------------------------------------------------------
// Indexer response types (matching the GraphQL schema)
// ------------------------------------------------------------------

interface IndexerToken {
  id: string;
  address: string;
  symbol: string | null;
  name: string | null;
  decimals: number | null;
  totalPools: number;
}

interface IndexerPool {
  id: string;
  address: string;
  token0: IndexerToken;
  token1: IndexerToken;
  reserve0: string;
  reserve1: string;
  swapFee: number;
  totalSupply: string;
  volumeToken0: string;
  volumeToken1: string;
  txCount: number;
  price0: string | null;
  price1: string | null;
}

interface QueryResult {
  tokens: IndexerToken[];
  pools: IndexerPool[];
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Deterministic color from an Ethereum address. */
function addressToColor(address: string): number {
  const hex = address.slice(2, 8); // first 3 bytes after 0x
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);

  // Ensure minimum brightness so nodes are visible on black background
  const brightness = (r + g + b) / 3;
  if (brightness < 100) {
    r = Math.min(r + 100, 255);
    g = Math.min(g + 100, 255);
    b = Math.min(b + 100, 255);
  }

  return (r << 16) | (g << 8) | b;
}

/** Short display name for a token. */
function tokenLabel(t: IndexerToken): string {
  return t.symbol || t.name || `${t.address.slice(0, 6)}..${t.address.slice(-4)}`;
}

/** Format a large number into a human-readable string. */
function formatValue(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value > 0) return value.toFixed(6);
  return '0';
}

/** Compute the total reserve of a token across all pools it participates in. */
function computeTokenTVL(
  token: IndexerToken,
  pools: IndexerPool[]
): string {
  let totalReserve = BigInt(0);
  for (const pool of pools) {
    if (pool.token0.id === token.id) totalReserve += BigInt(pool.reserve0);
    if (pool.token1.id === token.id) totalReserve += BigInt(pool.reserve1);
  }
  const decimals = token.decimals ?? 18;
  const formatted = Number(totalReserve) / 10 ** decimals;
  return formatValue(formatted);
}

/** Derive a price for the token from the first pool it appears in. */
function computeTokenPrice(
  token: IndexerToken,
  pools: IndexerPool[]
): string {
  const pool = pools.find(
    (p) => p.token0.id === token.id || p.token1.id === token.id
  );
  if (!pool) return '0';
  const raw =
    pool.token0.id === token.id ? pool.price0 : pool.price1;
  const num = parseFloat(raw || '0');
  if (num === 0) return '0';
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(6);
}

// ------------------------------------------------------------------
// Transform indexer data → client types
// ------------------------------------------------------------------

function transformData(
  indexerTokens: IndexerToken[],
  indexerPools: IndexerPool[]
) {
  // Determine the "central" token — the one connected to the most pools.
  const centralToken = indexerTokens.reduce((a, b) =>
    a.totalPools >= b.totalPools ? a : b
  );

  // Map tokens. Ensure the central token is first (index 0 → placed at origin).
  const sorted = [
    centralToken,
    ...indexerTokens.filter((t) => t.id !== centralToken.id),
  ];

  const tokens: Token[] = sorted.map((t) => ({
    id: t.address,
    name: t.name || t.symbol || `${t.address.slice(0, 6)}..${t.address.slice(-4)}`,
    symbol: t.symbol || undefined,
    color:
      t.id === centralToken.id ? 0xe6007a : addressToColor(t.address),
    price: computeTokenPrice(t, indexerPools),
    tvl: computeTokenTVL(t, indexerPools),
    address: t.address,
    decimals: t.decimals ?? undefined,
    totalPools: t.totalPools,
  }));

  // Map pools.
  const pools: Pool[] = indexerPools.map((p) => ({
    source: p.token0.address,
    target: p.token1.address,
    sourceLabel: tokenLabel(p.token0),
    targetLabel: tokenLabel(p.token1),
    apy: (p.swapFee / 100).toFixed(1), // e.g. 30 → "0.3"
    type:
      p.token0.id === centralToken.id || p.token1.id === centralToken.id
        ? ('relay' as const)
        : ('xcm' as const),
  }));

  // Aggregate stats
  let totalTxCount = 0;
  let totalVolume = BigInt(0);
  for (const p of indexerPools) {
    totalTxCount += p.txCount;
    totalVolume += BigInt(p.volumeToken0) + BigInt(p.volumeToken1);
  }

  // Rough volume formatting — assume 18 decimals as fallback
  const avgDecimals = 18;
  const volumeFormatted = formatValue(
    Number(totalVolume) / 10 ** avgDecimals
  );

  const stats: IndexerStats = {
    totalPools: indexerPools.length,
    totalTokens: indexerTokens.length,
    totalTxCount,
    totalVolume: volumeFormatted,
  };

  return {
    tokens,
    pools,
    centralTokenId: centralToken.address,
    stats,
  };
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------

export interface IndexerData {
  tokens: Token[];
  pools: Pool[];
  centralTokenId: string;
  stats: IndexerStats;
}

export function useIndexerData() {
  const [data, setData] = useState<IndexerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchGraphQL<QueryResult>(POOL_GRAPH_QUERY)
      .then((result) => {
        if (cancelled) return;
        if (result.tokens.length === 0) {
          throw new Error('No tokens found in indexer');
        }
        setData(transformData(result.tokens, result.pools));
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[useIndexerData] Falling back to static data:', err.message);
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

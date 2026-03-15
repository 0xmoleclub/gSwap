export interface Token {
  id: string;
  name: string;
  symbol?: string;
  color: number;
  price: number | string;
  tvl: string;
  address?: string;
  decimals?: number;
  totalPools?: number;
}

export interface Pool {
  source: string;
  target: string;
  sourceLabel?: string;
  targetLabel?: string;
  apy: string;
  type: 'relay' | 'xcm';
}

export interface IndexerStats {
  totalPools: number;
  totalTokens: number;
  totalTxCount: number;
  totalVolume: string;
}

export interface GraphNode {
  token: Token;
  position: { x: number; y: number; z: number };
}

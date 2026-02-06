export interface Token {
  id: string;
  name: string;
  color: number;
  price: number | string;
  tvl: string;
}

export interface Pool {
  source: string;
  target: string;
  apy: string;
  type: 'relay' | 'xcm';
}

export interface GraphNode {
  token: Token;
  position: { x: number; y: number; z: number };
}

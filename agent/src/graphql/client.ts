/**
 * GraphQL client for querying the Subsquid indexer (or mock server)
 */

import { GraphQLClient, gql } from 'graphql-request';

export interface Token {
  id: string;
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  totalPools: number;
}

export interface Pool {
  id: string;
  address: string;
  token0: Token;
  token1: Token;
  reserve0: string;
  reserve1: string;
  swapFee: number;
  totalSupply: string;
  blockNumber: string;
  timestamp: string;
  updatedAt: string;
  createdAt: string;
  volumeToken0: string;
  volumeToken1: string;
  txCount: number;
  // Computed fields
  price0?: string;
  price1?: string;
  liquidityUSD?: string;
}

export interface GraphEdge {
  pool: Pool;
  tokenIn: Token;
  tokenOut: Token;
  rate: string;
  liquidity: string;
  fee: number;
}

export interface GraphNode {
  token: Token;
  edges: GraphEdge[];
}

export interface RouteProfitResult {
  route: string[];
  amountIn: string;
  amountOut: string;
  profit: string;
  profitPercent: string;
  gasEstimate: string;
  viable: boolean;
}

export class SubsquidClient {
  private client: GraphQLClient;

  constructor(endpoint: string = 'http://localhost:4000/graphql') {
    this.client = new GraphQLClient(endpoint, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getAllTokens(): Promise<Token[]> {
    const query = gql`
      query {
        tokens {
          id
          address
          symbol
          decimals
          name
          totalPools
        }
      }
    `;
    const data = await this.client.request<{ tokens: Token[] }>(query);
    return data.tokens;
  }

  async getAllPools(): Promise<Pool[]> {
    const query = gql`
      query {
        pools {
          id
          address
          token0 {
            id
            address
            symbol
            decimals
          }
          token1 {
            id
            address
            symbol
            decimals
          }
          reserve0
          reserve1
          swapFee
          totalSupply
          blockNumber
          timestamp
          updatedAt
          createdAt
          volumeToken0
          volumeToken1
          txCount
          price0
          price1
          liquidityUSD
        }
      }
    `;
    const data = await this.client.request<{ pools: Pool[] }>(query);
    return data.pools;
  }

  async getPool(address: string): Promise<Pool | null> {
    const query = gql`
      query($address: String!) {
        pool(address: $address) {
          id
          address
          token0 {
            id
            address
            symbol
            decimals
          }
          token1 {
            id
            address
            symbol
            decimals
          }
          reserve0
          reserve1
          swapFee
          totalSupply
          blockNumber
          timestamp
          updatedAt
          createdAt
          volumeToken0
          volumeToken1
          txCount
          price0
          price1
          liquidityUSD
        }
      }
    `;
    const data = await this.client.request<{ pool: Pool | null }>(query, { address });
    return data.pool;
  }

  async getPoolsByToken(token: string): Promise<Pool[]> {
    const query = gql`
      query($token: String!) {
        poolsByToken(token: $token) {
          id
          address
          token0 {
            id
            address
            symbol
            decimals
          }
          token1 {
            id
            address
            symbol
            decimals
          }
          reserve0
          reserve1
          swapFee
          totalSupply
          blockNumber
          timestamp
          updatedAt
          createdAt
          volumeToken0
          volumeToken1
          txCount
          price0
          price1
          liquidityUSD
        }
      }
    `;
    const data = await this.client.request<{ poolsByToken: Pool[] }>(query, { token });
    return data.poolsByToken;
  }

  async getGraph(): Promise<GraphNode[]> {
    const query = gql`
      query {
        graph {
          token {
            id
            address
            symbol
            decimals
            name
          }
          edges {
            pool {
              id
              address
              swapFee
            }
            tokenIn {
              id
              address
              symbol
              decimals
            }
            tokenOut {
              id
              address
              symbol
              decimals
            }
            rate
            liquidity
            fee
          }
        }
      }
    `;
    const data = await this.client.request<{ graph: GraphNode[] }>(query);
    return data.graph;
  }

  async getGraphEdges(token: string): Promise<GraphEdge[]> {
    const query = gql`
      query($token: String!) {
        graphEdges(token: $token) {
          pool {
            id
            address
            swapFee
          }
          tokenIn {
            id
            address
            symbol
            decimals
          }
          tokenOut {
            id
            address
            symbol
            decimals
          }
          rate
          liquidity
          fee
        }
      }
    `;
    const data = await this.client.request<{ graphEdges: GraphEdge[] }>(query, { token });
    return data.graphEdges;
  }

  async findArbitrageRoutes(startToken: string, maxHops: number = 4): Promise<string[][]> {
    const query = gql`
      query($startToken: String!, $maxHops: Int!) {
        arbitrageRoutes(startToken: $startToken, maxHops: $maxHops)
      }
    `;
    const data = await this.client.request<{ arbitrageRoutes: string[][] }>(query, {
      startToken,
      maxHops,
    });
    return data.arbitrageRoutes;
  }

  async calculateRouteProfit(route: string[], amountIn: string): Promise<RouteProfitResult> {
    const query = gql`
      query($route: [String!]!, $amountIn: String!) {
        calculateRouteProfit(route: $route, amountIn: $amountIn) {
          route
          amountIn
          amountOut
          profit
          profitPercent
          gasEstimate
          viable
        }
      }
    `;
    const data = await this.client.request<{ calculateRouteProfit: RouteProfitResult }>(query, {
      route,
      amountIn,
    });
    return data.calculateRouteProfit;
  }
}

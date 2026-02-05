/**
 * Mock data for gSwap Arbitrage Agent testing
 * Simulates a small DEX ecosystem with 4 tokens and 3 pools
 */

export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

export interface Pool {
  address: string;
  token0: Token;
  token1: Token;
  reserve0: bigint;  // in token0 decimals
  reserve1: bigint;  // in token1 decimals
  swapFee: number;   // basis points (30 = 0.3%)
  totalSupply: bigint;
  blockNumber: bigint;
  timestamp: Date;
}

export interface SwapEvent {
  id: string;
  pool: string;
  sender: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  blockNumber: bigint;
  timestamp: Date;
  transactionHash: string;
}

// Mock Tokens (simulating mainnet tokens on Polkadot Hub EVM)
export const TOKENS: Record<string, Token> = {
  WETH: {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped ETH',
  },
  USDC: {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
  },
  DAI: {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
  },
  WBTC: {
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    symbol: 'WBTC',
    decimals: 8,
    name: 'Wrapped BTC',
  },
};

// Helper to create reserves with proper decimals
const eth = (n: number) => BigInt(Math.floor(n * 1e18));
const usdc = (n: number) => BigInt(Math.floor(n * 1e6));
const dai = (n: number) => BigInt(Math.floor(n * 1e18));
const wbtc = (n: number) => BigInt(Math.floor(n * 1e8));

// Mock Pools with realistic reserves (creating arbitrage opportunities)
export const POOLS: Pool[] = [
  // Pool 1: WETH/USDC - Primary ETH liquidity
  {
    address: '0xpool1wethusdc',
    token0: TOKENS.WETH,
    token1: TOKENS.USDC,
    // Price: 1 ETH = 2000 USDC
    reserve0: eth(100),      // 100 WETH
    reserve1: usdc(200000),  // 200,000 USDC
    swapFee: 30,
    totalSupply: eth(1000),
    blockNumber: 1000n,
    timestamp: new Date('2026-02-05T10:00:00Z'),
  },
  // Pool 2: WETH/DAI - Significantly different price! (Arbitrage opportunity)
  {
    address: '0xpool2wethdai',
    token0: TOKENS.WETH,
    token1: TOKENS.DAI,
    // Price: 1 ETH = 2100 DAI (5% higher than Pool 1!)
    reserve0: eth(50),        // 50 WETH
    reserve1: dai(105000),    // 105,000 DAI
    swapFee: 30,
    totalSupply: eth(500),
    blockNumber: 1000n,
    timestamp: new Date('2026-02-05T10:00:00Z'),
  },
  // Pool 3: USDC/DAI - Stable pair with slight deviation
  {
    address: '0xpool3usdcdai',
    token0: TOKENS.USDC,
    token1: TOKENS.DAI,
    // Price: 1 USDC = 0.995 DAI (0.5% deviation)
    reserve0: usdc(500000),   // 500,000 USDC
    reserve1: dai(497500),    // 497,500 DAI
    swapFee: 30,
    totalSupply: eth(5000),
    blockNumber: 1000n,
    timestamp: new Date('2026-02-05T10:00:00Z'),
  },
  // Pool 4: WBTC/WETH - BTC/ETH pair
  {
    address: '0xpool4wbtcweth',
    token0: TOKENS.WBTC,
    token1: TOKENS.WETH,
    // Price: 1 BTC = 20 ETH
    reserve0: wbtc(10),       // 10 WBTC
    reserve1: eth(200),       // 200 WETH
    swapFee: 30,
    totalSupply: eth(200),
    blockNumber: 1000n,
    timestamp: new Date('2026-02-05T10:00:00Z'),
  },
];

// Mock recent swap events
export const RECENT_SWAPS: SwapEvent[] = [
  {
    id: 'swap1',
    pool: '0xpool1wethusdc',
    sender: '0xtrader1',
    tokenIn: TOKENS.WETH.address,
    tokenOut: TOKENS.USDC.address,
    amountIn: eth(1),
    amountOut: usdc(1980),
    fee: eth(0.003),
    blockNumber: 999n,
    timestamp: new Date('2026-02-05T09:55:00Z'),
    transactionHash: '0xtx1',
  },
  {
    id: 'swap2',
    pool: '0xpool2wethdai',
    sender: '0xtrader2',
    tokenIn: TOKENS.DAI.address,
    tokenOut: TOKENS.WETH.address,
    amountIn: dai(5000),
    amountOut: eth(2.47),
    fee: dai(1.5),
    blockNumber: 998n,
    timestamp: new Date('2026-02-05T09:50:00Z'),
    transactionHash: '0xtx2',
  },
];

// Factory info
export const FACTORY = {
  address: '0xfactoryaddress',
  poolCount: POOLS.length,
  totalVolumeUSD: 1000000n,
  totalFeesUSD: 3000n,
};

// Helper functions
export function getPoolByAddress(address: string): Pool | undefined {
  return POOLS.find(p => p.address.toLowerCase() === address.toLowerCase());
}

export function getTokenByAddress(address: string): Token | undefined {
  return Object.values(TOKENS).find(t => t.address.toLowerCase() === address.toLowerCase());
}

export function getPoolsByToken(tokenAddress: string): Pool[] {
  const addr = tokenAddress.toLowerCase();
  return POOLS.filter(p => 
    p.token0.address.toLowerCase() === addr || 
    p.token1.address.toLowerCase() === addr
  );
}

export function getAllTokens(): Token[] {
  return Object.values(TOKENS);
}

export function getAllPools(): Pool[] {
  return POOLS;
}

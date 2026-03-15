// Token addresses from latest deployment (run-latest.json)
// Polkadot Hub EVM - Chain ID: 420420417

export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isHub?: boolean; // Hub tokens are central to the graph
  color?: string;
}

export const TOKENS: TokenConfig[] = [
  {
    address: '0x375b3Ee0CfC16FaD04b2b8DF2fa48C3565320A5B',
    symbol: 'USDT',
    name: 'USD Tether',
    decimals: 6,
    isHub: true,
    color: '#26A17B',
  },
  {
    address: '0xc394f94c7B93AE269F7AABDeca736A7b7768a388',
    symbol: 'USDC',
    name: 'USD Circle',
    decimals: 6,
    isHub: true,
    color: '#2775CA',
  },
  {
    address: '0xD949EB9F942966C6F390bb07c56321BD516aD70b',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    isHub: true,
    color: '#F5AC37',
  },
  {
    address: '0x8e86B14Abc9e8F56C21A8eE26e8253b5658a9C7d',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    isHub: true,
    color: '#627EEA',
  },
  {
    address: '0xd99AaeCB8030B713F35065c1ef11a1e038620A41',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    color: '#F7931A',
  },
  {
    address: '0xfA27886C7395e48d4dAD4f5f50B7bBbcbCA85d93',
    symbol: 'LINK',
    name: 'ChainLink Token',
    decimals: 18,
    color: '#2A5ADA',
  },
  {
    address: '0x91D70E24969efa48fd8C6878c817e3D96bA5f360',
    symbol: 'UNI',
    name: 'Uniswap Token',
    decimals: 18,
    color: '#FF007A',
  },
  {
    address: '0x14a8Ea0630114b68Fc3975299A8f41067c798Aed',
    symbol: 'AAVE',
    name: 'Aave Token',
    decimals: 18,
    color: '#B6509E',
  },
  {
    address: '0xa85D8219Db815e5285605935c7863FdC3E1Dc3C8',
    symbol: 'COMP',
    name: 'Compound Token',
    decimals: 18,
    color: '#00D395',
  },
  {
    address: '0x38B29434dda8BaCe3d7239bD7FEd37d8f45d1475',
    symbol: 'MKR',
    name: 'Maker Token',
    decimals: 18,
    color: '#1AAB9B',
  },
  {
    address: '0x630ebd205b5A5c10145a044f89ACfd04E0286E69',
    symbol: 'SHIB',
    name: 'Shiba Inu',
    decimals: 18,
    color: '#FFA409',
  },
  {
    address: '0xC81316ee60D28f9602F4bFF4a809520D4865CDC1',
    symbol: 'PEPE',
    name: 'Pepe Token',
    decimals: 18,
    color: '#4CAF50',
  },
  {
    address: '0x93bCD3E0710d20E2c1a106aCecfEfbd4ee1bc9f8',
    symbol: 'SUSHI',
    name: 'Sushi Token',
    decimals: 18,
    color: '#FA52A0',
  },
  {
    address: '0x04d96680693a273f370b631DCC5Dec6f6F9041bB',
    symbol: 'CRV',
    name: 'Curve DAO',
    decimals: 18,
    color: '#40649F',
  },
  {
    address: '0x44E0eAb8683667dDa8DC7eaEEcf9ce351aa8704e',
    symbol: 'LDO',
    name: 'Lido DAO',
    decimals: 18,
    color: '#00A3FF',
  },
];

// Get hub tokens (USDT, USDC, DAI, WETH)
export const HUB_TOKENS = TOKENS.filter(t => t.isHub);

// Get token by symbol
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return TOKENS.find(t => t.symbol === symbol);
}

// Get token by address
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

// USDT specifically - the main hub token
export const USDT_TOKEN = getTokenBySymbol('USDT')!;

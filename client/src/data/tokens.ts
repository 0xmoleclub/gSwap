import { Token } from '@/types/token';

export const CORE_TOKENS: Token[] = [
  { id: 'DOT', name: 'Polkadot', color: 0xE6007A, price: 6.42, tvl: '850M' },
  { id: 'KSM', name: 'Kusama', color: 0xffffff, price: 32.15, tvl: '120M' },
  { id: 'ACA', name: 'Acala', color: 0x645AFF, price: 0.08, tvl: '45M' },
  { id: 'GLMR', name: 'Moonbeam', color: 0x53CBC9, price: 0.35, tvl: '90M' },
  { id: 'ASTR', name: 'Astar', color: 0x1b6dc1, price: 0.12, tvl: '75M' },
  { id: 'PHA', name: 'Phala', color: 0x98E012, price: 0.15, tvl: '20M' },
  { id: 'HDX', name: 'HydraDX', color: 0xF627C1, price: 0.01, tvl: '15M' },
  { id: 'BNC', name: 'Bifrost', color: 0xFF9900, price: 0.40, tvl: '30M' },
  { id: 'CFG', name: 'Centrifuge', color: 0xFCCB32, price: 0.55, tvl: '110M' },
  { id: 'INTR', name: 'Interlay', color: 0x1A73E8, price: 0.04, tvl: '12M' },
  { id: 'EQ', name: 'Equilibrium', color: 0x5F3EBF, price: 0.01, tvl: '5M' },
  { id: 'NODLE', name: 'Nodle', color: 0x00BFA5, price: 0.003, tvl: '8M' },
  { id: 'EFIN', name: 'Efinity', color: 0x7E57C2, price: 0.05, tvl: '10M' },
  { id: 'PARA', name: 'Parallel', color: 0xCB1D2F, price: 0.02, tvl: '25M' },
  { id: 'CLV', name: 'Clover', color: 0xCCFF00, price: 0.04, tvl: '15M' }
];

function generateEcosystemTokens(): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < 45; i++) {
    tokens.push({
      id: `T${2000 + i}`,
      name: `Para ${2000 + i}`,
      color: Math.random() > 0.6 ? 0xffffff : 0x555555,
      price: (Math.random() * 2).toFixed(2),
      tvl: (Math.random() * 5).toFixed(1) + 'M',
    });
  }
  return tokens;
}

export const TOKENS = [...CORE_TOKENS, ...generateEcosystemTokens()];

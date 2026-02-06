import { Pool } from '@/types/token';
import { TOKENS } from './tokens';

export function generatePools(): Pool[] {
  const pools: Pool[] = [];
  
  TOKENS.forEach((token) => {
    if (token.id === 'DOT') return;
    
    // Connection to Center (Relay)
    if (Math.random() > 0.1) {
      pools.push({
        source: token.id,
        target: 'DOT',
        apy: (Math.random() * 15 + 5).toFixed(1),
        type: 'relay'
      });
    }
    
    // Random Mesh Connections (XCM)
    const numConnections = Math.floor(Math.random() * 2);
    for (let j = 0; j < numConnections; j++) {
      const target = TOKENS[Math.floor(Math.random() * TOKENS.length)];
      if (target.id !== token.id && target.id !== 'DOT') {
        pools.push({
          source: token.id,
          target: target.id,
          apy: (Math.random() * 30 + 5).toFixed(1),
          type: 'xcm'
        });
      }
    }
  });
  
  return pools;
}

export const POOLS = generatePools();

import { EvmBatchProcessor } from '@subsquid/evm-processor';
import { TypeormDatabase } from '@subsquid/typeorm-store';
import { lookupArchive } from '@subsquid/archive-registry';
import { Store } from '@subsquid/typeorm-store';
import * as gSwapFactory from '../abi/gSwapFactory.js';
import * as gPool from '../abi/gPool.js';
import { Factory, Pool, Token } from '../model/index.js';

const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';
const START_BLOCK = parseInt(process.env.DEPLOY_BLOCK || process.env.START_BLOCK || '0');

const processor = new EvmBatchProcessor()
  .setDataSource({
    archive: lookupArchive('polkadot-hub-evm', { type: 'EVM' }),
    chain: process.env.RPC_ENDPOINT,
  })
  .setFinalityConfirmation(10)
  .setFields({
    transaction: {
      hash: true,
      from: true,
    },
    log: {
      address: true,
      topics: true,
      data: true,
      transactionHash: true,
    },
  })
  .setBlockRange({ from: START_BLOCK })
  // Watch factory for new pools
  .addLog({
    address: [FACTORY_ADDRESS],
    topic0: [gSwapFactory.events.PoolCreated.topic],
  });

// Keep track of pool addresses to watch
let poolAddresses: string[] = [];

function addPoolTopic() {
  if (poolAddresses.length > 0) {
    processor.addLog({
      address: poolAddresses.map(a => a.toLowerCase()),
      topic0: [
        gPool.events.Swap.topic,
        gPool.events.Mint.topic,
        gPool.events.Burn.topic,
        gPool.events.Sync.topic,
      ],
    });
  }
}

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  const factories: Map<string, Factory> = new Map();
  const pools: Map<string, Pool> = new Map();
  const tokens: Map<string, Token> = new Map();

  // Helper to get or create token
  async function getToken(address: string): Promise<Token> {
    const key = address.toLowerCase();
    let token = tokens.get(key);
    if (!token) {
      token = await ctx.store.get(Token, key);
      if (!token) {
        token = new Token({
          id: key,
          address: key,
          totalPools: 0,
        });
        tokens.set(key, token);
      }
    }
    return token;
  }

  // Helper to get or create factory
  async function getFactory(address: string): Promise<Factory> {
    const key = address.toLowerCase();
    let factory = factories.get(key);
    if (!factory) {
      factory = await ctx.store.get(Factory, key);
      if (!factory) {
        factory = new Factory({
          id: key,
          address: key,
          poolCount: 0,
          totalVolumeUSD: 0n,
          totalFeesUSD: 0n,
        });
        factories.set(key, factory);
      }
    }
    return factory;
  }

  // Helper to get or create pool
  async function getPool(address: string): Promise<Pool | undefined> {
    const key = address.toLowerCase();
    let pool = pools.get(key);
    if (!pool) {
      pool = await ctx.store.get(Pool, key);
      if (pool) {
        pools.set(key, pool);
      }
    }
    return pool;
  }

  for (let block of ctx.blocks) {
    for (let log of block.logs) {
      // Handle PoolCreated
      if (log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
        if (log.topics[0] === gSwapFactory.events.PoolCreated.topic) {
          const { pool, token0: token0Addr, token1: token1Addr } = gSwapFactory.events.PoolCreated.decode(log);
          
          const factory = await getFactory(FACTORY_ADDRESS);
          const token0 = await getToken(token0Addr);
          const token1 = await getToken(token1Addr);

          token0.totalPools++;
          token1.totalPools++;

          // Create new pool with initial state
          const newPool = new Pool({
            id: pool.toLowerCase(),
            address: pool.toLowerCase(),
            factory,
            token0,
            token1,
            reserve0: 0n,
            reserve1: 0n,
            swapFee: 30, // 0.3%
            totalSupply: 0n,
            blockNumber: BigInt(block.header.height),
            timestamp: new Date(block.header.timestamp),
            createdAt: new Date(block.header.timestamp),
            updatedAt: new Date(block.header.timestamp),
            volumeToken0: 0n,
            volumeToken1: 0n,
            txCount: 0,
          });

          pools.set(newPool.id, newPool);
          factory.poolCount++;
          poolAddresses.push(pool);

          ctx.log.info(`Pool created: ${pool} - ${token0Addr}/${token1Addr}`);
        }
      }

      // Handle pool events - update state only, don't store events
      const pool = await getPool(log.address);
      if (!pool) continue;

      const topic0 = log.topics[0];

      // Sync - update reserves (emitted after every swap/mint/burn)
      if (topic0 === gPool.events.Sync.topic) {
        const { reserve0, reserve1 } = gPool.events.Sync.decode(log);
        pool.reserve0 = reserve0;
        pool.reserve1 = reserve1;
        pool.updatedAt = new Date(block.header.timestamp);

        ctx.log.debug(`Sync: ${pool.address} - R0: ${reserve0}, R1: ${reserve1}`);
      }

      // Swap - update volume stats
      else if (topic0 === gPool.events.Swap.topic) {
        const { sender, amountIn, amountOut, tokenIn: tokenInAddr, tokenOut: tokenOutAddr } = gPool.events.Swap.decode(log);
        
        const tokenIn = await getToken(tokenInAddr);
        const tokenOut = await getToken(tokenOutAddr);

        // Update pool stats (not storing individual swap)
        if (tokenIn.id === pool.token0.id) {
          pool.volumeToken0 += amountIn;
          pool.volumeToken1 += amountOut;
        } else {
          pool.volumeToken0 += amountOut;
          pool.volumeToken1 += amountIn;
        }
        pool.txCount++;
        pool.updatedAt = new Date(block.header.timestamp);

        // Update factory totals
        const factory = await getFactory(FACTORY_ADDRESS);
        factory.totalVolumeUSD += amountIn; // Simplified - should convert to USD
        factory.totalFeesUSD += (amountIn * 30n) / 10000n;

        ctx.log.debug(`Swap: ${tokenInAddr.slice(0, 8)} -> ${tokenOutAddr.slice(0, 8)} | In: ${amountIn}, Out: ${amountOut}`);
      }

      // Mint - update total supply and tx count
      else if (topic0 === gPool.events.Mint.topic) {
        const { sender, amount0, amount1, lpTokens } = gPool.events.Mint.decode(log);
        
        pool.totalSupply += lpTokens;
        pool.txCount++;
        pool.updatedAt = new Date(block.header.timestamp);

        ctx.log.debug(`Mint: ${pool.address} - LP: ${lpTokens}`);
      }

      // Burn - update total supply and tx count
      else if (topic0 === gPool.events.Burn.topic) {
        const { sender, amount0, amount1, lpTokens } = gPool.events.Burn.decode(log);
        
        pool.totalSupply -= lpTokens;
        pool.txCount++;
        pool.updatedAt = new Date(block.header.timestamp);

        ctx.log.debug(`Burn: ${pool.address} - LP: ${lpTokens}`);
      }
    }
  }

  // Save all entities (no historical events to insert)
  await ctx.store.save([...factories.values()]);
  await ctx.store.save([...tokens.values()]);
  await ctx.store.save([...pools.values()]);

  ctx.log.info(`Processed ${ctx.blocks.length} blocks, ${pools.size} pools updated`);
});

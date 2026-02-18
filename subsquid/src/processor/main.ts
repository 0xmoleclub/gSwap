import { EvmBatchProcessor } from '@subsquid/evm-processor'
import { TypeormDatabase } from '@subsquid/typeorm-store'
import * as gSwapFactory from '../abi/gSwapFactory'
import * as gPool from '../abi/gPool'
import * as erc20 from '../abi/erc20'
import { Factory, Pool, Token } from '../model'

const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || '').toLowerCase()
const START_BLOCK = parseInt(process.env.DEPLOY_BLOCK || process.env.START_BLOCK || '0')

const processor = new EvmBatchProcessor()

// Use SQD Network gateway for bulk historical data (fast)
if (process.env.ARCHIVE_URL) {
  processor.setGateway(process.env.ARCHIVE_URL)
}

// Use RPC endpoint for real-time data (head of chain)
processor
  .setRpcEndpoint({
    url: process.env.RPC_ENDPOINT!,
    rateLimit: 10,
  })
  .setFinalityConfirmation(10)
  .setFields({
    log: {
      address: true,
      topics: true,
      data: true,
      transactionHash: true,
    },
  })
  .setBlockRange({ from: START_BLOCK })
  // Watch factory for PoolCreated events
  .addLog({
    address: [FACTORY_ADDRESS],
    topic0: [gSwapFactory.events.PoolCreated.topic],
  })
  // Watch ALL contracts for pool event topics (wildcard - no address filter).
  // We filter by known pool addresses in the handler.
  .addLog({
    topic0: [
      gPool.events.Swap.topic,
      gPool.events.Mint.topic,
      gPool.events.Burn.topic,
      gPool.events.Sync.topic,
    ],
  })

// Set of known pool addresses, persisted across batches.
// Populated from DB on first batch + PoolCreated events during processing.
let knownPools = new Set<string>()
let poolsPreloaded = false

processor.run(new TypeormDatabase({ supportHotBlocks: true }), async (ctx) => {
  // Pre-load known pool addresses from DB on first batch (handles restarts)
  if (!poolsPreloaded) {
    const existingPools = await ctx.store.find(Pool, {})
    for (const p of existingPools) {
      knownPools.add(p.address.toLowerCase())
    }
    poolsPreloaded = true
    if (knownPools.size > 0) {
      ctx.log.info(`Pre-loaded ${knownPools.size} known pool addresses from DB`)
    }
  }

  // In-memory caches for the current batch
  const factories = new Map<string, Factory>()
  const pools = new Map<string, Pool>()
  const tokens = new Map<string, Token>()

  async function getFactory(address: string): Promise<Factory> {
    const key = address.toLowerCase()
    let factory = factories.get(key)
    if (!factory) {
      factory = await ctx.store.get(Factory, key)
      if (!factory) {
        factory = new Factory({
          id: key,
          address: key,
          poolCount: 0,
          totalVolumeUSD: 0n,
          totalFeesUSD: 0n,
        })
      }
      factories.set(key, factory)
    }
    return factory
  }

  async function getToken(address: string, blockHeader: any): Promise<Token> {
    const key = address.toLowerCase()
    let token = tokens.get(key)
    if (!token) {
      token = await ctx.store.get(Token, key)
      if (!token) {
        token = new Token({
          id: key,
          address: key,
          totalPools: 0,
        })

        // Fetch ERC20 metadata via RPC
        try {
          const contract = new erc20.Contract(ctx, blockHeader, key)
          const [symbol, name, decimals] = await Promise.allSettled([
            contract.symbol(),
            contract.name(),
            contract.decimals(),
          ])
          if (symbol.status === 'fulfilled') token.symbol = symbol.value
          if (name.status === 'fulfilled') token.name = name.value
          if (decimals.status === 'fulfilled') token.decimals = decimals.value
          ctx.log.info(`Token metadata fetched: ${token.symbol ?? 'unknown'} (${key.slice(0, 10)}...)`)
        } catch (e) {
          ctx.log.warn(`Failed to fetch token metadata for ${key}: ${e}`)
        }
      }
      tokens.set(key, token)
    }
    return token
  }

  async function getPool(address: string): Promise<Pool | undefined> {
    const key = address.toLowerCase()
    let pool = pools.get(key)
    if (!pool) {
      // Load with relations so token0/token1/factory are available
      const results = await ctx.store.find(Pool, {
        where: { id: key },
        relations: { token0: true, token1: true, factory: true },
      } as any)
      pool = results[0]
      if (pool) {
        pools.set(key, pool)
      }
    }
    return pool
  }

  for (const block of ctx.blocks) {
    for (const log of block.logs) {
      const logAddress = log.address.toLowerCase()
      const topic0 = log.topics[0]

      // --- Handle PoolCreated from factory ---
      if (logAddress === FACTORY_ADDRESS && topic0 === gSwapFactory.events.PoolCreated.topic) {
        const { pool: poolAddr, token0: token0Addr, token1: token1Addr } =
          gSwapFactory.events.PoolCreated.decode(log)

        const factory = await getFactory(FACTORY_ADDRESS)
        const token0 = await getToken(token0Addr, block.header)
        const token1 = await getToken(token1Addr, block.header)

        token0.totalPools++
        token1.totalPools++

        const newPool = new Pool({
          id: poolAddr.toLowerCase(),
          address: poolAddr.toLowerCase(),
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
        })

        pools.set(newPool.id, newPool)
        knownPools.add(newPool.id)
        factory.poolCount++

        ctx.log.info(
          `Pool created: ${poolAddr} — ${token0.symbol ?? token0Addr.slice(0, 8)}/${token1.symbol ?? token1Addr.slice(0, 8)}`
        )
        continue
      }

      // --- Handle pool events (Sync, Swap, Mint, Burn) ---
      // Skip logs from contracts that are not known pools
      if (!knownPools.has(logAddress)) continue

      const pool = await getPool(logAddress)
      if (!pool) continue

      if (topic0 === gPool.events.Sync.topic) {
        const { reserve0, reserve1 } = gPool.events.Sync.decode(log)
        pool.reserve0 = reserve0
        pool.reserve1 = reserve1
        pool.blockNumber = BigInt(block.header.height)
        pool.updatedAt = new Date(block.header.timestamp)
      } else if (topic0 === gPool.events.Swap.topic) {
        const { amountIn, amountOut, tokenIn: tokenInAddr } = gPool.events.Swap.decode(log)

        if (tokenInAddr.toLowerCase() === pool.token0.id) {
          pool.volumeToken0 += amountIn
          pool.volumeToken1 += amountOut
        } else {
          pool.volumeToken0 += amountOut
          pool.volumeToken1 += amountIn
        }
        pool.txCount++
        pool.updatedAt = new Date(block.header.timestamp)

        const factory = await getFactory(FACTORY_ADDRESS)
        factory.totalVolumeUSD += amountIn
        factory.totalFeesUSD += (amountIn * 30n) / 10000n
      } else if (topic0 === gPool.events.Mint.topic) {
        const { lpTokens } = gPool.events.Mint.decode(log)
        pool.totalSupply += lpTokens
        pool.txCount++
        pool.updatedAt = new Date(block.header.timestamp)
      } else if (topic0 === gPool.events.Burn.topic) {
        const { lpTokens } = gPool.events.Burn.decode(log)
        pool.totalSupply -= lpTokens
        pool.txCount++
        pool.updatedAt = new Date(block.header.timestamp)
      }
    }
  }

  // Persist all updated entities
  await ctx.store.save([...factories.values()])
  await ctx.store.save([...tokens.values()])
  await ctx.store.save([...pools.values()])

  if (ctx.blocks.length > 0) {
    const lastBlock = ctx.blocks[ctx.blocks.length - 1].header.height
    ctx.log.info(`Batch done — blocks up to #${lastBlock}, ${pools.size} pools touched`)
  }
})

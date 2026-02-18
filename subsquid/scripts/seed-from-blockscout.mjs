#!/usr/bin/env node
// Seed the database from Blockscout API.
// eth_getLogs is broken on Polkadot Hub EVM, so we fetch data from blockscout directly.
//
// Usage: node scripts/seed-from-blockscout.mjs

import pg from 'pg';
import { config } from 'dotenv';

config({ path: process.env.DOTENV_CONFIG_PATH || '../.env' });

const FACTORY = '0x02065b6786f0198686d31b646e75330e9829750c';
const BLOCKSCOUT = 'https://blockscout-testnet.polkadot.io';
const RPC_URL = process.env.RPC_ENDPOINT || 'https://services.polkadothub-rpc.com/testnet';

// PoolCreated event topic
const POOL_CREATED_TOPIC = '0xebbbe9dc3a19d2f959ac76ac0372b4983cdfb945f5d6aef4873c36fabb2ba8aa';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function rpcCall(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

// Decode address from 32-byte hex topic
function decodeAddress(topic) {
  return '0x' + topic.slice(-40).toLowerCase();
}

// Fetch ERC20 metadata via blockscout API
async function fetchTokenMeta(address) {
  try {
    const data = await fetchJSON(`${BLOCKSCOUT}/api/v2/tokens/${address}`);
    return {
      symbol: data.symbol || null,
      name: data.name || null,
      decimals: data.decimals ? parseInt(data.decimals) : null,
    };
  } catch {
    // Fallback: try via tx receipt for contract calls
    return { symbol: null, name: null, decimals: null };
  }
}

// Fetch pool reserves via RPC (call Sync-like view or use staticcall)
async function fetchPoolReserves(poolAddress) {
  try {
    // getReserves() selector = 0x0902f1ac
    const result = await rpcCall('eth_call', [
      { to: poolAddress, data: '0x0902f1ac' },
      'latest',
    ]);
    if (result && result !== '0x' && result.length >= 130) {
      const reserve0 = BigInt('0x' + result.slice(2, 66));
      const reserve1 = BigInt('0x' + result.slice(66, 130));
      return { reserve0, reserve1 };
    }
  } catch (e) {
    console.warn(`  getReserves failed for ${poolAddress}: ${e.message}`);
  }
  return { reserve0: 0n, reserve1: 0n };
}

// Fetch pool totalSupply
async function fetchTotalSupply(poolAddress) {
  try {
    // totalSupply() selector = 0x18160ddd
    const result = await rpcCall('eth_call', [
      { to: poolAddress, data: '0x18160ddd' },
      'latest',
    ]);
    if (result && result !== '0x') return BigInt(result);
  } catch {}
  return 0n;
}

async function main() {
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'gswap',
  });

  console.log('Fetching factory logs from Blockscout...');
  const logsData = await fetchJSON(
    `${BLOCKSCOUT}/api/v2/addresses/${FACTORY}/logs`
  );
  const logItems = logsData.items || [];
  console.log(`Found ${logItems.length} log entries`);

  // Filter PoolCreated events
  const poolCreatedLogs = logItems.filter(
    (l) => l.topics && l.topics[0] === POOL_CREATED_TOPIC
  );
  console.log(`Found ${poolCreatedLogs.length} PoolCreated events`);

  // Collect unique tokens and pools
  const tokenAddresses = new Set();
  const pools = [];

  for (const log of poolCreatedLogs) {
    const poolAddr = decodeAddress(log.topics[1]);
    const token0 = decodeAddress(log.topics[2]);
    const token1 = decodeAddress(log.topics[3]);
    const poolIndex = parseInt(log.data, 16);

    tokenAddresses.add(token0);
    tokenAddresses.add(token1);
    pools.push({
      poolAddr,
      token0,
      token1,
      poolIndex,
      blockNumber: log.block_number,
    });
  }

  console.log(`\nUnique tokens: ${tokenAddresses.size}`);
  console.log(`Pools to seed: ${pools.length}`);

  // Clear existing data
  console.log('\nClearing existing data...');
  await pool.query('DELETE FROM pool');
  await pool.query('DELETE FROM token');
  await pool.query('DELETE FROM factory');
  await pool.query('DELETE FROM squid_processor.status');

  // Insert factory
  console.log('Inserting factory...');
  await pool.query(
    `INSERT INTO factory (id, address, pool_count, total_volume_usd, total_fees_usd)
     VALUES ($1, $1, $2, 0, 0)`,
    [FACTORY, pools.length]
  );

  // Insert tokens
  console.log('Fetching token metadata and inserting tokens...');
  const tokenMeta = {};
  for (const addr of tokenAddresses) {
    const meta = await fetchTokenMeta(addr);
    tokenMeta[addr] = meta;

    // Count how many pools this token appears in
    const poolCount = pools.filter(
      (p) => p.token0 === addr || p.token1 === addr
    ).length;

    await pool.query(
      `INSERT INTO token (id, address, symbol, name, decimals, total_pools)
       VALUES ($1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET symbol=$2, name=$3, decimals=$4, total_pools=$5`,
      [addr, meta.symbol, meta.name, meta.decimals, poolCount]
    );
    console.log(
      `  Token: ${meta.symbol || addr.slice(0, 10)} (${meta.name || 'unknown'}) decimals=${meta.decimals}`
    );
  }

  // Insert pools with on-chain reserves
  console.log('\nFetching pool reserves and inserting pools...');
  for (const p of pools) {
    const { reserve0, reserve1 } = await fetchPoolReserves(p.poolAddr);
    const totalSupply = await fetchTotalSupply(p.poolAddr);
    const now = new Date().toISOString();

    await pool.query(
      `INSERT INTO pool (id, address, factory_id, token0_id, token1_id, reserve0, reserve1, swap_fee, total_supply, block_number, timestamp, created_at, updated_at, volume_token0, volume_token1, tx_count)
       VALUES ($1, $1, $2, $3, $4, $5, $6, 30, $7, $8, $9, $9, $9, 0, 0, 0)
       ON CONFLICT (id) DO UPDATE SET reserve0=$5, reserve1=$6, total_supply=$7, updated_at=$9`,
      [
        p.poolAddr,
        FACTORY,
        p.token0,
        p.token1,
        reserve0.toString(),
        reserve1.toString(),
        totalSupply.toString(),
        p.blockNumber,
        now,
      ]
    );
    const t0sym = tokenMeta[p.token0]?.symbol || p.token0.slice(0, 8);
    const t1sym = tokenMeta[p.token1]?.symbol || p.token1.slice(0, 8);
    console.log(
      `  Pool #${p.poolIndex}: ${t0sym}/${t1sym} — reserves: ${reserve0} / ${reserve1}`
    );
  }

  console.log('\nDone! Seeded data summary:');
  const { rows: tokenCount } = await pool.query('SELECT count(*) FROM token');
  const { rows: poolCount } = await pool.query('SELECT count(*) FROM pool');
  console.log(`  Tokens: ${tokenCount[0].count}`);
  console.log(`  Pools:  ${poolCount[0].count}`);

  await pool.end();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

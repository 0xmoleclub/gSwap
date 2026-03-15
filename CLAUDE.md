# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gSwap is a full-featured DEX on Polkadot Hub EVM (Chain ID 420420417) with:
- Uniswap V2-style constant-product AMM (20 pools)
- 3D pool graph visualization (Three.js)
- Subsquid indexer with Apollo GraphQL server
- **AI-powered arbitrage agent with REAL transaction execution**
- **GRS platform token with staking and fee discounts**
- **Token faucet for demo users**

## Repository Structure

- **`client/`** — Next.js 16 frontend (React 19, Three.js, Tailwind CSS 4)
- **`subsquid/`** — Subsquid indexer, seed scripts, Apollo GraphQL server (port 4000)
- **`agent/`** — Arbitrage detection agent (TypeScript, viem, OpenRouter)
- **`contracts/`** — Solidity smart contracts (Foundry/Forge, Solidity 0.8.20)

`client/` and `subsquid/` are independent packages (not a monorepo workspace). `agent/` source is compiled as part of subsquid.

## Deployed Contracts (Polkadot Hub Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| gSwapFactory | `0x90959F9Bf93EBE320d8aF0304Fd6aE87F0C7fD7c` | Pool factory (20 pools) |
| GRS Token | `0x9d1939134297c5fa44A793c3E618f8D7Ba793024` | Platform token (10M supply) |
| GRS Staking | `0x5a36D068898e8db3D089727890f89ae60a4b8c78` | Staking & rewards |
| GRS/USDT Pool | `0xc296599d2cc3D0BC7577Fd0f0AE8254519976A2c` | GRS liquidity |

### Token Addresses

- USDT: `0x375b3Ee0CfC16FaD04b2b8DF2fa48C3565320A5B` (Hub)
- USDC: `0xc394f94c7B93AE269F7AABDeca736A7b7768a388` (Hub)
- DAI: `0xD949EB9F942966C6F390bb07c56321BD516aD70b` (Hub)
- WETH: `0x8e86B14Abc9e8F56C21A8eE26e8253b5658a9C7d` (Hub)
- GRS: `0x9d1939134297c5fa44A793c3E618f8D7Ba793024` (Platform)
- + 11 other altcoins (see `client/src/config/tokens.ts`)

## How to Run

### Prerequisites
- PostgreSQL running (via Docker or local)
- `.env` file at project root (copy from `.env.example`)

### 1. Start the database
```bash
cd subsquid && docker compose up -d   # PostgreSQL
```

### 2. Seed the database
```bash
cd subsquid && pnpm install && pnpm build
DOTENV_CONFIG_PATH=../.env node scripts/seed-from-blockscout.mjs
```

### 3. Start the backend (Apollo GraphQL server on port 4000)
```bash
cd subsquid
DOTENV_CONFIG_PATH=../.env pnpm serve:apollo
```

### 4. Start the frontend (Next.js on port 3000)
```bash
cd client && pnpm install
pnpm dev
```

### 5. Run the agent (optional)
```bash
cd subsquid
PRIVATE_KEY=0x... node dist/index.js start --auto
```

The agent connects to the same Apollo GraphQL server and executes real transactions on Polkadot Hub EVM.

## Common Commands

### Client
```bash
cd client && pnpm install
pnpm dev              # Dev server on port 3000
pnpm build            # Production build
```

### Contracts (Foundry)
```bash
cd contracts
forge build           # Compile (Solidity 0.8.20, optimizer 200 runs)
forge test            # Run all tests
forge test -vvv       # Verbose test output
forge test --match-test testSwap  # Run a single test by name

# Deploy GRS token
forge script script/DeployGRS.s.sol \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Subsquid (Indexer + GraphQL)
```bash
cd subsquid && pnpm install
pnpm build            # Compile TypeScript (tsc)
pnpm codegen          # Regenerate TypeORM models from schema.graphql
pnpm typegen          # Regenerate ABI type bindings

# Seed DB from Blockscout (eth_getLogs is broken on PolkaVM)
DOTENV_CONFIG_PATH=../.env node scripts/seed-from-blockscout.mjs

# Start Apollo GraphQL server on port 4000
DOTENV_CONFIG_PATH=../.env pnpm serve:apollo
```

### Agent CLI
The agent source lives in `agent/src/` and is compiled as part of subsquid (`pnpm build`). Available commands:
```
start     — Continuous polling (5s interval)
scan      — Single scan for arbitrage opportunities
analyze   — LLM-powered market analysis (requires OPENROUTER_API_KEY)
history   — View trade history
status    — Show agent status
help      — Show CLI help
```

Example:
```bash
node dist/index.js scan                              # Single scan
node dist/index.js start                             # Continuous polling
node dist/index.js start --auto                      # With auto-execution
node dist/index.js analyze --key="sk-or-v1-..."      # LLM analysis
node dist/index.js history --limit=20                # View history
```

## Architecture

### Data Flow
```
Polkadot Hub EVM → Blockscout API → seed script → PostgreSQL
                                                      ↓
                                          Apollo GraphQL (port 4000)
                                             ↓              ↓
                                    Next.js Client    Arbitrage Agent
                                     (port 3000)      (Real execution)
```

### Contracts
- `gSwapFactory.sol` — CREATE2-based factory, emits `PoolCreated`, default fee 30 bps
- `gPool.sol` — AMM pool (x*y=k), events: `Swap`, `Mint`, `Burn`, `Sync`
- `MockGRS.sol` — Platform token with fee discounts, tiers, and airdrop eligibility
- `GRSStaking.sol` — Staking contract with 10-20% APR rewards
- `MockERC20.sol` — Test tokens with `faucet()` (10,000 tokens)

### Apollo GraphQL Server (subsquid)
Single server (`apolloServer.ts`) backed by PostgreSQL on port 4000.

Queries:
- `tokens` — All indexed tokens
- `token(address)` — Single token by address
- `pools` — All pools with token relations
- `pool(address)` — Single pool by address
- `poolsByToken(token)` — All pools containing a token
- `graph` — Full graph structure (nodes + edges with rates)
- `graphEdges(token)` — Edges from a specific token
- `arbitrageRoutes(startToken, maxHops)` — Find cyclic arbitrage routes
- `calculateRouteProfit(route, amountIn)` — Calculate profit for a route

### Client Pages
- `/` — 3D pool graph (Three.js spherical layout, raycasting, OrbitControls)
- `/swap` — Token swap interface
- `/liquidity` — Add/remove liquidity
- `/staking` — GRS token staking with rewards and tier benefits
- `/faucet` — Free testnet tokens (10,000 per token)
- `/arbitrage` — Agent trade history and statistics

### Hooks
- `useIndexerData` — Fetches from Apollo GraphQL and computes TVL/prices
- `useThreeScene` — Manages the full Three.js scene lifecycle
- `useFaucet` — Handles token faucet claims
- `useGRSStaking` — Handles GRS staking interactions
- `useTokenBalances` — Fetches token balances

### Agent
- `ArbitrageAgent` — Orchestrates polling (5s interval), uses `SubsquidClient`
- `ArbitrageCalculator` — Evaluates routes with constant-product formula
- `LLMAnalyzer` — Calls OpenRouter API (default model: `qwen/qwen3-coder:free`)
- `TransactionExecutor` — **REAL execution via viem**, submits actual transactions

## GRS Platform Token

### Benefits
- **Fee Discounts:** 5% (1K+), 10% (10K+), 25% (100K+ GRS)
- **Staking Rewards:** 10% APR (20% with 30-day lock)
- **Airdrop Eligibility:** Hold 1,000+ GRS

### Tiers
| Tier | Requirement | Discount | Benefits |
|------|-------------|----------|----------|
| Silver | 1,000 GRS | 5% | Reduced fees, airdrop eligible |
| Gold | 10,000 GRS | 10% | Lower fees, priority support |
| Platinum | 100,000 GRS | 25% | Max discount, exclusive access |

## Key Environment Variables

Defined in `.env.example` at the root. Critical ones:
- `RPC_ENDPOINT` — Polkadot Hub EVM RPC
- `FACTORY_ADDRESS` — Deployed factory contract address
- `DB_*` — PostgreSQL connection (name, host, port, user, pass)
- `START_BLOCK` / `DEPLOY_BLOCK` — Block numbers for indexer start
- `NEXT_PUBLIC_GRAPHQL_URL` — GraphQL endpoint for client (default `http://localhost:4000`)
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` — LLM config for agent
- `PRIVATE_KEY` — For agent transaction execution (keep secret!)
- `MAX_GAS_PRICE` — Max gas price in wei (default 500 gwei)

## Known Limitations

- **`eth_getLogs` broken on PolkaVM** — Must use `seed-from-blockscout.mjs` instead of the Subsquid processor
- **Agent requires funded wallet** — Need token balances for arbitrage execution
- **No Subsquid archive exists for Polkadot Hub** — Processor runs in RPC-only mode
- **Pool reserves update** — Re-run seed script after significant liquidity changes

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Smart Contracts | Solidity 0.8.20, Foundry, OpenZeppelin v5 |
| Indexer | Subsquid, TypeORM, PostgreSQL |
| GraphQL | Apollo Server |
| Agent | TypeScript, viem, OpenRouter |
| Frontend | Next.js 16, React 19, Three.js, Tailwind CSS 4 |
| Network | Polkadot Hub EVM (Chain ID: 420420417) |

## Useful Links

- **Blockscout Explorer:** https://blockscout-passet-hub.parity-testchain.parity.io
- **Subsquid Docs:** https://docs.subsquid.io/
- **Polkadot Hub EVM:** https://wiki.polkadot.network/docs/learn-guides-accounts
- **OpenRouter:** https://openrouter.ai/docs
- **Foundry:** https://book.getfoundry.sh/
- **viem:** https://viem.sh/

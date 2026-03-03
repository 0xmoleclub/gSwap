# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

gSwap is a DEX on Polkadot Hub EVM (chain ID 420420417, Passet Hub testnet) with a Uniswap V2-style constant-product AMM, a 3D pool graph visualization, a Subsquid indexer with Apollo GraphQL server, and an LLM-powered arbitrage agent.

## Repository Structure

- **`client/`** — Next.js 16 frontend (React 19, Three.js, Tailwind CSS 4), has its own `pnpm-lock.yaml`
- **`subsquid/`** — Subsquid indexer, seed scripts, Apollo GraphQL server (port 4000), Docker config, has its own `pnpm-lock.yaml`
- **`agent/`** — Arbitrage detection agent (TypeScript source only in `agent/src/`, no package.json)
- **`contracts/`** — Solidity smart contracts (Foundry/Forge, Solidity 0.8.20, OpenZeppelin v5)

`client/` and `subsquid/` are independent packages (not a monorepo workspace). `agent/` has source files only.

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

The client connects to the GraphQL server at `NEXT_PUBLIC_GRAPHQL_URL` (default `http://localhost:4000`).

### 5. Run the agent (optional)
The agent reads from the same Apollo GraphQL server:
```bash
cd subsquid
node dist/index.js scan                                     # Single scan
node dist/index.js start                                    # Continuous polling
node dist/index.js analyze --key="sk-or-v1-..."             # LLM market analysis
```

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
```

### Subsquid (Indexer + GraphQL)
```bash
cd subsquid && pnpm install
pnpm build            # Compile TypeScript (tsc)
pnpm codegen          # Regenerate TypeORM models from schema.graphql
pnpm typegen          # Regenerate ABI type bindings

# Seed DB from Blockscout (eth_getLogs is broken on PolkaVM)
DOTENV_CONFIG_PATH=../.env node scripts/seed-from-blockscout.mjs

# Start Apollo GraphQL server on port 4000 (backed by PostgreSQL)
DOTENV_CONFIG_PATH=../.env pnpm serve:apollo
```

### Agent CLI
The agent source lives in `agent/src/` and is compiled as part of subsquid (`pnpm build`). Available commands:
```
start     — Continuous polling (5s interval)
scan      — Single scan for arbitrage opportunities
analyze   — LLM-powered market analysis (requires OPENROUTER_API_KEY)
status    — Show agent status
help      — Show CLI help
```

## Architecture

### Data Flow
```
Polkadot Hub EVM → Blockscout API → seed script → PostgreSQL
                                                      ↓
                                          Apollo GraphQL (port 4000)
                                             ↓              ↓
                                    Next.js Client    Arbitrage Agent
                                     (port 3000)
```

### Contracts
- `gSwapFactory.sol` — CREATE2-based factory, emits `PoolCreated`, default fee 30 bps
- `gPool.sol` — AMM pool (x*y=k), events: `Swap`, `Mint`, `Burn`, `Sync`
- `MockERC20.sol` — Test token with `faucet()` (10,000 tokens)
- `DeployGSwap.s.sol` — Hub-and-spoke deployment: USDC/USDT/DAI hubs, ~15 tokens
- Deployed factory: `0x90959F9Bf93EBE320d8aF0304Fd6aE87F0C7fD7c` (19 pools, 14 tokens)

### Apollo GraphQL Server (subsquid)
Single server (`apolloServer.ts`) backed by PostgreSQL on port 4000.

Queries: `tokens`, `token(address)`, `pools`, `pool(address)`, `poolsByToken(token)`, `graph` (nodes + edges with rates), `graphEdges(token)`, `arbitrageRoutes(startToken, maxHops)`, `calculateRouteProfit(route, amountIn)`.

### Client
- `/` — 3D pool graph (Three.js spherical layout, raycasting, OrbitControls)
- `/swap`, `/liquidity`, `/staking` — UI shells (not wired to contracts yet)
- `useIndexerData` hook fetches from Apollo GraphQL and computes TVL/prices
- `useThreeScene` hook manages the full Three.js scene lifecycle
- Visual: Polkadot pink `#E6007A` accent, glassmorphism panels, Unbounded/Inter/Geist fonts

### Agent
- `ArbitrageAgent` orchestrates polling (5s interval), uses `SubsquidClient` for GraphQL
- `ArbitrageCalculator` evaluates routes with constant-product formula, fetches token data via GraphQL
- `LLMAnalyzer` calls OpenRouter API (default model: `qwen/qwen3-coder:free`)
- `TransactionExecutor` is mocked — does not submit real transactions

## Key Environment Variables

Defined in `.env.example` at the root. Critical ones:
- `RPC_ENDPOINT` — Polkadot Hub EVM RPC
- `FACTORY_ADDRESS` — Deployed factory contract address
- `DB_*` — PostgreSQL connection (name, host, port, user, pass)
- `START_BLOCK` / `DEPLOY_BLOCK` — Block numbers for indexer start
- `NEXT_PUBLIC_GRAPHQL_URL` — GraphQL endpoint for client (default `http://localhost:4000`)
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` — LLM config for agent (default model: `qwen/qwen3-coder:free`)

## Known Limitations

- **`eth_getLogs` broken on PolkaVM** — Must use `seed-from-blockscout.mjs` instead of the Subsquid processor
- **Agent executor is mocked** — `TransactionExecutor` simulates transactions, no real on-chain execution
- **Swap/Liquidity/Staking pages are UI-only** — Not wired to smart contracts
- **No Subsquid archive exists for Polkadot Hub** — Processor runs in RPC-only mode
- **Agent has no package.json** — Source-only in `agent/src/`, compiled as part of subsquid

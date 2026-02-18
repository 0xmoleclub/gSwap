# gSwap

A decentralized exchange (DEX) on Polkadot Hub EVM with a 3D pool graph visualization, on-chain indexer, and arbitrage agent.

## Architecture

```
gswap/
├── client/          # Next.js frontend — 3D pool graph (Three.js)
├── subsquid/        # Subsquid indexer + Apollo GraphQL server
├── contracts/       # Solidity smart contracts (Foundry)
├── agent/           # Arbitrage detection agent
└── .env             # Shared environment variables
```

**Data flow:**

```
Polkadot Hub EVM → Subsquid Processor → PostgreSQL → Apollo GraphQL (4000) → Next.js Client (3000)
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10
- **PostgreSQL** 15+
- **Foundry** (for contract development only)

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

Key variables:

| Variable | Description | Default |
|---|---|---|
| `RPC_ENDPOINT` | Polkadot Hub EVM RPC | `https://services.polkadothub-rpc.com/testnet` |
| `DB_NAME` | PostgreSQL database name | `gswap` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASS` | PostgreSQL password | |
| `FACTORY_ADDRESS` | gSwap factory contract | `0x02065b6786f0198686d31b646e75330e9829750c` |
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL endpoint for client | `http://localhost:4000` |

### 2. Create Database

```bash
createdb gswap
# or with psql:
psql -U postgres -c "CREATE DATABASE gswap;"
```

### 3. Install Dependencies

```bash
# Indexer
cd subsquid && pnpm install

# Client
cd ../client && pnpm install
```

### 4. Build and Migrate (Indexer)

```bash
cd subsquid

# Build TypeScript
pnpm build

# Apply database migrations
pnpm migration:apply
```

### 5. Seed Data from Blockscout

> **Note:** `eth_getLogs` is currently broken on Polkadot Hub EVM (PolkaVM). The seed script fetches pool data directly from the Blockscout API instead.

```bash
cd subsquid
DOTENV_CONFIG_PATH=../.env node scripts/seed-from-blockscout.mjs
```

This will:
- Fetch all `PoolCreated` events from the factory contract via Blockscout
- Fetch ERC20 token metadata (symbol, name, decimals)
- Fetch on-chain reserves via RPC `getReserves()` calls
- Insert all tokens and pools into the database

### 6. Start the Apollo GraphQL Server

```bash
cd subsquid
DOTENV_CONFIG_PATH=../.env pnpm serve:apollo
```

The server starts at **http://localhost:4000**. Test it:

```bash
curl http://localhost:4000 \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ tokens { id symbol totalPools } pools { id token0 { symbol } token1 { symbol } } }"}'
```

### 7. Start the Client

```bash
cd client
pnpm dev
```

The client starts at **http://localhost:3000** (or next available port).

Open it in your browser to see the 3D pool graph with all tokens and pool connections.

## Running with Docker (Indexer + DB)

```bash
cd subsquid
docker compose up -d
```

This starts PostgreSQL and the Subsquid processor. The API is exposed on port **4350**.

## Project Details

### Client (`client/`)

Next.js 16 app with a 3D visualization of the DEX pool graph using Three.js.

- **3D Scene**: Tokens as glowing spheres, pools as connecting lines
- **Central Token**: The most connected token (by pool count) is placed at the origin
- **Live Data**: Fetches from the Apollo GraphQL server; falls back to static mock data if unavailable
- **Tech**: React 19, Three.js, Tailwind CSS

```bash
pnpm dev       # Development server
pnpm build     # Production build
pnpm start     # Production server
```

### Indexer (`subsquid/`)

Subsquid EVM processor that indexes gSwap factory events on Polkadot Hub EVM.

**Indexed events:** `PoolCreated`, `Sync`, `Swap`, `Mint`, `Burn`

```bash
pnpm build           # Compile TypeScript
pnpm process         # Run the Subsquid processor
pnpm serve           # Run the default Subsquid GraphQL server
pnpm serve:apollo    # Run the custom Apollo GraphQL server (recommended)
pnpm migration:apply # Apply DB migrations
pnpm codegen         # Regenerate TypeORM models from schema.graphql
pnpm typegen         # Regenerate ABI type bindings
```

**GraphQL API** (Apollo server on port 4000):

| Query | Description |
|---|---|
| `tokens` | All indexed tokens |
| `pools` | All pools with token relations and reserves |
| `pool(address)` | Single pool by address |
| `poolsByToken(token)` | All pools containing a token |
| `graph` | Full graph structure (nodes + edges) |
| `arbitrageRoutes(startToken, maxHops)` | Find cyclic arbitrage routes |
| `calculateRouteProfit(route, amountIn)` | Calculate profit for a route |

### Contracts (`contracts/`)

Solidity smart contracts built with Foundry.

- **gSwapFactory.sol** — Factory for deploying liquidity pools
- **gPool.sol** — AMM liquidity pool (Uniswap V2 style, constant product)
- **MockERC20.sol** — Test tokens

```bash
cd contracts
forge build    # Compile contracts
forge test     # Run tests
```

### Agent (`agent/`)

Arbitrage detection agent that queries the GraphQL API to find profitable trade routes.

## Deployed Contracts

| Contract | Address | Network |
|---|---|---|
| gSwapFactory | `0x02065b6786f0198686d31b646e75330e9829750c` | Polkadot Hub Testnet (Chain ID: 420420417) |

Explorer: https://blockscout-testnet.polkadot.io/address/0x02065b6786f0198686d31b646e75330e9829750c

## Known Limitations

- **`eth_getLogs` is broken** on Polkadot Hub EVM (PolkaVM). The Subsquid processor cannot index events efficiently. Use the Blockscout seed script as a workaround.
- **Pool reserves are 0** if no liquidity has been added on-chain. Re-run the seed script after adding liquidity.
- The RPC endpoint `services.polkadothub-rpc.com/testnet` corresponds to chain ID **420420417** (Polkadot Hub Testnet / Passet Hub), not Westend Asset Hub (420420421).

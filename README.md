# gSwap

A decentralized exchange (DEX) on Polkadot Hub EVM with 3D pool graph visualization, AI-powered arbitrage agent, platform token staking, and comprehensive DeFi features.

## Features

🌌 **3D Galaxy Visualization** — Interactive pool graph with Three.js  
🤖 **AI Arbitrage Agent** — Real-time opportunity detection & execution  
⬡ **GRS Platform Token** — Staking rewards, fee discounts & governance  
🚰 **Token Faucet** — Free testnet tokens for demo users  
📊 **Subsquid Indexer** — High-performance on-chain data indexing  

## Architecture

```
gswap/
├── client/          # Next.js 16 frontend — 3D visualization, trading UI
├── subsquid/        # Subsquid indexer + Apollo GraphQL server
├── contracts/       # Solidity smart contracts (Foundry)
├── agent/           # AI arbitrage agent with real execution
└── .env             # Shared environment variables
```

**Data flow:**

```
Polkadot Hub EVM → Blockscout API → PostgreSQL → Apollo GraphQL (4000) → Next.js Client (3000)
                             ↓
                      Arbitrage Agent (Real Transactions)
```

## Deployed Contracts (Polkadot Hub Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **gSwapFactory** | `0x90959F9Bf93EBE320d8aF0304Fd6aE87F0C7fD7c` | Pool factory & registry |
| **GRS Token** | `0x9d1939134297c5fa44A793c3E618f8D7Ba793024` | Platform governance token |
| **GRS Staking** | `0x5a36D068898e8db3D089727890f89ae60a4b8c78` | Staking & rewards |
| **GRS/USDT Pool** | `0xc296599d2cc3D0BC7577Fd0f0AE8254519976A2c` | GRS liquidity pool |

**Network:** Polkadot Hub EVM (Chain ID: 420420417)  
**Explorer:** https://blockscout-passet-hub.parity-testchain.parity.io

### Token Addresses

| Token | Address | Decimals | Type |
|-------|---------|----------|------|
| USDT | `0x375b3Ee0CfC16FaD04b2b8DF2fa48C3565320A5B` | 6 | Hub |
| USDC | `0xc394f94c7B93AE269F7AABDeca736A7b7768a388` | 6 | Hub |
| DAI | `0xD949EB9F942966C6F390bb07c56321BD516aD70b` | 18 | Hub |
| WETH | `0x8e86B14Abc9e8F56C21A8eE26e8253b5658a9C7d` | 18 | Hub |
| WBTC | `0xd99AaeCB8030B713F35065c1ef11a1e038620A41` | 8 | Major |
| GRS | `0x9d1939134297c5fa44A793c3E618f8D7Ba793024` | 18 | Platform |
| + 9 more altcoins | See `client/src/config/tokens.ts` | | |

**Total Pools:** 20 (Hub & Spoke topology)

## Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10
- **PostgreSQL** 15+
- **Foundry** (optional, for contract development)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd gswap

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials and private key
```

### 2. Install Dependencies

```bash
# Root (agent dependencies)
pnpm install

# Subsquid (indexer)
cd subsquid && pnpm install

# Client (frontend)
cd ../client && pnpm install
```

### 3. Start Database

```bash
cd subsquid
docker compose up -d db
# or use local PostgreSQL
```

### 4. Build & Seed

```bash
cd subsquid

# Build TypeScript
pnpm build

# Apply migrations
pnpm migration:apply

# Seed from Blockscout (eth_getLogs workaround)
DOTENV_CONFIG_PATH=../.env node scripts/seed-from-blockscout.mjs
```

### 5. Start Services

```bash
# Terminal 1: Apollo GraphQL Server
cd subsquid
DOTENV_CONFIG_PATH=../.env pnpm serve:apollo

# Terminal 2: Arbitrage Agent (optional)
cd subsquid
PRIVATE_KEY=0x... node dist/index.js start --auto

# Terminal 3: Frontend
cd client
pnpm dev
```

**URLs:**
- Frontend: http://localhost:3000
- GraphQL: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql

## Frontend Pages

| Page | Path | Description |
|------|------|-------------|
| **Galaxy** | `/` | 3D pool graph visualization |
| **Swap** | `/swap` | Token swapping interface |
| **Liquidity** | `/liquidity` | Add/remove liquidity |
| **Staking** | `/staking` | GRS token staking & rewards |
| **Faucet** | `/faucet` | Free testnet tokens |
| **Arbitrage** | `/arbitrage` | Agent history & stats |

## GRS Platform Token

### Benefits

| Tier | Requirement | Fee Discount | Benefits |
|------|-------------|--------------|----------|
| Silver | 1,000 GRS | 5% | Reduced fees, airdrop eligible |
| Gold | 10,000 GRS | 10% | Lower fees, priority support |
| Platinum | 100,000 GRS | 25% | Max discount, exclusive access |

### Staking Rewards

- **Base APR:** 10%
- **Boosted APR:** 20% (with 30-day lock)
- **Minimum Stake:** 100 GRS
- **Lock Period:** 30 days for 2x boost

## Arbitrage Agent

The AI-powered arbitrage agent scans for profitable trading routes and executes real transactions.

### Commands

```bash
cd subsquid

# Single scan
node dist/index.js scan

# Continuous operation
node dist/index.js start --auto

# Market analysis
node dist/index.js analyze

# View history
node dist/index.js history --limit=20
```

### Features

- Real-time opportunity detection
- LLM-powered analysis (OpenRouter)
- Actual transaction execution via viem
- Trade history tracking
- Configurable profit thresholds

## Contract Development

```bash
cd contracts

# Compile
forge build

# Test
forge test -vvv

# Deploy GRS (example)
forge script script/DeployGRS.s.sol \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## GraphQL API

**Endpoint:** `http://localhost:4000/graphql`

### Example Queries

```graphql
# Get all tokens
query {
  tokens {
    address
    symbol
    decimals
    totalPools
  }
}

# Get pools
query {
  pools {
    address
    token0 { symbol }
    token1 { symbol }
    reserve0
    reserve1
  }
}

# Find arbitrage routes
query {
  arbitrageRoutes(
    startToken: "0x375b3Ee0CfC16FaD04b2b8DF2fa48C3565320A5B"
    maxHops: 4
  )
}

# Calculate route profit
query {
  calculateRouteProfit(
    route: ["0x...", "0x...", "0x..."]
    amountIn: "1000000000"
  ) {
    profit
    profitPercent
    viable
  }
}
```

## Project Structure

```
gswap/
├── contracts/
│   ├── src/
│   │   ├── gSwapFactory.sol      # Pool factory
│   │   ├── gPool.sol             # AMM pool (x*y=k)
│   │   ├── MockERC20.sol         # Test tokens
│   │   ├── MockGRS.sol           # Platform token
│   │   └── GRSStaking.sol        # Staking contract
│   ├── script/
│   │   ├── DeployGSwap.s.sol     # Main deployment
│   │   ├── DeployGRS.s.sol       # GRS deployment
│   │   └── MintTokens.s.sol      # Token minting
│   └── test/
├── subsquid/
│   ├── src/
│   │   ├── agent.ts              # Agent orchestration
│   │   ├── index.ts              # CLI entry
│   │   ├── arbitrage/
│   │   │   └── calculator.ts     # Opportunity finder
│   │   ├── executor/
│   │   │   └── transaction.ts    # Real execution
│   │   ├── graphql/
│   │   │   ├── apolloServer.ts   # GraphQL server
│   │   │   └── client.ts         # GraphQL client
│   │   └── llm/
│   │       └── analyzer.ts       # LLM integration
│   └── schema.graphql
├── client/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Galaxy view
│   │   │   ├── swap/
│   │   │   ├── liquidity/
│   │   │   ├── staking/          # GRS staking
│   │   │   ├── faucet/           # Token faucet
│   │   │   └── arbitrage/        # Agent history
│   │   ├── hooks/
│   │   │   ├── useFaucet.ts
│   │   │   └── useGRSStaking.ts
│   │   └── config/
│   │       ├── tokens.ts         # Token addresses
│   │       └── chain.ts          # Chain config
│   └── package.json
├── package.json
└── .env.example
```

## Environment Variables

```bash
# Required
RPC_ENDPOINT=https://services.polkadothub-rpc.com/testnet
PRIVATE_KEY=0x...                    # For agent execution
DB_NAME=gswap
DB_USER=postgres
DB_PASS=postgres

# Optional
OPENROUTER_API_KEY=sk-or-v1-...      # For LLM analysis
OPENROUTER_MODEL=qwen/qwen3-coder:free
MAX_GAS_PRICE=500000000000           # 500 gwei
```

## Known Limitations

- **`eth_getLogs` is broken** on Polkadot Hub EVM (PolkaVM). We use Blockscout API for indexing.
- **No archive node** exists for Polkadot Hub yet. The processor runs in RPC-only mode.
- **Agent execution** requires sufficient token balances and gas funds.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contracts | Solidity 0.8.20, Foundry, OpenZeppelin |
| Indexer | Subsquid, TypeORM, PostgreSQL |
| GraphQL | Apollo Server, GraphQL |
| Agent | TypeScript, viem, OpenRouter |
| Frontend | Next.js 16, React 19, Three.js, Tailwind CSS |
| Blockchain | Polkadot Hub EVM (Chain ID: 420420417) |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Links

- **Explorer:** https://blockscout-passet-hub.parity-testchain.parity.io
- **Polkadot Hub:** https://wiki.polkadot.network/docs/learn-guides-accounts
- **Subsquid:** https://docs.subsquid.io/
- **OpenRouter:** https://openrouter.ai/docs
- **Foundry:** https://book.getfoundry.sh/

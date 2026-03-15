#!/usr/bin/env node
/**
 * gSwap Arbitrage Agent CLI
 * Entry point for running the arbitrage agent
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ArbitrageAgent, AgentConfig } from './agent.js';

// Load .env from project root (parent of agent directory)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..', '..');
config({ path: resolve(rootDir, '.env') });

console.log('📁 Loaded environment from:', resolve(rootDir, '.env'));

// Parse command line arguments
function parseArgs(): { command: string; options: Record<string, string> } {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value || 'true';
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      const value = args[i + 1];
      if (value && !value.startsWith('-')) {
        options[key] = value;
        i++;
      } else {
        options[key] = 'true';
      }
    }
  }

  return { command, options };
}

// Show help
function showHelp(): void {
  console.log(`
🤖 gSwap Arbitrage Agent (Powered by OpenRouter)

Usage: node dist/index.js <command> [options]

Commands:
  start              Start the arbitrage agent (continuous polling)
  scan               Run a single scan for opportunities
  analyze            Get market analysis from LLM
  status             Show agent status
  history            Show trade history
  clear-history      Clear trade history
  help               Show this help message

Options:
  --endpoint=<url>   GraphQL endpoint (default: http://localhost:4000)
  --auto             Enable auto-execution
  --profit=<pct>     Minimum profit percentage (default: 0.1)
  --hops=<n>         Maximum hops (default: 4)
  --key=<apikey>     OpenRouter API key (optional, reads from .env)
  --limit=<n>        Limit for history command (default: 20)

Environment Variables:
  OPENROUTER_API_KEY    Your OpenRouter API key
  OPENROUTER_MODEL      Model to use (default: qwen/qwen3-coder:free)
  RPC_URL              Blockchain RPC endpoint (production)
  PRIVATE_KEY          Wallet private key (production)
  CHAIN_ID             Chain ID (default: 420420417 for Polkadot Hub)
  MAX_GAS_PRICE        Max gas price in wei (default: 500000000000)

Examples:
  # Single scan against local Apollo server
  node dist/index.js scan

  # With custom endpoint
  node dist/index.js scan --endpoint=http://localhost:4000

  # Continuous polling
  node dist/index.js start --endpoint=http://localhost:4000

  # Continuous with auto-execution (requires PRIVATE_KEY)
  node dist/index.js start --auto

  # LLM market analysis
  node dist/index.js analyze --key="sk-or-v1-..."

  # View trade history
  node dist/index.js history --limit=10
  `);
}

// Format trade history for display
function formatHistory(trades: any[], limit: number): void {
  if (trades.length === 0) {
    console.log('\n📊 No trades in history yet.');
    return;
  }

  console.log(`\n📊 Last ${Math.min(trades.length, limit)} Trades:`);
  console.log('='.repeat(100));
  
  trades.slice(0, limit).forEach((trade, i) => {
    const date = new Date(trade.timestamp).toLocaleString();
    const route = trade.routeSymbols.join(' → ');
    const status = trade.status === 'success' ? '✅' : trade.status === 'pending' ? '⏳' : '❌';
    
    console.log(`\n${i + 1}. ${status} ${date}`);
    console.log(`   Route: ${route}`);
    console.log(`   Profit: $${trade.profitUSD?.toFixed(4) || 'N/A'} | Net: $${trade.netProfitUSD?.toFixed(4) || 'N/A'}`);
    console.log(`   Gas: ${trade.gasCost || 'N/A'} wei`);
    console.log(`   Tx: ${trade.txHash?.slice(0, 20)}...${trade.txHash?.slice(-8) || 'N/A'}`);
    
    if (trade.error) {
      console.log(`   Error: ${trade.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(100));
  console.log(`Total trades: ${trades.length}`);
}

// Main function
async function main(): Promise<void> {
  const { command, options } = parseArgs();

  // Load config from environment and CLI options
  const agentConfig: Partial<AgentConfig> = {
    graphqlEndpoint: options.endpoint || process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
    minProfitPercent: parseFloat(options.profit || '0.1'),
    maxHops: parseInt(options.hops || '4'),
    llmApiKey: options.key || process.env.OPENROUTER_API_KEY || '',
    llmModel: process.env.OPENROUTER_MODEL || 'qwen/qwen3-coder:free',
    rpcUrl: process.env.RPC_URL || 'https://services.polkadothub-rpc.com/testnet',
    privateKey: process.env.PRIVATE_KEY || '',
    chainId: parseInt(process.env.CHAIN_ID || '420420417'),
    maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '500000000000'),
    autoExecute: options.auto === 'true' || false,
  };

  switch (command) {
    case 'start': {
      console.log('\n🚀 Starting gSwap Arbitrage Agent...\n');

      // Check for required config
      if (agentConfig.autoExecute && !agentConfig.privateKey) {
        console.error('❌ Error: PRIVATE_KEY is required for auto-execution');
        console.error('   Set it in .env or pass as environment variable');
        process.exit(1);
      }

      const agent = new ArbitrageAgent(agentConfig);
      await agent.start();

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        agent.stop();
        process.exit(0);
      });

      // Keep running
      await new Promise(() => {});
      break;
    }

    case 'scan': {
      console.log('\n🔍 Running single scan...\n');

      const agent = new ArbitrageAgent(agentConfig);
      await agent.scan();

      process.exit(0);
      break;
    }

    case 'analyze': {
      console.log('\n📊 Getting market analysis...\n');

      const agent = new ArbitrageAgent(agentConfig);
      await agent.analyzeMarket();

      process.exit(0);
      break;
    }

    case 'status': {
      console.log('\n📊 Agent Status\n');
      
      const agent = new ArbitrageAgent(agentConfig);
      const status = agent.getStatus();
      
      console.log(`Running: ${status.isRunning ? '✅ Yes' : '❌ No'}`);
      console.log(`Wallet: ${status.walletAddress || 'Not configured'}`);
      console.log(`Last Scan: ${status.lastScan?.toISOString() || 'Never'}`);
      console.log(`Opportunities Found: ${status.opportunitiesFound}`);
      console.log(`Opportunities Executed: ${status.opportunitiesExecuted}`);
      console.log(`Total Profit: $${status.totalProfit.toFixed(4)}`);
      console.log(`Errors: ${status.errors.length}`);
      
      process.exit(0);
      break;
    }

    case 'history': {
      const limit = parseInt(options.limit || '20');
      
      const agent = new ArbitrageAgent(agentConfig);
      const trades = agent.getTradeHistory(limit);
      
      formatHistory(trades, limit);
      
      process.exit(0);
      break;
    }

    case 'clear-history': {
      console.log('\n🗑️  Clearing trade history...');
      
      const agent = new ArbitrageAgent(agentConfig);
      agent.clearTradeHistory();
      
      console.log('✅ Trade history cleared');
      
      process.exit(0);
      break;
    }

    case 'help':
    default:
      showHelp();
      process.exit(0);
  }
}

// Run main
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

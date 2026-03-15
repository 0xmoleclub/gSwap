#!/usr/bin/env node
/**
 * gSwap Arbitrage Agent CLI
 * Entry point for running the arbitrage agent
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { ArbitrageAgent, AgentConfig } from './agent.js';

// Load .env from project root (parent of subsquid directory)
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
  help               Show this help message

Options:
  --endpoint=<url>   GraphQL endpoint (default: http://localhost:4000)
  --auto             Enable auto-execution
  --profit=<pct>     Minimum profit percentage (default: 0.1)
  --hops=<n>         Maximum hops (default: 4)
  --key=<apikey>     OpenRouter API key (optional, reads from .env)

Environment Variables:
  OPENROUTER_API_KEY    Your OpenRouter API key
  OPENROUTER_MODEL      Model to use (default: qwen/qwen3-coder:free)
  RPC_URL              Blockchain RPC endpoint (production)
  PRIVATE_KEY          Wallet private key (production)

Examples:
  # Single scan against local Apollo server
  node dist/index.js scan

  # With custom endpoint
  node dist/index.js scan --endpoint=http://localhost:4000

  # Continuous polling
  node dist/index.js start --endpoint=http://localhost:4000

  # LLM market analysis
  node dist/index.js analyze --key="sk-or-v1-..."
  `);
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
    autoExecute: options.auto === 'true' || false,
  };

  // Check for OpenRouter API key
  if (!agentConfig.llmApiKey) {
    console.log('\n⚠️  WARNING: No OPENROUTER_API_KEY found in .env');
    console.log('   Set it to use LLM analysis.\n');
  }

  switch (command) {
    case 'start': {
      console.log('\n🚀 Starting gSwap Arbitrage Agent...\n');

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
      console.log('\nℹ️  To get status, the agent must be running.\n');
      console.log('Use: node dist/index.js start');
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

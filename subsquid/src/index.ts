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
import { startMockGraphQLServer } from './graphql/mockServer.js';

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
  start              Start the arbitrage agent (production)
  scan               Run a single scan for opportunities
  mock               Start mock GraphQL server + run scan with LLM analysis
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
  # Mock data + free LLM analysis (may be rate limited)
  node dist/index.js mock

  # With custom API key
  node dist/index.js mock --key="sk-or-v1-..."

  # Production
  node dist/index.js start --endpoint=https://real-indexer.com
  `);
}

// Main function
async function main(): Promise<void> {
  const { command, options } = parseArgs();
  
  // Load config from environment and CLI options
  const config: Partial<AgentConfig> = {
    graphqlEndpoint: options.endpoint || process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
    minProfitPercent: parseFloat(options.profit || '0.1'),
    maxHops: parseInt(options.hops || '4'),
    llmApiKey: options.key || process.env.OPENROUTER_API_KEY || '',
    llmModel: process.env.OPENROUTER_MODEL || 'qwen/qwen3-coder:free',
    autoExecute: options.auto === 'true' || false,
  };
  
  // Check for OpenRouter API key
  if (!config.llmApiKey) {
    console.log('\n⚠️  WARNING: No OPENROUTER_API_KEY found in .env');
    console.log('   Set it to use LLM analysis.\n');
  }
  
  switch (command) {
    case 'start': {
      console.log('\n🚀 Starting gSwap Arbitrage Agent...\n');
      
      // Start mock server if requested
      let mockServer: any;
      if (options.mock) {
        console.log('📡 Starting mock GraphQL server...');
        mockServer = await startMockGraphQLServer(4000);
        config.graphqlEndpoint = mockServer.url + '/graphql';
      }
      
      const agent = new ArbitrageAgent(config);
      await agent.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        agent.stop();
        mockServer?.server?.stop?.();
        process.exit(0);
      });
      
      // Keep running
      await new Promise(() => {});
      break;
    }
    
    case 'scan': {
      console.log('\n🔍 Running single scan...\n');
      
      // Start mock server if requested
      let mockServer: any;
      if (options.mock) {
        console.log('📡 Starting mock GraphQL server...');
        mockServer = await startMockGraphQLServer(4000);
        config.graphqlEndpoint = mockServer.url + '/graphql';
      }
      
      const agent = new ArbitrageAgent(config);
      await agent.scan();
      
      mockServer?.server?.stop?.();
      process.exit(0);
      break;
    }
    
    case 'mock': {
      console.log('\n📡 Starting mock GraphQL server...');
      console.log('   The server will run with mock data for testing.\n');
      
      // Try ports 4000-4005
      let url: string;
      let port = 4000;
      
      for (port = 4000; port <= 4005; port++) {
        try {
          const result = await startMockGraphQLServer(port);
          url = result.url;
          break;
        } catch (err: any) {
          if (err.code === 'EADDRINUSE') {
            console.log(`   Port ${port} in use, trying ${port + 1}...`);
            continue;
          }
          throw err;
        }
      }
      
      if (!url!) {
        console.error('❌ Could not find available port (tried 4000-4005)');
        process.exit(1);
      }
      
      console.log('\n✅ Mock server is running!');
      console.log(`   URL: ${url}`);
      console.log('\nYou can now test with:');
      console.log(`  curl ${url} -X POST -H "Content-Type: application/json" \\\n    -d '{"query": "{ pools { address token0 { symbol } token1 { symbol } } }"}'`);
      console.log('\nPress Ctrl+C to stop');
      
      // Run a demo scan
      console.log('\n\n🧪 Running demo scan...\n');
      config.graphqlEndpoint = url + '/graphql';
      const agent = new ArbitrageAgent(config);
      await agent.scan();
      
      // Keep server running
      await new Promise(() => {});
      break;
    }
    
    case 'analyze': {
      console.log('\n📊 Getting market analysis...\n');
      
      let mockServer: any;
      if (options.mock) {
        mockServer = await startMockGraphQLServer(4000);
        config.graphqlEndpoint = mockServer.url + '/graphql';
      }
      
      const agent = new ArbitrageAgent(config);
      await agent.analyzeMarket();
      
      mockServer?.server?.stop?.();
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

/**
 * gSwap Arbitrage Agent
 * Main orchestrator that coordinates all components
 */

import { SubsquidClient, Pool } from './graphql/client.js';
import { ArbitrageCalculator, ArbitrageOpportunity } from './arbitrage/calculator.js';
import { LLMAnalyzer, ExecutionDecision, MarketAnalysis } from './llm/analyzer.js';
import { TransactionExecutor, TransactionResult, ArbitrageTrade, tradeHistory } from './executor/transaction.js';

export interface AgentConfig {
  // GraphQL
  graphqlEndpoint: string;
  
  // Arbitrage
  minProfitPercent: number;
  maxHops: number;
  gasPriceGwei: number;
  ethPriceUSD: number;
  
  // LLM (OpenRouter)
  llmApiKey: string;
  llmModel: string;
  
  // Execution
  rpcUrl: string;
  privateKey: string;
  chainId: number;
  maxGasPrice: bigint;
  autoExecute: boolean;
  
  // General
  pollIntervalMs: number;
  maxConcurrentOpportunities: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  graphqlEndpoint: 'http://localhost:4000/graphql',
  minProfitPercent: 0.1,
  maxHops: 4,
  gasPriceGwei: 20,
  ethPriceUSD: 2000,
  llmApiKey: process.env.OPENROUTER_API_KEY || '',
  llmModel: process.env.OPENROUTER_MODEL || 'arcee-ai/trinity-large-preview:free',
  rpcUrl: process.env.RPC_URL || 'https://services.polkadothub-rpc.com/testnet',
  privateKey: process.env.PRIVATE_KEY || '',
  chainId: parseInt(process.env.CHAIN_ID || '420420417'),
  maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '500000000000'),
  autoExecute: false,
  pollIntervalMs: 5000,
  maxConcurrentOpportunities: 3,
};

export interface AgentStatus {
  isRunning: boolean;
  lastScan: Date | null;
  opportunitiesFound: number;
  opportunitiesExecuted: number;
  totalProfit: number;
  errors: string[];
  walletAddress?: string;
}

export class ArbitrageAgent {
  private config: AgentConfig;
  private client: SubsquidClient;
  private calculator: ArbitrageCalculator;
  private analyzer: LLMAnalyzer;
  private executor: TransactionExecutor;
  
  private status: AgentStatus = {
    isRunning: false,
    lastScan: null,
    opportunitiesFound: 0,
    opportunitiesExecuted: 0,
    totalProfit: 0,
    errors: [],
  };
  
  private intervalId?: NodeJS.Timeout;

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.client = new SubsquidClient(this.config.graphqlEndpoint);
    
    this.calculator = new ArbitrageCalculator(this.client, {
      minProfitPercent: this.config.minProfitPercent,
      maxHops: this.config.maxHops,
      gasPriceGwei: this.config.gasPriceGwei,
      ethPriceUSD: this.config.ethPriceUSD,
    });
    
    // Initialize OpenRouter LLM analyzer
    this.analyzer = new LLMAnalyzer({
      apiKey: this.config.llmApiKey,
      model: this.config.llmModel,
      maxTokens: 2000,
      temperature: 0.3,
    });
    
    // Initialize real transaction executor
    try {
      this.executor = new TransactionExecutor({
        rpcUrl: this.config.rpcUrl,
        privateKey: this.config.privateKey,
        chainId: this.config.chainId,
        maxGasPrice: this.config.maxGasPrice,
      });
      
      const executorStatus = this.executor.getStatus();
      this.status.walletAddress = executorStatus.walletAddress;
    } catch (error: any) {
      console.warn(`⚠️ Failed to initialize executor: ${error.message}`);
      console.warn('   Agent will run in simulation mode only');
      // Create a dummy executor for simulation mode
      this.executor = null as any;
    }
  }

  /**
   * Start the arbitrage agent
   */
  async start(): Promise<void> {
    if (this.status.isRunning) {
      console.log('⚠️ Agent is already running');
      return;
    }
    
    console.log('\n🤖 gSwap Arbitrage Agent Starting...\n');
    console.log('Configuration:');
    console.log(`  GraphQL: ${this.config.graphqlEndpoint}`);
    console.log(`  RPC: ${this.config.rpcUrl}`);
    console.log(`  Wallet: ${this.status.walletAddress || 'Not configured'}`);
    console.log(`  Min Profit: ${this.config.minProfitPercent}%`);
    console.log(`  Max Hops: ${this.config.maxHops}`);
    console.log(`  Auto Execute: ${this.config.autoExecute ? '✅' : '❌'}`);
    console.log(`  LLM: ${this.config.llmModel} (OpenRouter)`);
    console.log('');
    
    this.status.isRunning = true;
    
    // Run initial scan
    await this.scan();
    
    // Set up polling
    this.intervalId = setInterval(() => {
      this.scan().catch(err => {
        console.error('Scan error:', err);
        this.status.errors.push(err.message);
      });
    }, this.config.pollIntervalMs);
    
    console.log(`✅ Agent started. Polling every ${this.config.pollIntervalMs}ms`);
  }

  /**
   * Stop the arbitrage agent
   */
  stop(): void {
    if (!this.status.isRunning) {
      console.log('⚠️ Agent is not running');
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.status.isRunning = false;
    console.log('🛑 Agent stopped');
  }

  /**
   * Perform a single scan for arbitrage opportunities
   */
  async scan(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 Scanning for opportunities at ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    this.status.lastScan = new Date();
    
    try {
      // Get all tokens to scan from
      const tokens = await this.client.getAllTokens();
      
      // Find opportunities from each token
      const allOpportunities: ArbitrageOpportunity[] = [];
      
      for (const token of tokens) {
        console.log(`\n📊 Scanning from ${token.symbol}...`);
        const opportunities = await this.calculator.findOpportunities(token.address);
        allOpportunities.push(...opportunities);
      }
      
      this.status.opportunitiesFound += allOpportunities.length;
      
      if (allOpportunities.length === 0) {
        console.log('❌ No opportunities found this scan');
        return;
      }
      
      // Rank opportunities
      console.log(`\n🎯 Found ${allOpportunities.length} total opportunities`);
      console.log('\nTop 5 by net profit:');
      
      const topOpportunities = allOpportunities.slice(0, 5);
      for (let i = 0; i < topOpportunities.length; i++) {
        const opp = topOpportunities[i];
        console.log(`\n${i + 1}. ${opp.routeSymbols.join(' → ')}`);
        console.log(`   Net Profit: $${opp.netProfitUSD.toFixed(4)}`);
        console.log(`   Profit %: ${opp.profitPercent.toFixed(4)}%`);
        console.log(`   Gas: $${opp.gasCostUSD.toFixed(4)}`);
      }
      
      // Analyze and potentially execute top opportunities
      const toAnalyze = allOpportunities.slice(0, this.config.maxConcurrentOpportunities);
      
      for (const opportunity of toAnalyze) {
        await this.evaluateAndExecute(opportunity);
      }
      
    } catch (error: any) {
      console.error('❌ Scan failed:', error);
      this.status.errors.push(error.message);
    }
  }

  /**
   * Evaluate a single opportunity with LLM and execute if approved
   */
  private async evaluateAndExecute(opportunity: ArbitrageOpportunity): Promise<void> {
    console.log('\n' + '-'.repeat(60));
    console.log(this.calculator.formatOpportunity(opportunity));
    
    // Get pool details
    const pools = await this.calculator.getRoutePools(opportunity.route);
    
    // LLM Analysis
    console.log('\n🧠 Requesting LLM analysis...');
    const decision = await this.analyzer.analyzeOpportunity(opportunity, pools);
    
    console.log('\n📋 LLM Decision:');
    console.log(`  Should Execute: ${decision.shouldExecute ? '✅ YES' : '❌ NO'}`);
    console.log(`  Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    console.log(`  Urgency: ${decision.urgency.toUpperCase()}`);
    console.log(`  Reasoning: ${decision.reasoning}`);
    
    if (decision.risks.length > 0) {
      console.log(`  Risks: ${decision.risks.join(', ')}`);
    }
    
    // Execute if approved and auto-execute enabled
    if (decision.shouldExecute && this.config.autoExecute) {
      await this.executeOpportunity(opportunity, decision, pools);
    } else if (decision.shouldExecute && !this.config.autoExecute) {
      console.log('\n⚠️ Auto-execute is disabled. Skipping execution.');
      console.log('   Set autoExecute: true to enable automatic trading.');
    }
  }

  /**
   * Execute an arbitrage opportunity
   */
  private async executeOpportunity(
    opportunity: ArbitrageOpportunity,
    decision: ExecutionDecision,
    pools: Pool[]
  ): Promise<void> {
    console.log('\n🚀 Executing opportunity...');
    
    if (!this.executor) {
      console.log('❌ Executor not initialized. Cannot execute trades.');
      return;
    }
    
    // Pre-flight checks
    const checks = await this.executor.preflightChecks(opportunity);
    if (!checks.passed) {
      console.log('❌ Pre-flight checks failed:');
      checks.errors.forEach(e => console.log(`   - ${e}`));
      return;
    }
    
    // Execute
    const result = await this.executor.executeArbitrage(opportunity, decision, pools);
    
    if (result.success) {
      this.status.opportunitiesExecuted++;
      // Estimate profit in USD
      const profitUSD = Number(result.actualProfit) / 1e18 * this.config.ethPriceUSD;
      this.status.totalProfit += profitUSD;
      
      console.log('\n✅ Execution successful!');
      console.log(`   Hash: ${result.hash}`);
      console.log(`   Gas Used: ${result.gasUsed}`);
      console.log(`   Profit: ~$${profitUSD.toFixed(4)}`);
    } else {
      console.log('\n❌ Execution failed:', result.error);
    }
  }

  /**
   * Get market analysis from LLM
   */
  async analyzeMarket(): Promise<MarketAnalysis> {
    console.log('\n📊 Requesting market analysis...');
    
    // Get current opportunities
    const tokens = await this.client.getAllTokens();
    const allOpportunities: ArbitrageOpportunity[] = [];
    
    for (const token of tokens.slice(0, 2)) { // Limit for analysis
      const opportunities = await this.calculator.findOpportunities(token.address);
      allOpportunities.push(...opportunities);
    }
    
    const analysis = await this.analyzer.analyzeMarket(allOpportunities);
    
    console.log('\n📈 Market Analysis:');
    console.log(`  Summary: ${analysis.summary}`);
    console.log(`  Volatility: ${analysis.volatility}`);
    console.log(`  Trend: ${analysis.trend}`);
    console.log(`  Opportunities: ${analysis.opportunities.join(', ')}`);
    console.log(`  Warnings: ${analysis.warnings.join(', ')}`);
    
    return analysis;
  }

  /**
   * Manual execution of a specific opportunity
   */
  async manualExecute(opportunityId: string): Promise<TransactionResult | null> {
    console.log(`\n🔧 Manual execution for: ${opportunityId}`);
    
    if (!this.executor) {
      console.log('❌ Executor not initialized');
      return null;
    }
    
    // In a real implementation, we'd look up the opportunity
    // For now, scan and find matching ID
    const tokens = await this.client.getAllTokens();
    
    for (const token of tokens) {
      const opportunities = await this.calculator.findOpportunities(token.address);
      const match = opportunities.find(o => o.id === opportunityId);
      
      if (match) {
        const pools = await this.calculator.getRoutePools(match.route);
        const decision = await this.analyzer.analyzeOpportunity(match, pools);
        return this.executor.executeArbitrage(match, decision, pools);
      }
    }
    
    console.log('❌ Opportunity not found');
    return null;
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 100): ArbitrageTrade[] {
    if (this.executor) {
      return this.executor.getTradeHistory(limit);
    }
    return tradeHistory.slice(0, limit);
  }

  /**
   * Clear trade history
   */
  clearTradeHistory(): void {
    if (this.executor) {
      this.executor.clearTradeHistory();
    } else {
      tradeHistory.length = 0;
    }
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    return { ...this.status };
  }

  /**
   * Get configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Update component configs
    this.calculator = new ArbitrageCalculator(this.client, {
      minProfitPercent: this.config.minProfitPercent,
      maxHops: this.config.maxHops,
      gasPriceGwei: this.config.gasPriceGwei,
      ethPriceUSD: this.config.ethPriceUSD,
    });
    
    console.log('✅ Configuration updated');
  }
}

// Re-export trade history types
export { ArbitrageTrade, TransactionResult };

/**
 * Arbitrage Calculator
 * Finds and evaluates arbitrage opportunities in the DEX graph
 */

import { SubsquidClient, Pool } from '../graphql/client.js';
import { getTokenByAddress } from '../data/mockData.js';

export interface ArbitrageOpportunity {
  id: string;
  route: string[];
  routeSymbols: string[];
  amountIn: string;
  amountOut: string;
  profit: string;
  profitPercent: number;
  profitUSD: number;
  gasEstimate: number;
  gasCostUSD: number;
  netProfitUSD: number;
  pools: string[];
  viable: boolean;
  score: number; // Normalized score for ranking
}

export interface CalculatorConfig {
  minProfitPercent: number;
  maxHops: number;
  gasPriceGwei: number;
  ethPriceUSD: number;
  testAmounts: string[]; // Amounts to test for each route (in wei/units)
}

const DEFAULT_CONFIG: CalculatorConfig = {
  minProfitPercent: 0.1, // 0.1% minimum profit
  maxHops: 4,
  gasPriceGwei: 20,
  ethPriceUSD: 2000,
  testAmounts: [
    '1000000000000000000',    // 1 ETH
    '5000000000000000000',    // 5 ETH
    '10000000000000000000',   // 10 ETH
    '5000000000000000000000', // 5000 DAI
    '10000000000',            // 10000 USDC
  ],
};

export class ArbitrageCalculator {
  private client: SubsquidClient;
  private config: CalculatorConfig;

  constructor(client: SubsquidClient, config: Partial<CalculatorConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Find all arbitrage opportunities starting from a given token
   */
  async findOpportunities(startTokenAddress: string): Promise<ArbitrageOpportunity[]> {
    console.log(`🔍 Finding arbitrage routes from ${startTokenAddress}...`);
    
    // Get all possible routes
    const routes = await this.client.findArbitrageRoutes(
      startTokenAddress,
      this.config.maxHops
    );
    
    console.log(`📊 Found ${routes.length} potential routes`);
    
    // Evaluate each route with different amounts
    const opportunities: ArbitrageOpportunity[] = [];
    
    for (const route of routes) {
      for (const amountIn of this.config.testAmounts) {
        try {
          const opportunity = await this.evaluateRoute(route, amountIn);
          if (opportunity && opportunity.viable) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to evaluate route ${route.join(' -> ')}:`, error);
        }
      }
    }
    
    // Sort by net profit (highest first)
    opportunities.sort((a, b) => b.netProfitUSD - a.netProfitUSD);
    
    console.log(`✅ Found ${opportunities.length} viable opportunities`);
    return opportunities;
  }

  /**
   * Evaluate a specific route with a given input amount
   */
  async evaluateRoute(route: string[], amountIn: string): Promise<ArbitrageOpportunity | null> {
    const result = await this.client.calculateRouteProfit(route, amountIn);
    
    if (!result.viable) {
      return null;
    }
    
    // Get token symbols for readable route
    const routeSymbols = route.map(addr => {
      const token = getTokenByAddress(addr);
      return token?.symbol || addr.slice(0, 8);
    });
    
    // Calculate USD values
    const startToken = getTokenByAddress(route[0]);
    const amountInNum = Number(amountIn) / 10 ** (startToken?.decimals || 18);
    const profitNum = Number(result.profit) / 10 ** (startToken?.decimals || 18);
    
    // Estimate token price in USD (simplified)
    const tokenPriceUSD = this.estimateTokenPriceUSD(startToken?.symbol || '');
    const profitUSD = profitNum * tokenPriceUSD;
    const amountInUSD = amountInNum * tokenPriceUSD;
    
    // Calculate gas cost
    const gasCostETH = (Number(result.gasEstimate) * this.config.gasPriceGwei * 1e-9);
    const gasCostUSD = gasCostETH * this.config.ethPriceUSD;
    
    // Net profit after gas
    const netProfitUSD = profitUSD - gasCostUSD;
    
    // Profit percentage
    const profitPercent = amountInUSD > 0 ? (profitUSD / amountInUSD) * 100 : 0;
    
    // Skip if below minimum profit threshold
    if (profitPercent < this.config.minProfitPercent) {
      return null;
    }
    
    // Calculate score (net profit weighted by confidence)
    const score = this.calculateScore(netProfitUSD, profitPercent, route.length);
    
    return {
      id: `${route.join('-')}-${amountIn}`,
      route,
      routeSymbols,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      profit: result.profit,
      profitPercent,
      profitUSD,
      gasEstimate: Number(result.gasEstimate),
      gasCostUSD,
      netProfitUSD,
      pools: [], // Could be populated from route analysis
      viable: netProfitUSD > 0,
      score,
    };
  }

  /**
   * Get the best arbitrage opportunity from all possibilities
   */
  async getBestOpportunity(startTokenAddress: string): Promise<ArbitrageOpportunity | null> {
    const opportunities = await this.findOpportunities(startTokenAddress);
    
    if (opportunities.length === 0) {
      return null;
    }
    
    return opportunities[0];
  }

  /**
   * Calculate opportunity score based on multiple factors
   */
  private calculateScore(netProfitUSD: number, profitPercent: number, hopCount: number): number {
    // Factors:
    // - Higher net profit is better
    // - Higher profit percentage is better (more buffer for slippage)
    // - Fewer hops is better (less complexity, lower risk)
    
    const profitWeight = 0.5;
    const percentWeight = 0.3;
    const hopWeight = 0.2;
    
    const normalizedProfit = Math.min(netProfitUSD / 100, 1); // Cap at $100
    const normalizedPercent = Math.min(profitPercent / 10, 1); // Cap at 10%
    const normalizedHops = 1 / hopCount; // Inverse of hop count
    
    return (
      normalizedProfit * profitWeight +
      normalizedPercent * percentWeight +
      normalizedHops * hopWeight
    );
  }

  /**
   * Estimate token price in USD (simplified)
   */
  private estimateTokenPriceUSD(symbol: string): number {
    const prices: Record<string, number> = {
      'WETH': 2000,
      'ETH': 2000,
      'USDC': 1,
      'DAI': 1,
      'USDT': 1,
      'WBTC': 40000,
      'BTC': 40000,
    };
    return prices[symbol] || 0;
  }

  /**
   * Get all pools involved in a route
   */
  async getRoutePools(route: string[]): Promise<Pool[]> {
    const pools: Pool[] = [];
    
    for (let i = 0; i < route.length - 1; i++) {
      const tokenIn = route[i];
      const tokenOut = route[i + 1];
      
      // Find pool for this pair
      const candidatePools = await this.client.getPoolsByToken(tokenIn);
      const pool = candidatePools.find(p => 
        p.token0.address.toLowerCase() === tokenOut.toLowerCase() ||
        p.token1.address.toLowerCase() === tokenOut.toLowerCase()
      );
      
      if (pool) {
        pools.push(pool);
      }
    }
    
    return pools;
  }

  /**
   * Format opportunity for display
   */
  formatOpportunity(opp: ArbitrageOpportunity): string {
    const routeStr = opp.routeSymbols.join(' → ');
    return `
┌─────────────────────────────────────────────────────────────┐
│ 🤖 ARBITRAGE OPPORTUNITY                                    │
├─────────────────────────────────────────────────────────────┤
│ Route: ${routeStr.padEnd(52)}│
│ Input: ${(Number(opp.amountIn) / 1e18).toFixed(6).padEnd(52)}│
│ Output: ${(Number(opp.amountOut) / 1e18).toFixed(6).padEnd(51)}│
├─────────────────────────────────────────────────────────────┤
│ Profit: $${opp.profitUSD.toFixed(4).padEnd(50)}│
│ Profit %: ${(opp.profitPercent).toFixed(4)}%${''.padEnd(47)}│
│ Gas Cost: $${opp.gasCostUSD.toFixed(4).padEnd(49)}│
│ Net Profit: $${opp.netProfitUSD.toFixed(4).padEnd(47)}│
│ Score: ${opp.score.toFixed(4).padEnd(53)}│
└─────────────────────────────────────────────────────────────┘
    `.trim();
  }
}

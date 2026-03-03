/**
 * OpenRouter LLM Analyzer
 * Analyzes arbitrage opportunities and decides execution strategy
 */

import { execSync } from 'child_process';
import { ArbitrageOpportunity } from '../arbitrage/calculator.js';
import { Pool } from '../graphql/client.js';

export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ExecutionDecision {
  shouldExecute: boolean;
  confidence: number;
  reasoning: string;
  recommendedAmount: string;
  maxSlippage: number;
  urgency: 'low' | 'medium' | 'high';
  risks: string[];
  alternatives?: string[];
}

export interface MarketAnalysis {
  summary: string;
  volatility: 'low' | 'medium' | 'high';
  trend: 'bullish' | 'bearish' | 'neutral';
  opportunities: string[];
  warnings: string[];
}

const DEFAULT_CONFIG: LLMConfig = {
  apiKey: process.env.OPENROUTER_API_KEY || '',
  model: process.env.OPENROUTER_MODEL || 'qwen/qwen3-coder:free',
  maxTokens: 2000,
  temperature: 0.3,
};

export class LLMAnalyzer {
  private config: LLMConfig;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a specific arbitrage opportunity
   */
  async analyzeOpportunity(
    opportunity: ArbitrageOpportunity,
    pools: Pool[],
    marketContext?: string
  ): Promise<ExecutionDecision> {
    const prompt = this.buildOpportunityPrompt(opportunity, pools, marketContext);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseDecision(response);
    } catch (error) {
      console.error('❌ LLM analysis failed:', error);
      return {
        shouldExecute: false,
        confidence: 0,
        reasoning: 'LLM analysis failed, defaulting to conservative (no execution)',
        recommendedAmount: opportunity.amountIn,
        maxSlippage: 0.5,
        urgency: 'low',
        risks: ['LLM analysis unavailable'],
      };
    }
  }

  /**
   * Analyze overall market conditions
   */
  async analyzeMarket(
    opportunities: ArbitrageOpportunity[],
    recentSwaps?: string
  ): Promise<MarketAnalysis> {
    const prompt = this.buildMarketPrompt(opportunities, recentSwaps);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseMarketAnalysis(response);
    } catch (error) {
      console.error('❌ Market analysis failed:', error);
      return {
        summary: 'Market analysis unavailable',
        volatility: 'medium',
        trend: 'neutral',
        opportunities: [],
        warnings: ['Analysis service unavailable'],
      };
    }
  }

  /**
   * Compare multiple opportunities
   */
  async rankOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): Promise<{ ranked: ArbitrageOpportunity[]; reasoning: string }> {
    if (opportunities.length === 0) {
      return { ranked: [], reasoning: 'No opportunities to rank' };
    }
    
    if (opportunities.length === 1) {
      return { ranked: opportunities, reasoning: 'Only one opportunity available' };
    }

    const prompt = this.buildRankingPrompt(opportunities);
    
    try {
      const response = await this.callLLM(prompt);
      const ranking = this.parseRanking(response, opportunities);
      return {
        ranked: ranking,
        reasoning: response,
      };
    } catch (error) {
      console.error('❌ Ranking failed:', error);
      return {
        ranked: [...opportunities].sort((a, b) => b.netProfitUSD - a.netProfitUSD),
        reasoning: 'Fallback ranking by net profit (LLM unavailable)',
      };
    }
  }

  /**
   * Call OpenRouter API using curl
   */
  private async callLLM(prompt: string, retries = 3): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const payload = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert DeFi arbitrage analyst. Analyze opportunities and provide structured decisions. Be concise but thorough.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };

    const payloadStr = JSON.stringify(payload);
    // Write payload to temp file to avoid shell escaping issues
    const tmpFile = `/tmp/gswap_payload_${Date.now()}.json`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Write payload to temp file
        execSync(`cat > ${tmpFile} << 'PAYLOAD_EOF'
${payloadStr}
PAYLOAD_EOF`);

        const cmd = `curl -s -w "\\nHTTP_CODE:%{http_code}" -X POST https://openrouter.ai/api/v1/chat/completions \
          -H "Authorization: Bearer ${this.config.apiKey}" \
          -H "Content-Type: application/json" \
          -H "HTTP-Referer: https://gswap.io" \
          -H "X-Title: gSwap Arbitrage Agent" \
          -d @${tmpFile}`;

        const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
        
        // Clean up temp file
        try { execSync(`rm ${tmpFile}`); } catch {}

        // Parse response (split off HTTP code line)
        const body = result.split('\nHTTP_CODE:')[0];

        let data;
        try {
          data = JSON.parse(body);
        } catch {
          throw new Error(`Invalid JSON response: ${body.slice(0, 200)}`);
        }

        if (data.error) {
          if (data.error.code === 429 || data.error.message?.includes('rate-limited')) {
            const delay = attempt * 2000;
            console.log(`   Rate limited (429), waiting ${delay}ms before retry ${attempt}/${retries}...`);
            await this.sleep(delay);
            continue;
          }
          throw new Error(`API error: ${data.error.message}`);
        }

        return data.choices[0]?.message?.content || '';
      } catch (error: any) {
        console.log(`   DEBUG: Error:`, error.message);
        // Clean up temp file on error
        try { execSync(`rm ${tmpFile}`); } catch {}
        
        if (attempt === retries) {
          throw error;
        }
        console.log(`   Request failed, retry ${attempt + 1}/${retries}...`);
        await this.sleep(1000 * attempt);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildOpportunityPrompt(
    opp: ArbitrageOpportunity,
    pools: Pool[],
    marketContext?: string
  ): string {
    const poolInfo = pools.map(p => 
      `- ${p.token0.symbol}/${p.token1.symbol}: Reserves ${p.reserve0}/${p.reserve1}, Fee ${p.swapFee}bp`
    ).join('\n');

    return `
[EXECUTE_DECISION]
Analyze this arbitrage opportunity and decide whether to execute:

Route: ${opp.routeSymbols.join(' → ')}
Input Amount: ${opp.amountIn}
Expected Output: ${opp.amountOut}
Gross Profit: $${opp.profitUSD.toFixed(4)}
Profit %: ${opp.profitPercent.toFixed(4)}%
Gas Cost: $${opp.gasCostUSD.toFixed(4)}
Net Profit: $${opp.netProfitUSD.toFixed(4)}

Pool Information:
${poolInfo}

${marketContext ? `Market Context:\n${marketContext}\n` : ''}

Provide your decision in this format:
SHOULD_EXECUTE: [true/false]
CONFIDENCE: [0.0-1.0]
REASONING: [Your analysis]
RECOMMENDED_AMOUNT: [same/increase/decrease/specific amount]
MAX_SLIPPAGE: [percentage]
URGENCY: [low/medium/high]
RISKS: [risk1, risk2, ...]
    `.trim();
  }

  private buildMarketPrompt(
    opportunities: ArbitrageOpportunity[],
    recentSwaps?: string
  ): string {
    const oppSummary = opportunities.slice(0, 5).map((opp, i) => 
      `${i + 1}. ${opp.routeSymbols.join(' → ')}: $${opp.netProfitUSD.toFixed(4)} net profit`
    ).join('\n');

    return `
[MARKET_ANALYSIS]
Analyze the current market conditions based on these arbitrage opportunities:

Top Opportunities:
${oppSummary}

${recentSwaps ? `Recent Activity:\n${recentSwaps}\n` : ''}

Provide analysis in this format:
SUMMARY: [Brief market overview]
VOLATILITY: [low/medium/high]
TREND: [bullish/bearish/neutral]
OPPORTUNITIES: [observation1, observation2, ...]
WARNINGS: [warning1, warning2, ...]
    `.trim();
  }

  private buildRankingPrompt(opportunities: ArbitrageOpportunity[]): string {
    const oppList = opportunities.map((opp, i) => 
      `${i + 1}. ID: ${opp.id}\n   Route: ${opp.routeSymbols.join(' → ')}\n   Net Profit: $${opp.netProfitUSD.toFixed(4)}\n   Score: ${opp.score.toFixed(4)}`
    ).join('\n\n');

    return `
[RANK_OPPORTUNITIES]
Rank these arbitrage opportunities by execution priority. Consider:
- Net profit (after gas)
- Profit percentage (buffer for slippage)
- Route complexity (fewer hops = lower risk)
- Current market conditions

Opportunities:
${oppList}

Provide the ranking as a comma-separated list of IDs in priority order (best first).
Example: opp-123, opp-456, opp-789

Also provide brief reasoning for your top pick.
    `.trim();
  }

  private parseDecision(response: string): ExecutionDecision {
    // Remove markdown bold (**)
    const cleanResponse = response.replace(/\*\*/g, '');
    const lines = cleanResponse.split('\n');
    const decision: Partial<ExecutionDecision> = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      switch (key.trim()) {
        case 'SHOULD_EXECUTE':
          decision.shouldExecute = value.toLowerCase() === 'true';
          break;
        case 'CONFIDENCE':
          decision.confidence = parseFloat(value) || 0;
          break;
        case 'REASONING':
          decision.reasoning = value;
          break;
        case 'RECOMMENDED_AMOUNT':
          decision.recommendedAmount = value;
          break;
        case 'MAX_SLIPPAGE':
          decision.maxSlippage = parseFloat(value) || 1.0;
          break;
        case 'URGENCY':
          decision.urgency = (value as any) || 'medium';
          break;
        case 'RISKS':
          decision.risks = value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(r => r.trim())
            .filter(r => r);
          break;
      }
    }
    
    return {
      shouldExecute: decision.shouldExecute ?? false,
      confidence: decision.confidence ?? 0,
      reasoning: decision.reasoning ?? 'No reasoning provided',
      recommendedAmount: decision.recommendedAmount ?? 'same',
      maxSlippage: decision.maxSlippage ?? 1.0,
      urgency: decision.urgency ?? 'low',
      risks: decision.risks ?? [],
    };
  }

  private parseMarketAnalysis(response: string): MarketAnalysis {
    const lines = response.split('\n');
    const analysis: Partial<MarketAnalysis> = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();
      
      switch (key.trim()) {
        case 'SUMMARY':
          analysis.summary = value;
          break;
        case 'VOLATILITY':
          analysis.volatility = value as any;
          break;
        case 'TREND':
          analysis.trend = value as any;
          break;
        case 'OPPORTUNITIES':
          analysis.opportunities = value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(o => o.trim())
            .filter(o => o);
          break;
        case 'WARNINGS':
          analysis.warnings = value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(w => w.trim())
            .filter(w => w);
          break;
      }
    }
    
    return {
      summary: analysis.summary ?? 'No summary provided',
      volatility: analysis.volatility ?? 'medium',
      trend: analysis.trend ?? 'neutral',
      opportunities: analysis.opportunities ?? [],
      warnings: analysis.warnings ?? [],
    };
  }

  private parseRanking(
    response: string,
    opportunities: ArbitrageOpportunity[]
  ): ArbitrageOpportunity[] {
    const match = response.match(/([\w-]+(?:,\s*[\w-]+)*)/);
    if (!match) return opportunities;
    
    const ids = match[1].split(',').map(id => id.trim());
    const oppMap = new Map(opportunities.map(o => [o.id, o]));
    
    const ranked: ArbitrageOpportunity[] = [];
    for (const id of ids) {
      const opp = oppMap.get(id);
      if (opp) {
        ranked.push(opp);
        oppMap.delete(id);
      }
    }
    
    return [...ranked, ...oppMap.values()];
  }
}

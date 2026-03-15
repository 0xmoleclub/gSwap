/**
 * Transaction Executor using viem
 * Handles blockchain interactions for executing arbitrage trades
 */

import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  type Hex,
  type TransactionReceipt,
  encodeFunctionData,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ArbitrageOpportunity } from '../arbitrage/calculator.js';
import { ExecutionDecision } from '../llm/analyzer.js';
import { Pool } from '../graphql/client.js';

// Polkadot Hub EVM Chain Configuration
const POLKADOT_HUB_EVM = {
  id: 420420417,
  name: 'Polkadot Hub EVM',
  nativeCurrency: {
    name: 'DOT',
    symbol: 'DOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://services.polkadothub-rpc.com/testnet'],
    },
  },
};

export interface ExecutorConfig {
  rpcUrl: string;
  privateKey: string;
  chainId: number;
  maxGasPrice: bigint;
  minConfirmations: number;
  flashloanEnabled: boolean;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  gasUsed?: bigint;
  gasCost?: bigint;
  actualProfit?: bigint;
  error?: string;
  receipt?: TransactionReceipt;
}

export interface SwapStep {
  pool: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
}

export interface ArbitrageTrade {
  id: string;
  timestamp: number;
  route: string[];
  routeSymbols: string[];
  amountIn: string;
  amountOut: string;
  profit: string;
  profitUSD: number;
  gasCost: string;
  gasCostUSD: number;
  netProfitUSD: number;
  txHash: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

// ERC20 ABI for approvals
const ERC20_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
]);

// gPool ABI for swaps
const GPOOL_ABI = parseAbi([
  'function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut, uint256 deadline) external returns (uint256 amountOut)',
  'function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external view returns (uint256)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function reserve0() external view returns (uint256)',
  'function reserve1() external view returns (uint256)',
]);

const DEFAULT_CONFIG: ExecutorConfig = {
  rpcUrl: process.env.RPC_URL || 'https://services.polkadothub-rpc.com/testnet',
  privateKey: process.env.PRIVATE_KEY || '',
  chainId: parseInt(process.env.CHAIN_ID || '420420417'),
  maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '500000000000'), // 500 gwei
  minConfirmations: 1,
  flashloanEnabled: false,
};

// In-memory trade history (will be replaced with proper storage in production)
const tradeHistory: ArbitrageTrade[] = [];

export class TransactionExecutor {
  private config: ExecutorConfig;
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private account: ReturnType<typeof privateKeyToAccount>;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (!this.config.privateKey) {
      throw new Error('Private key is required for transaction execution');
    }
    
    // Ensure private key has 0x prefix
    const pk = this.config.privateKey.startsWith('0x') 
      ? this.config.privateKey as Hex
      : `0x${this.config.privateKey}` as Hex;
    
    this.account = privateKeyToAccount(pk);
    
    this.publicClient = createPublicClient({
      chain: POLKADOT_HUB_EVM,
      transport: http(this.config.rpcUrl),
    });
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: POLKADOT_HUB_EVM,
      transport: http(this.config.rpcUrl),
    });
    
    console.log(`🚀 TransactionExecutor initialized for wallet: ${this.account.address}`);
  }

  /**
   * Execute an arbitrage transaction
   */
  async executeArbitrage(
    opportunity: ArbitrageOpportunity,
    decision: ExecutionDecision,
    pools: Pool[]
  ): Promise<TransactionResult> {
    console.log('\n🚀 EXECUTING ARBITRAGE...');
    console.log(`Route: ${opportunity.routeSymbols.join(' → ')}`);
    console.log(`Expected Profit: $${opportunity.netProfitUSD.toFixed(4)}`);
    
    // Validate decision
    if (!decision.shouldExecute) {
      return {
        success: false,
        error: 'LLM decision: do not execute',
      };
    }

    // Check confidence threshold
    if (decision.confidence < 0.6) {
      return {
        success: false,
        error: `Confidence too low: ${decision.confidence}`,
      };
    }

    // Prepare swap steps
    const steps = await this.prepareSwapSteps(opportunity, pools);
    
    // Execute the arbitrage
    const result = await this.executeSwaps(steps, opportunity);
    
    // Record trade in history
    this.recordTrade(opportunity, result);
    
    return result;
  }

  /**
   * Prepare swap steps from opportunity
   */
  private async prepareSwapSteps(
    opportunity: ArbitrageOpportunity,
    pools: Pool[]
  ): Promise<SwapStep[]> {
    const steps: SwapStep[] = [];
    const route = opportunity.route;
    
    for (let i = 0; i < route.length - 1; i++) {
      const tokenIn = route[i];
      const tokenOut = route[i + 1];
      
      // Find pool
      const pool = pools.find(p => 
        (p.token0.address.toLowerCase() === tokenIn.toLowerCase() &&
         p.token1.address.toLowerCase() === tokenOut.toLowerCase()) ||
        (p.token1.address.toLowerCase() === tokenIn.toLowerCase() &&
         p.token0.address.toLowerCase() === tokenOut.toLowerCase())
      );
      
      if (!pool) {
        throw new Error(`No pool found for ${tokenIn} -> ${tokenOut}`);
      }
      
      // Calculate minAmountOut with 0.5% slippage tolerance
      const poolContract = {
        address: pool.address as Hex,
        abi: GPOOL_ABI,
      };
      
      const [reserve0, reserve1, token0Addr] = await Promise.all([
        this.publicClient.readContract({
          ...poolContract,
          functionName: 'reserve0',
        }),
        this.publicClient.readContract({
          ...poolContract,
          functionName: 'reserve1',
        }),
        this.publicClient.readContract({
          ...poolContract,
          functionName: 'token0',
        }),
      ]);
      
      const reserveIn = token0Addr.toLowerCase() === tokenIn.toLowerCase() ? reserve0 : reserve1;
      const reserveOut = token0Addr.toLowerCase() === tokenIn.toLowerCase() ? reserve1 : reserve0;
      
      const amountIn = i === 0 ? BigInt(opportunity.amountIn) : steps[i-1].minAmountOut;
      
      const amountOut = await this.publicClient.readContract({
        ...poolContract,
        functionName: 'getAmountOut',
        args: [amountIn, reserveIn, reserveOut],
      });
      
      // 0.5% slippage tolerance
      const minAmountOut = (amountOut * 995n) / 1000n;
      
      steps.push({
        pool: pool.address,
        tokenIn,
        tokenOut,
        amountIn,
        minAmountOut,
      });
    }
    
    return steps;
  }

  /**
   * Execute swaps sequentially
   */
  private async executeSwaps(
    steps: SwapStep[],
    opportunity: ArbitrageOpportunity
  ): Promise<TransactionResult> {
    const txHashes: Hex[] = [];
    let totalGasUsed = 0n;
    
    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        console.log(`\n  Step ${i + 1}/${steps.length}: ${step.tokenIn.slice(0, 10)}... → ${step.tokenOut.slice(0, 10)}...`);
        
        // Approve tokens if first step
        if (i === 0) {
          await this.approveToken(step.tokenIn as Hex, step.pool as Hex, step.amountIn);
        }
        
        // Execute swap
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min deadline
        
        const txHash = await this.walletClient.writeContract({
          address: step.pool as Hex,
          abi: GPOOL_ABI,
          functionName: 'swap',
          args: [
            step.tokenIn,
            step.amountIn,
            step.minAmountOut,
            deadline,
          ],
        });
        
        console.log(`  Transaction submitted: ${txHash}`);
        
        // Wait for confirmation
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
          confirmations: this.config.minConfirmations,
        });
        
        if (receipt.status === 'reverted') {
          throw new Error(`Transaction reverted: ${txHash}`);
        }
        
        console.log(`  Confirmed! Gas used: ${receipt.gasUsed}`);
        txHashes.push(txHash);
        totalGasUsed += receipt.gasUsed;
      }
      
      // Calculate actual profit
      const gasPrice = await this.publicClient.getGasPrice();
      const gasCost = totalGasUsed * gasPrice;
      const profit = BigInt(opportunity.profit);
      
      return {
        success: true,
        hash: txHashes[0], // Return first tx hash as primary
        gasUsed: totalGasUsed,
        gasCost,
        actualProfit: profit,
      };
      
    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Approve token spending
   */
  private async approveToken(token: Hex, spender: Hex, amount: bigint): Promise<void> {
    // Check current allowance
    const currentAllowance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [this.account.address, spender],
    });
    
    if (currentAllowance >= amount) {
      console.log(`  Token already approved`);
      return;
    }
    
    console.log(`  Approving token...`);
    
    const txHash = await this.walletClient.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });
    
    await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: this.config.minConfirmations,
    });
    
    console.log(`  Approved!`);
  }

  /**
   * Record trade in history
   */
  private recordTrade(opportunity: ArbitrageOpportunity, result: TransactionResult): void {
    const trade: ArbitrageTrade = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      route: opportunity.route,
      routeSymbols: opportunity.routeSymbols,
      amountIn: opportunity.amountIn,
      amountOut: opportunity.amountOut,
      profit: opportunity.profit,
      profitUSD: opportunity.profitUSD,
      gasCost: result.gasCost?.toString() || '0',
      gasCostUSD: opportunity.gasCostUSD,
      netProfitUSD: opportunity.netProfitUSD,
      txHash: result.hash || '',
      status: result.success ? 'success' : 'failed',
      error: result.error,
    };
    
    tradeHistory.unshift(trade); // Add to beginning
    
    // Keep only last 1000 trades
    if (tradeHistory.length > 1000) {
      tradeHistory.pop();
    }
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 100): ArbitrageTrade[] {
    return tradeHistory.slice(0, limit);
  }

  /**
   * Clear trade history
   */
  clearTradeHistory(): void {
    tradeHistory.length = 0;
  }

  /**
   * Check wallet balance
   */
  async getBalance(token?: string): Promise<bigint> {
    if (token) {
      return this.publicClient.readContract({
        address: token as Hex,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.account.address],
      });
    }
    
    return this.publicClient.getBalance({
      address: this.account.address,
    });
  }

  /**
   * Check if we have enough balance for the trade
   */
  async validateBalance(opportunity: ArbitrageOpportunity): Promise<boolean> {
    const startToken = opportunity.route[0];
    const balance = await this.getBalance(startToken);
    const required = BigInt(opportunity.amountIn);
    
    console.log(`\n💰 Balance Check:`);
    console.log(`  Required: ${required}`);
    console.log(`  Available: ${balance}`);
    console.log(`  Sufficient: ${balance >= required ? '✅' : '❌'}`);
    
    return balance >= required;
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    return this.publicClient.getGasPrice();
  }

  /**
   * Validate that gas price is acceptable
   */
  async validateGasPrice(): Promise<boolean> {
    const gasPrice = await this.getGasPrice();
    const valid = gasPrice <= this.config.maxGasPrice;
    
    console.log(`\n⛽ Gas Check:`);
    console.log(`  Current: ${gasPrice} wei`);
    console.log(`  Max Allowed: ${this.config.maxGasPrice} wei`);
    console.log(`  Acceptable: ${valid ? '✅' : '❌'}`);
    
    return valid;
  }

  /**
   * Pre-flight checks before execution
   */
  async preflightChecks(opportunity: ArbitrageOpportunity): Promise<{
    passed: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Check balance
    const hasBalance = await this.validateBalance(opportunity);
    if (!hasBalance) {
      errors.push('Insufficient balance');
    }
    
    // Check gas price
    const gasOk = await this.validateGasPrice();
    if (!gasOk) {
      errors.push('Gas price too high');
    }
    
    // Check opportunity not expired
    if (opportunity.profitPercent < 0.05) {
      errors.push('Opportunity profit too low');
    }
    
    return {
      passed: errors.length === 0,
      errors,
    };
  }

  /**
   * Get executor status
   */
  getStatus(): {
    chainId: number;
    rpcUrl: string;
    maxGasPrice: string;
    walletAddress: string;
    tradeCount: number;
  } {
    return {
      chainId: this.config.chainId,
      rpcUrl: this.config.rpcUrl,
      maxGasPrice: this.config.maxGasPrice.toString(),
      walletAddress: this.account.address,
      tradeCount: tradeHistory.length,
    };
  }
}

// Export trade history for external access
export { tradeHistory };

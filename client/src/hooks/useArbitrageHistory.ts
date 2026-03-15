'use client';

import { useState, useEffect, useCallback } from 'react';

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

interface ArbitrageStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfitUSD: number;
  totalGasCostUSD: number;
  netProfitUSD: number;
  avgProfitPerTrade: number;
}

interface UseArbitrageHistoryReturn {
  trades: ArbitrageTrade[];
  stats: ArbitrageStats;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

// Simulated trade history for demo purposes
// In production, this would fetch from the agent's API or GraphQL
const MOCK_TRADES: ArbitrageTrade[] = [
  {
    id: '1',
    timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    route: ['0x...', '0x...', '0x...', '0x...'],
    routeSymbols: ['WETH', 'USDC', 'USDT', 'WETH'],
    amountIn: '1000000000000000000',
    amountOut: '1005000000000000000',
    profit: '5000000000000000',
    profitUSD: 10.5,
    gasCost: '150000000000000',
    gasCostUSD: 0.3,
    netProfitUSD: 10.2,
    txHash: '0xabc123...',
    status: 'success',
  },
  {
    id: '2',
    timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    route: ['0x...', '0x...', '0x...'],
    routeSymbols: ['USDC', 'DAI', 'USDC'],
    amountIn: '5000000000',
    amountOut: '5020000000',
    profit: '20000000',
    profitUSD: 20,
    gasCost: '120000000000000',
    gasCostUSD: 0.24,
    netProfitUSD: 19.76,
    txHash: '0xdef456...',
    status: 'success',
  },
  {
    id: '3',
    timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    route: ['0x...', '0x...', '0x...', '0x...', '0x...'],
    routeSymbols: ['WBTC', 'WETH', 'USDC', 'USDT', 'WBTC'],
    amountIn: '100000000',
    amountOut: '100000000',
    profit: '0',
    profitUSD: 0,
    gasCost: '180000000000000',
    gasCostUSD: 0.36,
    netProfitUSD: -0.36,
    txHash: '0xghi789...',
    status: 'failed',
    error: 'Slippage exceeded',
  },
];

export function useArbitrageHistory(pollInterval = 5000): UseArbitrageHistoryReturn {
  const [trades, setTrades] = useState<ArbitrageTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      // In production, this would be an API call to the agent
      // For demo, we use mock data with some randomization
      const randomizedTrades = MOCK_TRADES.map(trade => ({
        ...trade,
        profitUSD: trade.profitUSD + (Math.random() - 0.5) * 2,
        netProfitUSD: trade.netProfitUSD + (Math.random() - 0.5) * 2,
      }));
      
      setTrades(randomizedTrades);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch arbitrage history'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    
    if (pollInterval > 0) {
      const interval = setInterval(fetchHistory, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHistory, pollInterval]);

  const stats: ArbitrageStats = {
    totalTrades: trades.length,
    successfulTrades: trades.filter(t => t.status === 'success').length,
    failedTrades: trades.filter(t => t.status === 'failed').length,
    totalProfitUSD: trades.reduce((sum, t) => sum + (t.profitUSD || 0), 0),
    totalGasCostUSD: trades.reduce((sum, t) => sum + (t.gasCostUSD || 0), 0),
    netProfitUSD: trades.reduce((sum, t) => sum + (t.netProfitUSD || 0), 0),
    avgProfitPerTrade: trades.length > 0 
      ? trades.reduce((sum, t) => sum + (t.netProfitUSD || 0), 0) / trades.length 
      : 0,
  };

  return {
    trades,
    stats,
    loading,
    error,
    refresh: fetchHistory,
  };
}

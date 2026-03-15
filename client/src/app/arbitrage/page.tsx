'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Header } from '@/components/Header';
import { Starfield } from '@/components/Starfield';
import { NebulaBg } from '@/components/NebulaBg';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { useArbitrageHistory } from '@/hooks/useArbitrageHistory';
import { globalStyles } from '@/styles/global-styles';

export default function ArbitragePage() {
  const { trades, stats, loading, refresh } = useArbitrageHistory(5000);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-emerald-400';
      case 'pending':
        return 'text-amber-400';
      case 'failed':
        return 'text-rose-400';
      default:
        return 'text-white/50';
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-void overflow-hidden font-sans text-white noise-overlay">
      <style>{globalStyles}</style>

      {loading && <LoadingOverlay />}

      {/* Galaxy layers */}
      <NebulaBg />
      <Starfield count={150} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <Navbar currentView="arbitrage" />

        {/* Main content */}
        <main className="flex-1 container mx-auto px-6 py-8 pt-24">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-display font-bold text-white mb-2">
                  Arbitrage Agent
                </h1>
                <p className="text-white/50 font-body">
                  Real-time arbitrage trading history and performance metrics
                </p>
              </div>
              <button
                onClick={refresh}
                className="px-4 py-2 rounded-xl bg-nebula-purple/20 border border-nebula-purple/30 
                         hover:bg-nebula-purple/30 transition-all duration-300 text-sm font-medium
                         flex items-center gap-2"
              >
                <span>🔄</span> Refresh
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Trades"
                value={stats.totalTrades.toString()}
                subtitle={`${stats.successfulTrades} successful, ${stats.failedTrades} failed`}
                icon="📊"
                color="blue"
              />
              <StatCard
                title="Net Profit"
                value={formatCurrency(stats.netProfitUSD)}
                subtitle={`Gas costs: ${formatCurrency(stats.totalGasCostUSD)}`}
                icon="💰"
                color={stats.netProfitUSD >= 0 ? 'emerald' : 'rose'}
              />
              <StatCard
                title="Total Profit"
                value={formatCurrency(stats.totalProfitUSD)}
                subtitle="Before gas costs"
                icon="📈"
                color="emerald"
              />
              <StatCard
                title="Avg per Trade"
                value={formatCurrency(stats.avgProfitPerTrade)}
                subtitle="Net profit average"
                icon="🎯"
                color="purple"
              />
            </div>

            {/* Trade History Table */}
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold">Trade History</h2>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Updates
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                        Route
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">
                        Gas Cost
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">
                        Net Profit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                        Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trades.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                          <div className="flex flex-col items-center gap-3">
                            <span className="text-4xl">🤖</span>
                            <p>No trades yet. The agent is scanning for opportunities...</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trades.map((trade) => (
                        <tr
                          key={trade.id}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => setSelectedTrade(selectedTrade === trade.id ? null : trade.id)}
                        >
                          <td className="px-6 py-4">
                            <span className={`text-lg ${getStatusColor(trade.status)}`}>
                              {getStatusIcon(trade.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-white/70">
                            {formatTime(trade.timestamp)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              {trade.routeSymbols.map((symbol, i) => (
                                <span key={i} className="flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded bg-nebula-purple/20 text-nebula-purple text-xs">
                                    {symbol}
                                  </span>
                                  {i < trade.routeSymbols.length - 1 && (
                                    <span className="text-white/30">→</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-emerald-400">
                            +{formatCurrency(trade.profitUSD)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-white/50">
                            {formatCurrency(trade.gasCostUSD)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <span className={trade.netProfitUSD >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {trade.netProfitUSD >= 0 ? '+' : ''}
                              {formatCurrency(trade.netProfitUSD)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <a
                              href={`https://blockscout-testnet.polkadot.io/tx/${trade.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-nebula-blue hover:text-nebula-purple transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {trade.txHash.slice(0, 10)}...{trade.txHash.slice(-6)}
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Agent Status Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>⚙️</span> Agent Configuration
                </h3>
                <div className="space-y-3 text-sm">
                  <ConfigRow label="Min Profit Threshold" value="0.1%" />
                  <ConfigRow label="Max Hops" value="4" />
                  <ConfigRow label="Poll Interval" value="5 seconds" />
                  <ConfigRow label="Auto Execute" value="Enabled ✅" />
                  <ConfigRow label="LLM Model" value="qwen/qwen3-coder:free" />
                </div>
              </div>

              <div className="glass-panel rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                  <span>📡</span> Live Status
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Agent Status</span>
                    <span className="flex items-center gap-2 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      Running
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">GraphQL Endpoint</span>
                    <span className="text-nebula-blue">localhost:4000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">RPC Endpoint</span>
                    <span className="text-nebula-blue">Polkadot Hub EVM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Last Scan</span>
                    <span className="text-white/70">Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'emerald' | 'rose' | 'purple';
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-nebula-blue/20 to-nebula-blue/5 border-nebula-blue/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/20',
    purple: 'from-nebula-purple/20 to-nebula-purple/5 border-nebula-purple/20',
  };

  return (
    <div className={`glass-panel rounded-xl p-5 border bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl font-display font-bold text-white">{value}</p>
          <p className="text-xs text-white/40 mt-1">{subtitle}</p>
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// Config Row Component
function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
      <span className="text-white/50">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

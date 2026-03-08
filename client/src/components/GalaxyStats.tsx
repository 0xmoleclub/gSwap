'use client';

import { IndexerStats } from '@/types/token';

interface GalaxyStatsProps {
  stats?: IndexerStats;
}

export function GalaxyStats({ stats }: GalaxyStatsProps) {
  if (!stats) return null;

  const items = [
    { label: 'Pools', value: stats.totalPools.toString(), color: 'nebula-purple' },
    { label: 'Tokens', value: stats.totalTokens.toString(), color: 'nebula-blue' },
    { label: 'Txns', value: stats.totalTxCount.toString(), color: 'aurora-green' },
    { label: 'Volume', value: stats.totalVolume, color: 'aurora-cyan' },
  ];

  return (
    <div className="flex items-center gap-1 animate-fadeIn stagger-3">
      {items.map((item, i) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.04]"
        >
          <div className={`w-1 h-1 rounded-full bg-${item.color}`} />
          <span className="font-data text-[9px] text-white/40 uppercase tracking-wider">{item.label}</span>
          <span className="font-data text-[10px] text-white/80 font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

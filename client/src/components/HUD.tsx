import { IndexerStats } from '@/types/token';

interface HUDProps {
  stats?: IndexerStats;
}

export function HUD({ stats }: HUDProps) {
  if (!stats) return null;

  return (
    <div className="absolute left-0 bottom-14 pointer-events-auto hidden md:block animate-slideInLeft">
      <div className="glass-panel p-5 rounded-r-2xl border-l-0 w-64 space-y-4 relative overflow-hidden">
        {/* Accent lines */}
        <div className="absolute top-0 right-0 w-2/3 h-[1px] bg-gradient-to-l from-nebula-purple/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent to-nebula-blue/15"></div>

        {/* Pools — hero */}
        <div>
          <p className="text-white/25 text-[9px] uppercase font-data tracking-[0.2em] mb-1">
            Active Pools
          </p>
          <p className="font-display text-4xl font-black stat-value leading-none">
            {stats.totalPools}
          </p>
        </div>

        <div className="glow-divider"></div>

        {/* Volume */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-white/25 text-[9px] font-data uppercase tracking-[0.15em]">Volume</span>
            <span className="text-white/80 font-data text-xs font-medium">{stats.totalVolume}</span>
          </div>
          <div className="w-full h-[3px] bg-white/[0.03] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-nebula-purple via-nebula-blue to-aurora-green transition-all duration-1000"
              style={{ width: '65%' }}
            />
          </div>
        </div>

        {/* Grid stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-white/25 text-[9px] font-data uppercase tracking-[0.15em] mb-1">Tokens</p>
            <p className="text-white font-display text-lg font-bold">{stats.totalTokens}</p>
          </div>
          <div>
            <p className="text-white/25 text-[9px] font-data uppercase tracking-[0.15em] mb-1">Txns</p>
            <p className="text-white font-display text-lg font-bold">{stats.totalTxCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

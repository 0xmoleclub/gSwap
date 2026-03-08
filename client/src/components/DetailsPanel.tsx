import { Token, Pool } from '@/types/token';
import { ReactNode } from 'react';

interface DetailsPanelProps {
  isOpen: boolean;
  selectedNode: Token | null;
  pools: Pool[];
  onClose: () => void;
  children?: ReactNode;
}

export function DetailsPanel({ isOpen, selectedNode, pools, onClose, children }: DetailsPanelProps) {
  if (!isOpen || !selectedNode) return null;

  const connectedPools = pools.filter(
    p => p.source === selectedNode.id || p.target === selectedNode.id
  );

  return (
    <div
      className={`absolute right-0 top-0 bottom-0 w-full md:w-[420px] pointer-events-auto transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="glass-panel h-full md:rounded-l-3xl border-r-0 p-8 flex flex-col relative overflow-hidden">
        {/* Nebula orbs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-nebula-purple/12 rounded-full blur-[100px] orb-pulse"></div>
        <div className="absolute bottom-20 -left-10 w-48 h-48 bg-nebula-blue/6 rounded-full blur-[80px] orb-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-nebula-purple/50 via-nebula-blue/20 to-transparent"></div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200 text-white/30 hover:text-white z-20 group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Token identity */}
        <div className="relative z-10 mt-4 text-center animate-fadeInUp">
          <div className="inline-block relative mb-5">
            <div className="absolute inset-0 bg-nebula-purple/30 blur-2xl rounded-full scale-150"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-deep to-[#151030] flex items-center justify-center text-2xl font-display font-black border border-nebula-purple/20 shadow-[0_0_40px_rgba(123,47,190,0.25)] rotate-3 hover:rotate-0 transition-transform duration-500 mx-auto">
              {selectedNode.id.substring(0, 1)}
            </div>
          </div>
          <h2 className="font-display text-2xl font-black text-white mb-2 tracking-tight">
            {selectedNode.name}
          </h2>
          <span className="inline-block px-3 py-1 rounded-lg bg-nebula-purple/8 text-[10px] font-data tracking-[0.15em] text-white/40 border border-nebula-purple/10">
            {selectedNode.symbol || selectedNode.id}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-8 relative z-10 animate-fadeInUp stagger-2">
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-nebula-purple/8 text-center group hover:border-nebula-purple/20 transition-all duration-300">
            <p className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-data mb-1.5">Price</p>
            <p className="font-display font-bold text-xl text-white">${selectedNode.price}</p>
          </div>
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-nebula-blue/8 text-center group hover:border-nebula-blue/20 transition-all duration-300">
            <p className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-data mb-1.5">TVL</p>
            <p className="font-display font-bold text-xl stat-value-green">
              {selectedNode.tvl}
            </p>
          </div>
        </div>

        {/* Pools */}
        <div className="mt-8 flex-1 flex flex-col min-h-0 relative z-10 animate-fadeInUp stagger-3">
          <h3 className="font-body text-[10px] uppercase tracking-[0.2em] text-white/25 mb-4 flex items-center gap-2 font-semibold">
            <div className="w-1.5 h-1.5 bg-nebula-purple rounded-full shadow-[0_0_6px_rgba(123,47,190,0.5)]"></div>
            Connected Pools
            <span className="text-nebula-purple font-data ml-auto">{connectedPools.length}</span>
          </h3>
          <div className="overflow-y-auto pr-2 space-y-2 -mr-2 custom-scrollbar">
            {connectedPools.map((pool, idx) => {
              const isSource = pool.source === selectedNode.id;
              const partner = isSource
                ? (pool.targetLabel || pool.target)
                : (pool.sourceLabel || pool.source);
              return (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3.5 bg-white/[0.015] rounded-xl border border-white/[0.03] hover:border-nebula-purple/15 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-nebula-purple/8 flex items-center justify-center text-[9px] font-data text-white/40 group-hover:text-white transition-colors">
                      {partner[0]}
                    </div>
                    <span className="text-xs font-body font-semibold text-white/70 group-hover:text-white transition-colors">{partner}</span>
                  </div>
                  <span className="text-[10px] text-nebula-purple font-data font-medium">{pool.apy}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

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
      className={`absolute right-0 top-0 bottom-0 w-full md:w-96 pointer-events-auto transform transition-transform duration-500 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="glass-panel h-full md:rounded-l-3xl border-r-0 p-8 flex flex-col relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-polkadot-pink/20 rounded-full blur-[80px]"></div>

        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-white z-20"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="relative z-10 mt-4 text-center">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-polkadot-pink blur-xl opacity-40"></div>
            <div className="relative w-24 h-24 rounded-full bg-black flex items-center justify-center text-3xl font-bold border-2 border-polkadot-pink shadow-2xl mx-auto mb-4">
              {selectedNode.id.substring(0, 1)}
            </div>
          </div>
          <h2 className="font-display text-3xl font-bold text-white mb-1">
            {selectedNode.name}
          </h2>
          <div className="flex items-center justify-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono tracking-wider text-gray-300">
              {selectedNode.symbol || selectedNode.id}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Price</p>
            <p className="font-display font-bold text-xl">${selectedNode.price}</p>
          </div>
          <div className="bg-black/40 backdrop-blur-sm p-4 rounded-2xl border border-white/5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
              Liquidity
            </p>
            <p className="font-display font-bold text-xl text-polkadot-pink">
              {selectedNode.tvl}
            </p>
          </div>
        </div>

        <div className="mt-8 flex-1 flex flex-col min-h-0 relative z-10">
          <h3 className="font-display text-xs uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <span className="w-1 h-1 bg-polkadot-pink rounded-full"></span>
            Pools
          </h3>
          <div className="overflow-y-auto pr-2 space-y-2 -mr-2">
            {connectedPools.map((pool, idx) => {
              const isSource = pool.source === selectedNode.id;
              const partner = isSource
                ? (pool.targetLabel || pool.target)
                : (pool.sourceLabel || pool.source);
              return (
                <div
                  key={idx}
                  className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/5"
                >
                  <span className="text-xs font-bold">{partner}</span>
                  <span className="text-xs text-polkadot-pink font-mono">{pool.apy}% Fee</span>
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

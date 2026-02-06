import { useState } from 'react';

export function LiquidityView() {
  const [activeTab, setActiveTab] = useState<'add' | 'create'>('add');

  return (
    <div className="flex items-center justify-center w-full h-full animate-fadeIn px-4">
      <div className="w-full max-w-md p-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent p-[1px]">
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-polkadot-pink/20 blur-[60px] rounded-full"></div>

          {/* Header/Tabs */}
          <div className="flex space-x-6 mb-6 relative z-10 border-b border-white/10">
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'add' ? 'text-white border-polkadot-pink' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              Add Liquidity
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === 'create' ? 'text-white border-polkadot-pink' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              Create Pair
            </button>
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Token A Input */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-2">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">Token A</span>
                <span className="text-xs text-gray-400">Bal: 120.0</span>
              </div>
              <div className="flex justify-between items-center">
                <input type="number" placeholder="0.0" className="bg-transparent text-xl font-bold outline-none w-1/2" />
                <button className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/20 transition">
                  <div className="w-5 h-5 bg-polkadot-pink rounded-full flex items-center justify-center text-[8px] font-bold">D</div>
                  <span className="font-bold text-sm">DOT</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
              </div>
            </div>

            <div className="flex justify-center -my-3 z-20 relative">
              <div className="bg-[#1a1a1a] p-1.5 rounded-full border border-white/20 shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-8-8h16"></path></svg>
              </div>
            </div>

            {/* Token B Input */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">Token B</span>
                <span className="text-xs text-gray-400">Bal: 0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <input type="number" placeholder="0.0" className="bg-transparent text-xl font-bold outline-none w-1/2" />
                <button className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/20 transition">
                  <span className="font-bold text-sm">Select Token</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
              </div>
            </div>

            {/* Info Section */}
            {activeTab === 'add' && (
              <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Pool Share</span>
                  <span className="text-white font-mono">0.00%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Est. APR</span>
                  <span className="text-green-400 font-mono">14.2%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Slippage Tolerance</span>
                  <span className="text-white font-mono">0.5%</span>
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2 border border-white/5">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-400">Initial Fee Tier</span>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-polkadot-pink/20 border border-polkadot-pink/40 text-polkadot-pink rounded text-[10px] font-bold">0.3%</button>
                    <button className="px-2 py-1 bg-white/5 border border-white/10 text-gray-400 rounded text-[10px]">0.05%</button>
                    <button className="px-2 py-1 bg-white/5 border border-white/10 text-gray-400 rounded text-[10px]">1.0%</button>
                  </div>
                </div>
                <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20 mt-2">
                  <p className="text-[10px] text-blue-300 italic">
                    You are the first liquidity provider. The ratio of tokens you add will set the initial price of this pool.
                  </p>
                </div>
              </div>
            )}

            <button className="w-full py-4 rounded-xl bg-polkadot-pink hover:bg-pink-600 text-white font-bold font-display text-sm transition shadow-[0_0_20px_rgba(230,0,122,0.4)] hover:shadow-[0_0_30px_rgba(230,0,122,0.6)]">
              {activeTab === 'add' ? 'Supply Liquidity' : 'Create Pool'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

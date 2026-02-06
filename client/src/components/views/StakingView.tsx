export function StakingView() {
  return (
    <div className="w-full h-full flex items-center justify-center animate-fadeIn px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stats Card */}
        <div className="md:col-span-1 glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-polkadot-pink to-transparent"></div>
          <div>
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Staked</h3>
            <p className="font-display text-3xl font-bold text-white">14.2M <span className="text-sm text-polkadot-pink">DOT</span></p>
          </div>
          <div className="my-6">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Your Rewards</h3>
            <p className="font-display text-2xl font-bold text-green-400">+$124.50</p>
          </div>
          <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-bold transition">
            Claim Rewards
          </button>
        </div>

        {/* Main Staking Interface */}
        <div className="md:col-span-2 glass-panel rounded-3xl p-6 relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-xl font-bold">Validators</h2>
            <div className="flex gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-polkadot-pink/20 text-polkadot-pink border border-polkadot-pink/30">Active</span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10">Waiting</span>
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-polkadot-pink/50 transition group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center font-bold text-xs">V{i}</div>
                  <div>
                    <p className="font-bold text-sm text-white group-hover:text-polkadot-pink transition">Polkadot Validator #{i}</p>
                    <p className="text-[10px] text-gray-500">Comm: 5% • Era: 1042</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-green-400">14.5% APY</p>
                  <p className="text-[10px] text-gray-500">Total Stake: 1.2M</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
            <button className="px-8 py-3 rounded-xl bg-polkadot-pink hover:bg-pink-600 text-white font-bold font-display text-sm transition shadow-[0_0_20px_rgba(230,0,122,0.4)]">
              Stake DOT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

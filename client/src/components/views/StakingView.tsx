export function StakingView() {
  const validators = [
    { id: 1, name: 'Parity Technologies', commission: 3, era: 1042, apy: 15.2, stake: '2.4M' },
    { id: 2, name: 'Web3 Foundation', commission: 5, era: 1042, apy: 14.8, stake: '1.8M' },
    { id: 3, name: 'Polkadot Hub Node', commission: 4, era: 1042, apy: 14.5, stake: '1.2M' },
    { id: 4, name: 'Substrate Validators', commission: 6, era: 1042, apy: 13.9, stake: '980K' },
    { id: 5, name: 'DOT Staking Pool', commission: 5, era: 1042, apy: 13.2, stake: '750K' },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center px-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeInUp">

        {/* Left column */}
        <div className="md:col-span-1 space-y-5">
          <div className="gradient-border animate-fadeIn stagger-1">
            <div className="glass-panel rounded-[1.4rem] p-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-nebula-purple/12 rounded-full blur-[60px] orb-pulse"></div>
              <p className="text-white/25 text-[9px] font-data uppercase tracking-[0.2em] mb-2">Total Staked</p>
              <p className="font-display text-3xl font-black stat-value leading-tight">14.2M</p>
              <p className="text-nebula-purple text-xs font-data mt-1">DOT</p>
            </div>
          </div>

          <div className="glass-panel rounded-[1.4rem] p-6 relative overflow-hidden animate-fadeIn stagger-2">
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-aurora-green/6 rounded-full blur-[40px]"></div>
            <p className="text-white/25 text-[9px] font-data uppercase tracking-[0.2em] mb-2">Your Rewards</p>
            <p className="font-display text-2xl font-black text-aurora-green leading-tight neon-text-green">+$124.50</p>
            <p className="text-aurora-green/40 text-[10px] font-data mt-1">Claimable</p>
            <button className="w-full mt-5 py-3 rounded-xl bg-aurora-green/8 hover:bg-aurora-green/12 border border-aurora-green/15 hover:border-aurora-green/25 text-aurora-green text-sm font-body font-semibold transition-all duration-300 btn-press">
              Claim Rewards
            </button>
          </div>

          <div className="glass-panel rounded-[1.4rem] p-6 animate-fadeIn stagger-3">
            <p className="text-white/25 text-[9px] font-data uppercase tracking-[0.2em] mb-4">Network</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/30 font-body">Active Era</span>
                <span className="text-white font-data">1,042</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/30 font-body">Min Stake</span>
                <span className="text-white font-data">120 DOT</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-white/30 font-body">Avg Return</span>
                <span className="text-aurora-green font-data font-medium neon-text-green">14.3% APY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validators */}
        <div className="md:col-span-2 glass-panel rounded-[1.4rem] p-6 relative overflow-hidden animate-fadeIn stagger-2">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-nebula-purple/30 via-nebula-blue/10 to-transparent"></div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-display text-lg font-bold">Validators</h2>
              <p className="text-[10px] text-white/25 font-data mt-0.5">Select a validator to stake</p>
            </div>
            <div className="flex gap-2 text-[10px]">
              <span className="px-3 py-1.5 rounded-lg bg-nebula-purple/10 text-nebula-purple border border-nebula-purple/15 font-data font-medium">Active</span>
              <span className="px-3 py-1.5 rounded-lg bg-white/[0.02] text-white/30 border border-white/[0.04] font-data">Waiting</span>
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {validators.map((v, idx) => (
              <div key={v.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-nebula-purple/6 hover:border-nebula-purple/15 transition-all duration-300 group cursor-pointer animate-fadeIn" style={{ animationDelay: `${(idx + 3) * 50}ms` }}>
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nebula-purple/10 to-nebula-blue/5 border border-nebula-purple/10 flex items-center justify-center font-display font-bold text-xs text-white/40 group-hover:text-white group-hover:border-nebula-purple/25 transition-all duration-300">
                    {v.id}
                  </div>
                  <div>
                    <p className="font-body font-semibold text-sm text-white/70 group-hover:text-white transition-colors">{v.name}</p>
                    <p className="text-[10px] text-white/20 font-data mt-0.5">Comm: {v.commission}% &middot; Era: {v.era}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-aurora-green text-sm">{v.apy}%</p>
                  <p className="text-[10px] text-white/20 font-data mt-0.5">{v.stake} staked</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-nebula-purple/8 flex items-center justify-between">
            <p className="text-[10px] text-white/20 font-data">Select validator above to stake</p>
            <button className="px-8 py-3 rounded-xl btn-galaxy text-white font-display font-bold text-sm btn-press">
              Stake DOT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

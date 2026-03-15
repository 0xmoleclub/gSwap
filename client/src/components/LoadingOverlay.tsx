export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void transition-opacity duration-700 noise-overlay">

      {/* Nebula ambient */}
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-nebula-purple/8 rounded-full blur-[100px] orb-pulse"></div>
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-nebula-blue/6 rounded-full blur-[80px] orb-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Central element */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Rings */}
        <div className="absolute w-24 h-24 rounded-full border border-nebula-purple/15 animate-spin" style={{ animationDuration: '10s' }}></div>
        <div className="absolute w-16 h-16 rounded-full border border-nebula-blue/10 animate-spin" style={{ animationDuration: '7s', animationDirection: 'reverse' }}></div>
        <div className="absolute w-8 h-8 rounded-full border border-aurora-green/10 animate-spin" style={{ animationDuration: '4s' }}></div>

        {/* Core */}
        <div className="relative w-4 h-4">
          <div className="absolute inset-0 bg-nebula-purple rounded-full animate-ping opacity-30" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute -inset-2 bg-nebula-purple/30 rounded-full blur-lg"></div>
          <div className="relative w-4 h-4 bg-gradient-to-br from-nebula-purple to-nebula-blue rounded-full shadow-[0_0_25px_rgba(123,47,190,0.6)]"></div>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h1 className="font-display font-black text-4xl text-white tracking-tight animate-fadeIn">
          g<span className="text-nebula-purple">Swap</span>
        </h1>
        <div className="flex justify-center items-center gap-3 animate-fadeIn stagger-2">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-nebula-purple/30"></div>
          <p className="text-[10px] font-data uppercase tracking-[0.4em] text-white/25">
            Entering Galaxy
          </p>
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-nebula-blue/30"></div>
        </div>

        {/* Loading bar */}
        <div className="w-32 h-[2px] bg-white/[0.04] rounded-full overflow-hidden mx-auto animate-fadeIn stagger-3">
          <div className="h-full bg-gradient-to-r from-nebula-purple to-nebula-blue rounded-full shimmer" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
}

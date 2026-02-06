export function HUD() {
  return (
    <div className="absolute left-0 bottom-10 pointer-events-auto hidden md:block">
      <div className="glass-panel p-6 rounded-r-2xl border-l-0 w-72 space-y-6">
        <div>
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
            Protocol TVL
          </p>
          <p className="font-display text-3xl text-white neon-text mt-1">$4.28B</p>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-gray-400 text-xs font-mono">24h Vol</span>
            <span className="text-white font-bold font-mono">$182.5M</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-polkadot-pink w-[65%]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

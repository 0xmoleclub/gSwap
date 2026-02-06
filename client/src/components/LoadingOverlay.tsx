export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl transition-opacity duration-500">
      
      {/* Central Pulse */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-32 h-32 bg-polkadot-pink/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="relative w-3 h-3">
             <div className="absolute inset-0 bg-polkadot-pink rounded-full animate-ping opacity-75 duration-1000"></div>
             <div className="relative w-3 h-3 bg-polkadot-pink rounded-full shadow-[0_0_15px_#E6007A]"></div>
        </div>
      </div>

      <div className="text-center space-y-3">
         <h1 className="font-display font-bold text-3xl text-white tracking-tight">
            g<span className="text-polkadot-pink">Swap</span>
         </h1>
         <div className="flex justify-center items-center gap-1.5">
            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
            <p className="text-sm font-mono uppercase tracking-[0.3em] text-white/40">
                Loading
            </p>
            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
         </div>
      </div>
    </div>
  );
}

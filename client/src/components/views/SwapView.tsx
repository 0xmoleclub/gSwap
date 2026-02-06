export function SwapView() {
  return (
    <div className="flex items-center justify-center w-full h-full animate-fadeIn">
      <div className="w-full max-w-md p-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent p-[1px]">
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-polkadot-pink/20 blur-[60px] rounded-full"></div>

          <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="font-display text-xl font-bold">Swap</h2>
            <button className="text-gray-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
          </div>

          {/* From Input */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-2 relative z-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-gray-400">From</span>
              <span className="text-xs text-gray-400">Balance: 245.50</span>
            </div>
            <div className="flex justify-between items-center">
              <input type="number" placeholder="0.0" className="bg-transparent text-2xl font-bold outline-none w-1/2" />
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition border border-white/10">
                <div className="w-5 h-5 bg-polkadot-pink rounded-full flex items-center justify-center text-[8px] font-bold">D</div>
                <span className="font-bold text-sm">DOT</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">≈ $0.00</p>
          </div>

          {/* Switcher */}
          <div className="flex justify-center -my-3 relative z-20">
            <button className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-white/20 flex items-center justify-center hover:scale-110 transition shadow-lg">
              <svg className="w-4 h-4 text-polkadot-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
            </button>
          </div>

          {/* To Input */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-6 relative z-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-gray-400">To</span>
              <span className="text-xs text-gray-400">Balance: 0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <input type="number" placeholder="0.0" className="bg-transparent text-2xl font-bold outline-none w-1/2" />
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition border border-white/10">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[8px] font-bold text-black">K</div>
                <span className="font-bold text-sm">KSM</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">≈ $0.00</p>
          </div>

          <button className="w-full py-4 rounded-xl bg-polkadot-pink hover:bg-pink-600 text-white font-bold font-display text-sm transition shadow-[0_0_20px_rgba(230,0,122,0.4)] hover:shadow-[0_0_30px_rgba(230,0,122,0.6)] relative z-10">
            Review Swap
          </button>
        </div>
      </div>
    </div>
  );
}

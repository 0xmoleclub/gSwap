import Link from 'next/link';

export function Header() {
  return (
    <header className="flex justify-between items-center pointer-events-auto">
      <Link href="/" className="flex items-center gap-3 cursor-pointer">
        <div className="relative w-12 h-12 flex items-center justify-center group">
          <div className="absolute inset-0 bg-polkadot-pink rounded-full opacity-20 animate-pulse group-hover:opacity-40 transition-opacity"></div>
          <div className="relative w-10 h-10 rounded-full bg-black flex items-center justify-center shadow-[0_0_25px_#E6007A] border border-polkadot-pink/30 group-hover:border-polkadot-pink transition-colors">
            <span className="font-display font-bold text-white text-xl pb-1">g</span>
            <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-black"></div>
          </div>
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight leading-none">
            g<span className="text-polkadot-pink">Swap</span>
          </h1>
          <p className="text-[10px] text-gray-400 font-sans tracking-[0.2em] uppercase">
            Universal Liquidity
          </p>
        </div>
      </Link>

      <button
        onClick={() => alert('Connect Wallet Logic')}
        className="group relative px-6 py-2 rounded-full bg-black/50 border border-white/10 hover:border-polkadot-pink transition-colors overflow-hidden"
      >
        <div className="absolute inset-0 bg-polkadot-pink/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
        <span className="relative font-display font-bold text-sm text-white group-hover:text-polkadot-pink transition-colors">
          Connect Wallet
        </span>
      </button>
    </header>
  );
}

'use client';

import { useWallet } from '@/context/WalletContext';

export function NetworkBadge() {
  const { address, isCorrectChain } = useWallet();

  if (!address) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-nebula-purple/10 animate-fadeIn">
      <div className="relative w-2 h-2">
        <div
          className={`w-2 h-2 rounded-full ${isCorrectChain ? 'bg-aurora-green' : 'bg-stellar-gold'}`}
          style={{ boxShadow: isCorrectChain ? '0 0 8px rgba(0,255,136,0.5)' : '0 0 8px rgba(255,184,0,0.5)' }}
        />
        <div className={`absolute inset-0 rounded-full ${isCorrectChain ? 'bg-aurora-green' : 'bg-stellar-gold'} pulse-ring`} />
      </div>
      <span className="font-data text-[9px] text-white/50 tracking-wider uppercase">
        {isCorrectChain ? 'Polkadot Hub' : 'Wrong Chain'}
      </span>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { shortenAddress } from '@/lib/format';
import { NetworkBadge } from './NetworkBadge';

export function Header() {
  const { address, isConnecting, isCorrectChain, connect, disconnect, switchChain } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  return (
    <header className="flex justify-between items-center pointer-events-auto animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 cursor-pointer group">
          {/* Logo */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-nebula-purple/20 group-hover:bg-nebula-purple/30 transition-all duration-500 blur-md"></div>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-nebula-purple/30 to-nebula-blue/20 flex items-center justify-center border border-nebula-purple/30 group-hover:border-nebula-purple/50 transition-all duration-300 shadow-[0_0_20px_rgba(123,47,190,0.2)]">
              <span className="font-display font-black text-white text-lg leading-none">g</span>
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-aurora-green rounded-full border-2 border-void shadow-[0_0_8px_rgba(0,255,136,0.5)]"></div>
          </div>

          <div>
            <h1 className="font-display font-black text-xl tracking-tight leading-none">
              g<span className="text-nebula-purple">Swap</span>
            </h1>
            <p className="text-[9px] text-white/30 font-data tracking-[0.25em] uppercase mt-0.5">
              Polkadot Hub
            </p>
          </div>
        </Link>

        <NetworkBadge />
      </div>

      {/* Wallet */}
      <div className="flex items-center gap-3">
        {!address ? (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="group relative px-5 py-2.5 rounded-xl btn-galaxy text-white font-display font-bold text-xs tracking-wide overflow-hidden disabled:opacity-50 btn-press"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : !isCorrectChain ? (
          <button
            onClick={switchChain}
            className="px-5 py-2.5 rounded-xl bg-stellar-gold/10 border border-stellar-gold/30 hover:border-stellar-gold/60 transition-all duration-300 btn-press"
          >
            <span className="font-display font-bold text-xs text-stellar-gold tracking-wide">
              Switch Network
            </span>
          </button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-nebula-purple/15 hover:border-nebula-purple/30 transition-all duration-300"
            >
              <div className="w-2 h-2 rounded-full bg-aurora-green shadow-[0_0_6px_rgba(0,255,136,0.5)]"></div>
              <span className="font-data text-xs text-white/80">
                {shortenAddress(address)}
              </span>
              <svg className={`w-3 h-3 text-white/30 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-deep border border-nebula-purple/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-scaleIn overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.04]">
                  <p className="text-[9px] text-white/30 uppercase tracking-wider font-data">Connected</p>
                  <p className="text-[11px] text-white/60 font-data truncate mt-1">{address}</p>
                </div>
                <button
                  onClick={() => { disconnect(); setShowDropdown(false); }}
                  className="w-full px-4 py-3 text-left text-xs text-red-400 hover:bg-red-500/5 transition-colors font-body font-semibold"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

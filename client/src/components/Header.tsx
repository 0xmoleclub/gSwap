'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { shortenAddress } from '@/lib/format';

export function Header() {
  const { address, isConnecting, isCorrectChain, connect, disconnect, switchChain } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

      {/* Wallet Button */}
      {!address ? (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="group relative px-6 py-2 rounded-full bg-black/50 border border-white/10 hover:border-polkadot-pink transition-colors overflow-hidden disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-polkadot-pink/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          <span className="relative font-display font-bold text-sm text-white group-hover:text-polkadot-pink transition-colors">
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </span>
        </button>
      ) : !isCorrectChain ? (
        <button
          onClick={switchChain}
          className="group relative px-6 py-2 rounded-full bg-black/50 border border-orange-500/50 hover:border-orange-400 transition-colors overflow-hidden"
        >
          <div className="absolute inset-0 bg-orange-500/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          <span className="relative font-display font-bold text-sm text-orange-400">
            Switch Network
          </span>
        </button>
      ) : (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-white/10 hover:border-polkadot-pink/50 transition-colors"
          >
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="font-mono text-sm text-white">
              {shortenAddress(address)}
            </span>
            <svg className={`w-3 h-3 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 py-2 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="px-4 py-2 border-b border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Connected</p>
                <p className="text-xs text-white font-mono truncate">{address}</p>
              </div>
              <button
                onClick={() => { disconnect(); setShowDropdown(false); }}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

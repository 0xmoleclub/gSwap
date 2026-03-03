'use client';

import { useState, useMemo } from 'react';
import { Token } from '@/types/token';
import { formatTokenAmount } from '@/lib/format';

interface TokenSelectModalProps {
  tokens: Token[];
  balances: Map<string, bigint>;
  excludeAddress?: string | null;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

export function TokenSelectModal({
  tokens,
  balances,
  excludeAddress,
  onSelect,
  onClose,
}: TokenSelectModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tokens.filter((t) => {
      if (excludeAddress && t.address?.toLowerCase() === excludeAddress.toLowerCase()) return false;
      if (!q) return true;
      return (
        t.symbol?.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address?.toLowerCase().includes(q)
      );
    });
  }, [tokens, search, excludeAddress]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/5">
          <h3 className="font-display font-bold text-lg">Select Token</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <input
            type="text"
            placeholder="Search by name or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-polkadot-pink/50 transition placeholder:text-gray-500"
            autoFocus
          />
        </div>

        {/* Token List */}
        <div className="max-h-80 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No tokens found</p>
          ) : (
            filtered.map((token) => {
              const bal = token.address ? balances.get(token.address.toLowerCase()) : undefined;
              return (
                <button
                  key={token.id}
                  onClick={() => onSelect(token)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-left"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-white/10"
                    style={{ backgroundColor: `#${token.color.toString(16).padStart(6, '0')}30` }}
                  >
                    {(token.symbol || token.name)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{token.symbol || token.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{token.name}</p>
                  </div>
                  {bal !== undefined && (
                    <span className="text-xs text-gray-400 font-mono">
                      {formatTokenAmount(bal, token.decimals ?? 18)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

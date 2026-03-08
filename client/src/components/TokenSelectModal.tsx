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
      <div className="absolute inset-0 bg-[#030014]/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#0B0720] border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-nebula-purple/40 via-transparent to-nebula-blue/20"></div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/[0.04]">
          <h3 className="font-display font-bold text-base">Select Token</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.05]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm outline-none focus:border-nebula-purple/30 transition-colors placeholder:text-gray-600 font-body"
              autoFocus
            />
          </div>
        </div>

        {/* Token List */}
        <div className="max-h-80 overflow-y-auto px-2 pb-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-10 font-body">No tokens found</p>
          ) : (
            filtered.map((token, idx) => {
              const bal = token.address ? balances.get(token.address.toLowerCase()) : undefined;
              return (
                <button
                  key={token.id}
                  onClick={() => onSelect(token)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03] transition-all duration-200 text-left group animate-fadeIn"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-display font-bold border border-white/[0.06] group-hover:border-white/[0.12] transition-colors"
                    style={{ backgroundColor: `#${token.color.toString(16).padStart(6, '0')}20` }}
                  >
                    {(token.symbol || token.name)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-sm text-white/90 group-hover:text-white transition-colors">{token.symbol || token.name}</p>
                    <p className="text-[10px] text-gray-600 truncate font-data">{token.name}</p>
                  </div>
                  {bal !== undefined && (
                    <span className="text-[11px] text-gray-500 font-data tabular-nums">
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

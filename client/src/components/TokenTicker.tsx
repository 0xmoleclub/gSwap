'use client';

import { Token } from '@/types/token';

interface TokenTickerProps {
  tokens: Token[];
}

export function TokenTicker({ tokens }: TokenTickerProps) {
  if (!tokens.length) return null;

  // Double the array for seamless loop
  const tickerItems = [...tokens, ...tokens];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none overflow-hidden">
      <div className="border-t border-nebula-purple/10 bg-void/60 backdrop-blur-md">
        <div className="flex animate-ticker whitespace-nowrap py-2">
          {tickerItems.map((token, i) => (
            <div key={`${token.id}-${i}`} className="flex items-center gap-2 px-5 shrink-0">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: `#${token.color.toString(16).padStart(6, '0')}` }}
              />
              <span className="font-body text-[11px] text-white/70 font-medium">
                {token.symbol || token.name}
              </span>
              <span className="font-data text-[10px] text-white/40">
                ${typeof token.price === 'string' ? token.price : token.price.toFixed(4)}
              </span>
              <span className="font-data text-[10px] text-aurora-green/60">
                TVL {token.tvl}
              </span>
              <span className="text-nebula-purple/30 mx-2">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

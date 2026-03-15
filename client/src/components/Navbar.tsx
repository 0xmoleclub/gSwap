'use client';

import Link from 'next/link';

interface NavbarProps {
  currentView: 'home' | 'swap' | 'liquidity' | 'staking' | 'arbitrage';
}

export function Navbar({ currentView }: NavbarProps) {
  const navItems = [
    { id: 'home' as const, label: 'Galaxy', href: '/', icon: '✦' },
    { id: 'swap' as const, label: 'Swap', href: '/swap', icon: '⇄' },
    { id: 'liquidity' as const, label: 'Liquidity', href: '/liquidity', icon: '◎' },
    { id: 'staking' as const, label: 'Staking', href: '/staking', icon: '⬡' },
    { id: 'arbitrage' as const, label: 'Arbitrage', href: '/arbitrage', icon: '🤖' },
  ];

  return (
    <nav className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto animate-fadeIn stagger-2">
      <div className="flex p-1 bg-deep/80 backdrop-blur-2xl border border-nebula-purple/12 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(123,47,190,0.05)]">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`
              relative px-5 py-2.5 rounded-xl font-body text-[11px] font-semibold uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2
              ${currentView === item.id
                ? 'text-white'
                : 'text-white/35 hover:text-white/60'
              }
            `}
          >
            {currentView === item.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-nebula-purple/20 to-nebula-blue/10 rounded-xl border border-nebula-purple/15 shadow-[0_0_20px_rgba(123,47,190,0.1)]"></div>
            )}
            <span className="relative z-10 text-[10px] opacity-50">{item.icon}</span>
            <span className="relative z-10">{item.label}</span>
            {currentView === item.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-gradient-to-r from-nebula-purple to-nebula-blue rounded-full"></div>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

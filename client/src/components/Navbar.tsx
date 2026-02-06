import Link from 'next/link';

interface NavbarProps {
  currentView: 'home' | 'swap' | 'liquidity' | 'staking';
}

export function Navbar({ currentView }: NavbarProps) {
  const navItems = [
    { id: 'home' as const, label: 'Galaxy', href: '/' },
    { id: 'swap' as const, label: 'Swap', href: '/swap' },
    { id: 'liquidity' as const, label: 'Liquidity', href: '/liquidity' },
    { id: 'staking' as const, label: 'Staking', href: '/staking' },
  ];

  return (
    <nav className="absolute top-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
      <div className="flex p-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`
              relative px-6 py-2 rounded-full font-display text-xs font-bold uppercase tracking-wider transition-all duration-300
              ${currentView === item.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {currentView === item.id && (
              <div className="absolute inset-0 bg-white/10 rounded-full border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]"></div>
            )}
            <span className="relative z-10">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

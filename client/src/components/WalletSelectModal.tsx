'use client';

import type { EIP6963ProviderDetail } from '@/context/WalletContext';

interface WalletSelectModalProps {
  discoveredWallets: EIP6963ProviderDetail[];
  connectingWalletId: string | null;
  error: string | null;
  onSelect: (detail: EIP6963ProviderDetail) => void;
  onClose: () => void;
}

const POPULAR_WALLETS = [
  {
    name: 'MetaMask',
    rdns: 'io.metamask',
    url: 'https://metamask.io/download',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path fill="#E17726" d="M36.8 2L22.4 12.8l2.7-6.3z"/><path fill="#E27625" d="M3.2 2l14.2 10.9L14.9 6.5zM31.5 27.7l-3.8 5.8 8.2 2.3 2.3-8zM1.8 27.8l2.3 8 8.2-2.3-3.8-5.8z"/><path fill="#E27625" d="M12 17.4l-2.3 3.4 8.1.4-.3-8.7zM28 17.4l-5.6-5-.2 8.8 8.1-.4zM12.3 33.5l4.9-2.4-4.2-3.3zM22.8 31.1l4.9 2.4-.7-5.7z"/><path fill="#D5BFB2" d="M27.7 33.5L22.8 31l.4 3.3-.1 1.4zM12.3 33.5l5.1 2.2-.1-1.4.4-3.3z"/><path fill="#233447" d="M17.5 25.8l-4.1-1.2 2.9-1.3zM22.5 25.8l1.2-2.5 2.9 1.3z"/><path fill="#CC6228" d="M12.3 33.5l.7-5.8-4.5.1zM27 27.7l.7 5.8 3.8-5.7zM30.3 20.8l-8.1.4.8 4.6 1.2-2.5 2.9 1.3zM13.4 24.6l2.9-1.3 1.2 2.5.8-4.6-8.1-.4z"/><path fill="#E27625" d="M10.2 20.8l3.4 6.6-.1-3.3zM26.5 24.1l-.1 3.3 3.4-6.6zM18.3 21.2l-.8 4.6 1 5.1.2-6.7zM22.2 21.2l-.4 3-.1 6.7 1-5.1z"/><path fill="#F5841F" d="M23 25.8l-1 5.1.7.5 4.2-3.3.1-3.3zM13.4 24.6l.1 3.3 4.2 3.3.7-.5-1-5.1z"/><path fill="#C0AC9D" d="M23.1 35.7l.1-1.4-.4-.3h-5.6l-.4.3.1 1.4-5.1-2.2 1.8 1.5 3.6 2.5h5.7l3.6-2.5 1.8-1.5z"/><path fill="#161616" d="M22.8 31.1l-.7-.5h-4.2l-.7.5-.4 3.3.4-.3h5.6l.4.3z"/><path fill="#763E1A" d="M37.5 13.4l1.2-5.8L36.8 2 22.8 12.4l5.2 4.4 7.3 2.1 1.6-1.9-.7-.5 1.1-1-.9-.7 1.1-.8zM1.3 7.6l1.2 5.8-.8.6 1.1.8-.8.7 1.1 1-.7.5 1.6 1.9 7.3-2.1 5.2-4.4L3.2 2z"/><path fill="#F5841F" d="M35.3 18.9l-7.3-2.1 2.2 3.4-3.4 6.6 4.5-.1h6.7zM12 16.8L4.7 18.9 2 27.7h6.7l4.5.1-3.4-6.6zM22.2 21.2l.5-8.4 2.2-6.3H15.2l2.2 6.3.5 8.4.2 3 0 6.7h4.2l0-6.7z"/></svg>`,
  },
  {
    name: 'Coinbase Wallet',
    rdns: 'com.coinbase.wallet',
    url: 'https://www.coinbase.com/wallet',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#0052FF"/><path d="M20 6C12.27 6 6 12.27 6 20s6.27 14 14 14 14-6.27 14-14S27.73 6 20 6zm-3.5 11.5h7a1.5 1.5 0 011.5 1.5v2a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 0115 21v-2a1.5 1.5 0 011.5-1.5z" fill="#fff"/></svg>`,
  },
  {
    name: 'Rabby',
    rdns: 'io.rabby',
    url: 'https://rabby.io',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#7C83F7"/><path d="M12 16c0-4 3.5-7 8-7s8 3 8 7c0 3-2 5.5-5 6.5L26 30c.2.6-.2 1-.8 1H14.8c-.6 0-1-.4-.8-1l3-7.5C14 21.5 12 19 12 16z" fill="#fff"/></svg>`,
  },
  {
    name: 'Talisman',
    rdns: 'xyz.talisman',
    url: 'https://talisman.xyz/download',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#D5FF5C"/><circle cx="15" cy="18" r="3" fill="#1a1a1a"/><circle cx="25" cy="18" r="3" fill="#1a1a1a"/><path d="M13 25c0 0 3 4 7 4s7-4 7-4" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    name: 'SubWallet',
    rdns: 'app.subwallet',
    url: 'https://subwallet.app/download',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#004BFF"/><path d="M10 14h20l-3 6H13zM13 22h14l-3 6H16z" fill="#fff"/></svg>`,
  },
];

export function WalletSelectModal({
  discoveredWallets,
  connectingWalletId,
  error,
  onSelect,
  onClose,
}: WalletSelectModalProps) {
  const discoveredRdns = new Set(discoveredWallets.map((w) => w.info.rdns));
  const popularNotInstalled = POPULAR_WALLETS.filter((w) => !discoveredRdns.has(w.rdns));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/5">
          <h3 className="font-display font-bold text-lg text-white">Connect Wallet</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400 break-words">{error}</p>
          </div>
        )}

        {/* Detected Wallets */}
        {discoveredWallets.length > 0 && (
          <div className="px-4 pt-4 pb-1">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Detected Wallets</p>
            <div className="space-y-1">
              {discoveredWallets.map((detail) => {
                const isConnecting = connectingWalletId === detail.info.rdns;
                return (
                  <button
                    key={detail.info.rdns}
                    onClick={() => onSelect(detail)}
                    disabled={connectingWalletId !== null}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-left disabled:opacity-50"
                  >
                    {/* Wallet icon */}
                    {detail.info.icon ? (
                      <img
                        src={detail.info.icon}
                        alt={detail.info.name}
                        className="w-8 h-8 rounded-lg"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold">
                        {detail.info.name[0]}
                      </div>
                    )}
                    <span className="flex-1 font-bold text-sm text-white">{detail.info.name}</span>
                    {isConnecting ? (
                      <div className="w-5 h-5 border-2 border-polkadot-pink/30 border-t-polkadot-pink rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* No wallets detected but window.ethereum exists — legacy fallback shown in context */}

        {/* Popular Wallets (not installed) */}
        {popularNotInstalled.length > 0 && (
          <div className="px-4 pt-3 pb-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Popular Wallets</p>
            <div className="space-y-1">
              {popularNotInstalled.map((wallet) => (
                <a
                  key={wallet.rdns}
                  href={wallet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition text-left opacity-60 hover:opacity-80"
                >
                  <div
                    className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: wallet.icon }}
                  />
                  <span className="flex-1 text-sm text-gray-300">{wallet.name}</span>
                  <span className="text-[10px] text-polkadot-pink font-bold uppercase tracking-wider">Install</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty state: no wallets at all */}
        {discoveredWallets.length === 0 && popularNotInstalled.length === POPULAR_WALLETS.length && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-300">No wallets detected</p>
            <p className="text-xs text-gray-400 mt-1">Install a wallet to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

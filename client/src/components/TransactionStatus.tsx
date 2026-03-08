'use client';

import { getTxUrl } from '@/config/chain';

interface TransactionStatusProps {
  status: string;
  txHash: string | null;
  error: string | null;
  onClose: () => void;
}

export function TransactionStatus({ status, txHash, error, onClose }: TransactionStatusProps) {
  if (status === 'idle') return null;

  const isLoading = ['approving', 'swapping', 'adding', 'removing', 'creating'].includes(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={isLoading ? undefined : onClose}>
      <div className="absolute inset-0 bg-[#030014]/85 backdrop-blur-md" />
      <div
        className="relative w-full max-w-xs rounded-2xl bg-[#0B0720] border border-white/[0.08] shadow-[0_30px_80px_rgba(0,0,0,0.8)] p-8 text-center animate-scaleIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-nebula-purple/40 to-transparent"></div>

        {isLoading && (
          <>
            <div className="relative mx-auto w-16 h-16 mb-6">
              {/* Outer ring */}
              <div className="absolute inset-0 border-2 border-nebula-purple/10 rounded-full"></div>
              {/* Spinning gradient ring */}
              <div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: '1.2s' }}>
                <div className="w-full h-full rounded-full" style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, #7B2FBE 120deg, #2D5BFF 240deg, transparent 360deg)',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), white calc(100% - 2px))',
                  WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), white calc(100% - 2px))',
                }}></div>
              </div>
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-nebula-purple rounded-full shadow-[0_0_12px_rgba(230,0,122,0.6)]"></div>
              </div>
            </div>
            <p className="font-display font-bold text-sm capitalize text-white">{status}...</p>
            <p className="text-[11px] text-gray-500 mt-2 font-body">
              {status === 'approving' && 'Confirm the approval in your wallet'}
              {status === 'swapping' && 'Confirm the swap in your wallet'}
              {status === 'adding' && 'Adding liquidity to the pool'}
              {status === 'removing' && 'Removing liquidity from the pool'}
              {status === 'creating' && 'Creating a new pool'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full"></div>
              <div className="absolute -inset-2 bg-emerald-500/5 rounded-full blur-md"></div>
              <div className="relative w-full h-full rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="font-display font-bold text-base text-white">Success</p>
            <p className="text-[11px] text-gray-500 mt-1 font-body">Transaction confirmed</p>
            {txHash && (
              <a
                href={getTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-[11px] text-nebula-purple hover:text-aurora-cyan transition-colors font-data"
              >
                View on Explorer
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm font-body font-semibold transition-all duration-200 btn-press"
            >
              Close
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 bg-red-500/10 rounded-full"></div>
              <div className="absolute -inset-2 bg-red-500/5 rounded-full blur-md"></div>
              <div className="relative w-full h-full rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="font-display font-bold text-base text-white">Failed</p>
            {error && (
              <p className="mt-3 text-[11px] text-gray-500 break-words max-h-20 overflow-y-auto font-data custom-scrollbar">{error}</p>
            )}
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-sm font-body font-semibold transition-all duration-200 btn-press"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

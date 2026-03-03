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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xs rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <>
            <div className="mx-auto w-12 h-12 border-2 border-polkadot-pink/30 border-t-polkadot-pink rounded-full animate-spin mb-4" />
            <p className="font-display font-bold text-sm capitalize">{status}...</p>
            <p className="text-xs text-gray-500 mt-1">
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
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-display font-bold text-sm">Transaction Successful</p>
            {txHash && (
              <a
                href={getTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-polkadot-pink hover:underline"
              >
                View on Explorer
              </a>
            )}
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition"
            >
              Close
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="font-display font-bold text-sm">Transaction Failed</p>
            {error && (
              <p className="mt-2 text-xs text-gray-400 break-words max-h-24 overflow-y-auto">{error}</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

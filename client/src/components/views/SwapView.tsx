'use client';

import { useState, useMemo, useCallback } from 'react';
import { Token } from '@/types/token';
import { useWallet } from '@/context/WalletContext';
import { useIndexerData } from '@/hooks/useIndexerData';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { usePool } from '@/hooks/usePool';
import { useSwap } from '@/hooks/useSwap';
import { TokenSelectModal } from '@/components/TokenSelectModal';
import { TransactionStatus } from '@/components/TransactionStatus';
import {
  formatTokenAmount,
  parseTokenAmount,
  getAmountOut,
  sortTokens,
} from '@/lib/format';

export function SwapView() {
  const { address, signer, provider, isCorrectChain, connect, switchChain } = useWallet();
  const { data: indexerData } = useIndexerData();
  const tokens = indexerData?.tokens ?? [];

  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountInStr, setAmountInStr] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'in' | 'out' | null>(null);

  const { status, txHash, error, executeSwap, reset } = useSwap();

  // Token addresses for balance fetching
  const tokenAddresses = useMemo(() => {
    const addrs: string[] = [];
    if (tokenIn?.address) addrs.push(tokenIn.address);
    if (tokenOut?.address) addrs.push(tokenOut.address);
    return addrs;
  }, [tokenIn?.address, tokenOut?.address]);

  const { balances, refetch: refetchBalances } = useTokenBalances(tokenAddresses, address, provider);
  const { pool } = usePool(tokenIn?.address ?? null, tokenOut?.address ?? null, provider);

  // Calculate output amount client-side
  const amountIn = useMemo(() => {
    if (!amountInStr || !tokenIn) return 0n;
    try {
      return parseTokenAmount(amountInStr, tokenIn.decimals ?? 18);
    } catch {
      return 0n;
    }
  }, [amountInStr, tokenIn]);

  const amountOut = useMemo(() => {
    if (!pool || amountIn === 0n || !tokenIn?.address) return 0n;
    const isToken0 = tokenIn.address.toLowerCase() === pool.token0.toLowerCase();
    const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;
    return getAmountOut(amountIn, reserveIn, reserveOut, pool.fee);
  }, [pool, amountIn, tokenIn?.address]);

  const amountOutStr = useMemo(() => {
    if (amountOut === 0n || !tokenOut) return '';
    return formatTokenAmount(amountOut, tokenOut.decimals ?? 18);
  }, [amountOut, tokenOut]);

  // Price impact
  const priceImpact = useMemo(() => {
    if (!pool || amountIn === 0n || !tokenIn?.address) return null;
    const isToken0 = tokenIn.address.toLowerCase() === pool.token0.toLowerCase();
    const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;
    if (reserveIn === 0n || reserveOut === 0n) return null;
    const spotPrice = Number(reserveOut) / Number(reserveIn);
    const execPrice = Number(amountOut) / Number(amountIn);
    const impact = ((spotPrice - execPrice) / spotPrice) * 100;
    return Math.max(0, impact);
  }, [pool, amountIn, amountOut, tokenIn?.address]);

  // Balances
  const balanceIn = tokenIn?.address ? balances.get(tokenIn.address.toLowerCase()) ?? 0n : 0n;
  const balanceOut = tokenOut?.address ? balances.get(tokenOut.address.toLowerCase()) ?? 0n : 0n;

  // Button state
  const buttonState = useMemo(() => {
    if (!address) return { label: 'Connect Wallet', action: 'connect' as const };
    if (!isCorrectChain) return { label: 'Switch Network', action: 'switch' as const };
    if (!tokenIn || !tokenOut) return { label: 'Select Tokens', action: 'disabled' as const };
    if (!amountInStr || amountIn === 0n) return { label: 'Enter Amount', action: 'disabled' as const };
    if (amountIn > balanceIn) return { label: 'Insufficient Balance', action: 'disabled' as const };
    if (!pool) return { label: 'No Pool Found', action: 'disabled' as const };
    return { label: 'Swap', action: 'swap' as const };
  }, [address, isCorrectChain, tokenIn, tokenOut, amountInStr, amountIn, balanceIn, pool]);

  const handleSwap = useCallback(async () => {
    if (!signer || !pool || !tokenIn?.address) return;
    const minOut = amountOut - (amountOut * BigInt(Math.floor(slippage * 100))) / 10000n;
    await executeSwap({
      signer,
      poolAddress: pool.poolAddress,
      tokenIn: tokenIn.address,
      amountIn,
      minAmountOut: minOut,
    });
    refetchBalances();
  }, [signer, pool, tokenIn, amountIn, amountOut, slippage, executeSwap, refetchBalances]);

  const handleButtonClick = () => {
    if (buttonState.action === 'connect') connect();
    else if (buttonState.action === 'switch') switchChain();
    else if (buttonState.action === 'swap') handleSwap();
  };

  const handleFlip = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountInStr('');
  };

  const handleSelectToken = (token: Token) => {
    if (selectingFor === 'in') {
      if (tokenOut?.address === token.address) setTokenOut(tokenIn);
      setTokenIn(token);
    } else {
      if (tokenIn?.address === token.address) setTokenIn(tokenOut);
      setTokenOut(token);
    }
    setSelectingFor(null);
  };

  const handleMax = () => {
    if (balanceIn > 0n && tokenIn) {
      setAmountInStr(formatTokenAmount(balanceIn, tokenIn.decimals ?? 18));
    }
  };

  // Exchange rate string
  const rateStr = useMemo(() => {
    if (!pool || !tokenIn?.address || !tokenOut) return null;
    const isToken0 = tokenIn.address.toLowerCase() === pool.token0.toLowerCase();
    const reserveIn = isToken0 ? pool.reserve0 : pool.reserve1;
    const reserveOut = isToken0 ? pool.reserve1 : pool.reserve0;
    if (reserveIn === 0n) return null;
    const rate = Number(reserveOut) / Number(reserveIn);
    return `1 ${tokenIn.symbol ?? '?'} = ${rate < 0.001 ? rate.toExponential(3) : rate.toFixed(6)} ${tokenOut.symbol ?? '?'}`;
  }, [pool, tokenIn, tokenOut]);

  return (
    <div className="flex items-center justify-center w-full h-full animate-fadeIn">
      <div className="w-full max-w-md p-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent p-[1px]">
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-polkadot-pink/20 blur-[60px] rounded-full"></div>

          {/* Header */}
          <div className="flex justify-between items-center mb-6 relative z-10">
            <h2 className="font-display text-xl font-bold">Swap</h2>
            <div className="relative">
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 p-3 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl z-30">
                  <p className="text-xs text-gray-400 mb-2">Slippage Tolerance</p>
                  <div className="flex gap-2">
                    {[0.1, 0.5, 1.0].map((v) => (
                      <button
                        key={v}
                        onClick={() => setSlippage(v)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                          slippage === v
                            ? 'bg-polkadot-pink/20 border border-polkadot-pink/40 text-polkadot-pink'
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* From Input */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-2 relative z-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-gray-400">From</span>
              <button onClick={handleMax} className="text-xs text-gray-400 hover:text-white transition">
                Balance: {tokenIn ? formatTokenAmount(balanceIn, tokenIn.decimals ?? 18) : '—'}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amountInStr}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^[0-9]*\.?[0-9]*$/.test(v)) setAmountInStr(v);
                }}
                className="bg-transparent text-2xl font-bold outline-none w-1/2"
              />
              <button
                onClick={() => setSelectingFor('in')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition border border-white/10"
              >
                {tokenIn ? (
                  <>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: `#${tokenIn.color.toString(16).padStart(6, '0')}` }}
                    >
                      {(tokenIn.symbol || tokenIn.name)[0]}
                    </div>
                    <span className="font-bold text-sm">{tokenIn.symbol ?? tokenIn.name}</span>
                  </>
                ) : (
                  <span className="font-bold text-sm">Select</span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Switcher */}
          <div className="flex justify-center -my-3 relative z-20">
            <button
              onClick={handleFlip}
              className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-white/20 flex items-center justify-center hover:scale-110 transition shadow-lg hover:border-polkadot-pink/50"
            >
              <svg className="w-4 h-4 text-polkadot-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* To Input */}
          <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-4 relative z-10">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-gray-400">To</span>
              <span className="text-xs text-gray-400">
                Balance: {tokenOut ? formatTokenAmount(balanceOut, tokenOut.decimals ?? 18) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <input
                type="text"
                placeholder="0.0"
                value={amountOutStr}
                readOnly
                className="bg-transparent text-2xl font-bold outline-none w-1/2 text-gray-300"
              />
              <button
                onClick={() => setSelectingFor('out')}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition border border-white/10"
              >
                {tokenOut ? (
                  <>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: `#${tokenOut.color.toString(16).padStart(6, '0')}` }}
                    >
                      {(tokenOut.symbol || tokenOut.name)[0]}
                    </div>
                    <span className="font-bold text-sm">{tokenOut.symbol ?? tokenOut.name}</span>
                  </>
                ) : (
                  <span className="font-bold text-sm">Select</span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Trade Info */}
          {rateStr && (
            <div className="bg-white/5 rounded-xl p-3 mb-4 space-y-1.5 border border-white/5 relative z-10">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Rate</span>
                <span className="text-white font-mono">{rateStr}</span>
              </div>
              {priceImpact !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Price Impact</span>
                  <span className={`font-mono ${priceImpact > 5 ? 'text-red-400' : priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Slippage</span>
                <span className="text-white font-mono">{slippage}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Fee</span>
                <span className="text-white font-mono">{pool ? (pool.fee / 100).toFixed(2) : '0.30'}%</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleButtonClick}
            disabled={buttonState.action === 'disabled'}
            className={`w-full py-4 rounded-xl font-bold font-display text-sm transition relative z-10 ${
              buttonState.action === 'disabled'
                ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                : buttonState.action === 'switch'
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                : 'bg-polkadot-pink hover:bg-pink-600 text-white shadow-[0_0_20px_rgba(230,0,122,0.4)] hover:shadow-[0_0_30px_rgba(230,0,122,0.6)]'
            }`}
          >
            {buttonState.label}
          </button>
        </div>
      </div>

      {/* Token Select Modal */}
      {selectingFor && (
        <TokenSelectModal
          tokens={tokens}
          balances={balances}
          excludeAddress={selectingFor === 'in' ? tokenOut?.address : tokenIn?.address}
          onSelect={handleSelectToken}
          onClose={() => setSelectingFor(null)}
        />
      )}

      {/* Transaction Status */}
      <TransactionStatus
        status={status}
        txHash={txHash}
        error={error}
        onClose={() => {
          reset();
          if (status === 'success') {
            setAmountInStr('');
            refetchBalances();
          }
        }}
      />
    </div>
  );
}

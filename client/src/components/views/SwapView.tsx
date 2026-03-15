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

  const tokenAddresses = useMemo(() => {
    const addrs: string[] = [];
    if (tokenIn?.address) addrs.push(tokenIn.address);
    if (tokenOut?.address) addrs.push(tokenOut.address);
    return addrs;
  }, [tokenIn?.address, tokenOut?.address]);

  const { balances, refetch: refetchBalances } = useTokenBalances(tokenAddresses, address, provider);
  const { pool } = usePool(tokenIn?.address ?? null, tokenOut?.address ?? null, provider);

  const amountIn = useMemo(() => {
    if (!amountInStr || !tokenIn) return 0n;
    try { return parseTokenAmount(amountInStr, tokenIn.decimals ?? 18); } catch { return 0n; }
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

  const balanceIn = tokenIn?.address ? balances.get(tokenIn.address.toLowerCase()) ?? 0n : 0n;
  const balanceOut = tokenOut?.address ? balances.get(tokenOut.address.toLowerCase()) ?? 0n : 0n;

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
    await executeSwap({ signer, poolAddress: pool.poolAddress, tokenIn: tokenIn.address, amountIn, minAmountOut: minOut });
    refetchBalances();
  }, [signer, pool, tokenIn, amountIn, amountOut, slippage, executeSwap, refetchBalances]);

  const handleButtonClick = () => {
    if (buttonState.action === 'connect') connect();
    else if (buttonState.action === 'switch') switchChain();
    else if (buttonState.action === 'swap') handleSwap();
  };

  const handleFlip = () => { setTokenIn(tokenOut); setTokenOut(tokenIn); setAmountInStr(''); };

  const handleSelectToken = (token: Token) => {
    if (selectingFor === 'in') { if (tokenOut?.address === token.address) setTokenOut(tokenIn); setTokenIn(token); }
    else { if (tokenIn?.address === token.address) setTokenIn(tokenOut); setTokenOut(token); }
    setSelectingFor(null);
  };

  const handleMax = () => { if (balanceIn > 0n && tokenIn) setAmountInStr(formatTokenAmount(balanceIn, tokenIn.decimals ?? 18)); };

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
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-full max-w-[420px] animate-fadeInUp">
        <div className="gradient-border">
          <div className="glass-panel rounded-[1.4rem] p-6 relative overflow-hidden">
            {/* Nebula orbs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-nebula-purple/12 blur-[80px] rounded-full orb-pulse"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-nebula-blue/8 blur-[60px] rounded-full orb-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10 animate-fadeIn stagger-1">
              <div>
                <h2 className="font-display text-lg font-bold">Swap</h2>
                <p className="text-[10px] text-white/30 font-data mt-0.5">Trade tokens instantly</p>
              </div>
              <div className="relative">
                <button onClick={() => setShowSettings((v) => !v)} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-nebula-purple/8 transition-all duration-200">
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-60 p-4 rounded-xl bg-deep border border-nebula-purple/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-30 animate-scaleIn">
                    <p className="text-[10px] text-white/30 mb-3 font-data uppercase tracking-wider">Slippage Tolerance</p>
                    <div className="flex gap-2">
                      {[0.1, 0.5, 1.0].map((v) => (
                        <button key={v} onClick={() => setSlippage(v)} className={`flex-1 py-2 rounded-lg text-xs font-data font-medium transition-all duration-200 ${slippage === v ? 'bg-nebula-purple/15 border border-nebula-purple/30 text-nebula-purple shadow-[0_0_12px_rgba(123,47,190,0.15)]' : 'bg-white/[0.02] border border-white/[0.04] text-white/40 hover:text-white hover:border-white/[0.08]'}`}>
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* From */}
            <div className="bg-white/[0.015] p-4 rounded-2xl border border-nebula-purple/8 mb-2 relative z-10 hover:border-nebula-purple/15 transition-colors duration-300 animate-fadeIn stagger-2">
              <div className="flex justify-between mb-2.5">
                <span className="text-[10px] text-white/25 font-data uppercase tracking-wider">From</span>
                <button onClick={handleMax} className="text-[10px] text-white/25 hover:text-nebula-purple transition-colors font-data">
                  Balance: {tokenIn ? formatTokenAmount(balanceIn, tokenIn.decimals ?? 18) : '—'}
                </button>
              </div>
              <div className="flex justify-between items-center gap-3">
                <input type="text" inputMode="decimal" placeholder="0.0" value={amountInStr} onChange={(e) => { if (/^[0-9]*\.?[0-9]*$/.test(e.target.value)) setAmountInStr(e.target.value); }} className="bg-transparent text-2xl font-display font-bold outline-none w-1/2 placeholder:text-white/10" />
                <button onClick={() => setSelectingFor('in')} className="flex items-center gap-2 bg-nebula-purple/8 hover:bg-nebula-purple/12 px-3.5 py-2 rounded-xl transition-all duration-200 border border-nebula-purple/10 hover:border-nebula-purple/20 shrink-0">
                  {tokenIn ? (<><div className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-display font-bold" style={{ backgroundColor: `#${tokenIn.color.toString(16).padStart(6, '0')}30` }}>{(tokenIn.symbol || tokenIn.name)[0]}</div><span className="font-body font-semibold text-sm">{tokenIn.symbol ?? tokenIn.name}</span></>) : (<span className="font-body font-semibold text-sm text-white/40">Select</span>)}
                  <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            {/* Flip */}
            <div className="flex justify-center -my-3 relative z-20 animate-fadeIn stagger-3">
              <button onClick={handleFlip} className="w-9 h-9 rounded-xl bg-deep border border-nebula-purple/15 flex items-center justify-center hover:border-nebula-purple/30 hover:bg-nebula-purple/5 transition-all duration-300 shadow-lg group btn-press">
                <svg className="w-4 h-4 text-white/40 group-hover:text-nebula-purple transition-colors group-hover:rotate-180 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
              </button>
            </div>

            {/* To */}
            <div className="bg-white/[0.015] p-4 rounded-2xl border border-nebula-purple/8 mb-4 relative z-10 hover:border-nebula-purple/15 transition-colors duration-300 animate-fadeIn stagger-3">
              <div className="flex justify-between mb-2.5">
                <span className="text-[10px] text-white/25 font-data uppercase tracking-wider">To</span>
                <span className="text-[10px] text-white/25 font-data">Balance: {tokenOut ? formatTokenAmount(balanceOut, tokenOut.decimals ?? 18) : '—'}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <input type="text" placeholder="0.0" value={amountOutStr} readOnly className="bg-transparent text-2xl font-display font-bold outline-none w-1/2 text-white/50 placeholder:text-white/10" />
                <button onClick={() => setSelectingFor('out')} className="flex items-center gap-2 bg-nebula-purple/8 hover:bg-nebula-purple/12 px-3.5 py-2 rounded-xl transition-all duration-200 border border-nebula-purple/10 hover:border-nebula-purple/20 shrink-0">
                  {tokenOut ? (<><div className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-display font-bold" style={{ backgroundColor: `#${tokenOut.color.toString(16).padStart(6, '0')}30` }}>{(tokenOut.symbol || tokenOut.name)[0]}</div><span className="font-body font-semibold text-sm">{tokenOut.symbol ?? tokenOut.name}</span></>) : (<span className="font-body font-semibold text-sm text-white/40">Select</span>)}
                  <svg className="w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            {/* Trade Info */}
            {rateStr && (
              <div className="bg-nebula-purple/5 rounded-xl p-4 mb-4 space-y-2.5 border border-nebula-purple/8 relative z-10 animate-fadeIn stagger-4">
                <div className="flex justify-between text-[11px]"><span className="text-white/30 font-body">Rate</span><span className="text-white/70 font-data">{rateStr}</span></div>
                {priceImpact !== null && (<div className="flex justify-between text-[11px]"><span className="text-white/30 font-body">Price Impact</span><span className={`font-data font-medium ${priceImpact > 5 ? 'text-red-400' : priceImpact > 1 ? 'text-stellar-gold' : 'text-aurora-green'}`}>{priceImpact.toFixed(2)}%</span></div>)}
                <div className="flex justify-between text-[11px]"><span className="text-white/30 font-body">Slippage</span><span className="text-white/40 font-data">{slippage}%</span></div>
                <div className="flex justify-between text-[11px]"><span className="text-white/30 font-body">Fee</span><span className="text-white/40 font-data">{pool ? (pool.fee / 100).toFixed(2) : '0.30'}%</span></div>
              </div>
            )}

            {/* Action */}
            <button onClick={handleButtonClick} disabled={buttonState.action === 'disabled'} className={`w-full py-4 rounded-xl font-display font-bold text-sm transition-all duration-300 relative z-10 btn-press animate-fadeIn stagger-5 ${buttonState.action === 'disabled' ? 'bg-white/[0.03] text-white/20 cursor-not-allowed border border-white/[0.03]' : buttonState.action === 'switch' ? 'bg-stellar-gold/90 hover:bg-stellar-gold text-void shadow-[0_0_25px_rgba(255,184,0,0.3)]' : 'btn-galaxy text-white'}`}>
              {buttonState.label}
            </button>
          </div>
        </div>
      </div>

      {selectingFor && <TokenSelectModal tokens={tokens} balances={balances} excludeAddress={selectingFor === 'in' ? tokenOut?.address : tokenIn?.address} onSelect={handleSelectToken} onClose={() => setSelectingFor(null)} />}
      <TransactionStatus status={status} txHash={txHash} error={error} onClose={() => { reset(); if (status === 'success') { setAmountInStr(''); refetchBalances(); } }} />
    </div>
  );
}

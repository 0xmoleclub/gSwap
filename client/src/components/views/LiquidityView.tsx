'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Contract } from 'ethers';
import { Token } from '@/types/token';
import { useWallet } from '@/context/WalletContext';
import { useIndexerData } from '@/hooks/useIndexerData';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { usePool } from '@/hooks/usePool';
import { useLiquidity } from '@/hooks/useLiquidity';
import { TokenSelectModal } from '@/components/TokenSelectModal';
import { TransactionStatus } from '@/components/TransactionStatus';
import { POOL_ABI } from '@/config/abis';
import {
  formatTokenAmount,
  parseTokenAmount,
  sortTokens,
} from '@/lib/format';

type Tab = 'add' | 'remove' | 'create';

export function LiquidityView() {
  const { address, signer, provider, isCorrectChain, connect, switchChain } = useWallet();
  const { data: indexerData } = useIndexerData();
  const tokens = indexerData?.tokens ?? [];

  const [activeTab, setActiveTab] = useState<Tab>('add');
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [amountAStr, setAmountAStr] = useState('');
  const [amountBStr, setAmountBStr] = useState('');
  const [removeAmountStr, setRemoveAmountStr] = useState('');
  const [selectingFor, setSelectingFor] = useState<'a' | 'b' | null>(null);
  const [lpBalance, setLpBalance] = useState<bigint>(0n);

  const { status, txHash, error, addLiquidity, removeLiquidity, createPool, reset } = useLiquidity();

  const tokenAddresses = useMemo(() => {
    const addrs: string[] = [];
    if (tokenA?.address) addrs.push(tokenA.address);
    if (tokenB?.address) addrs.push(tokenB.address);
    return addrs;
  }, [tokenA?.address, tokenB?.address]);

  const { balances, refetch: refetchBalances } = useTokenBalances(tokenAddresses, address, provider);
  const { pool, refetch: refetchPool } = usePool(tokenA?.address ?? null, tokenB?.address ?? null, provider);

  useEffect(() => {
    if (!pool || !address || !provider) {
      setLpBalance(0n);
      return;
    }
    const poolContract = new Contract(pool.poolAddress, POOL_ABI, provider);
    poolContract.balanceOf(address).then((b: bigint) => setLpBalance(b)).catch(() => setLpBalance(0n));
  }, [pool, address, provider, status]);

  useEffect(() => {
    if (activeTab !== 'add' || !pool || !amountAStr || !tokenA?.address) return;
    const isToken0 = tokenA.address.toLowerCase() === pool.token0.toLowerCase();
    const reserveA = isToken0 ? pool.reserve0 : pool.reserve1;
    const reserveB = isToken0 ? pool.reserve1 : pool.reserve0;
    if (reserveA === 0n) return;

    try {
      const parsedA = parseTokenAmount(amountAStr, tokenA.decimals ?? 18);
      const proportionalB = (parsedA * reserveB) / reserveA;
      if (tokenB) {
        setAmountBStr(formatTokenAmount(proportionalB, tokenB.decimals ?? 18));
      }
    } catch {
      // ignore parse errors
    }
  }, [amountAStr, pool, tokenA, tokenB, activeTab]);

  const balanceA = tokenA?.address ? balances.get(tokenA.address.toLowerCase()) ?? 0n : 0n;
  const balanceB = tokenB?.address ? balances.get(tokenB.address.toLowerCase()) ?? 0n : 0n;

  const poolSharePct = useMemo(() => {
    if (!pool || pool.totalSupply === 0n || !amountAStr || !tokenA?.address) return null;
    const isToken0 = tokenA.address.toLowerCase() === pool.token0.toLowerCase();
    const reserveA = isToken0 ? pool.reserve0 : pool.reserve1;
    if (reserveA === 0n) return null;
    try {
      const parsedA = parseTokenAmount(amountAStr, tokenA.decimals ?? 18);
      const newLp = (parsedA * pool.totalSupply) / reserveA;
      const share = Number(newLp) / Number(pool.totalSupply + newLp) * 100;
      return share;
    } catch {
      return null;
    }
  }, [pool, amountAStr, tokenA]);

  const removePreview = useMemo(() => {
    if (!pool || pool.totalSupply === 0n || !removeAmountStr) return null;
    try {
      const lpAmount = parseTokenAmount(removeAmountStr, 18);
      const amount0 = (lpAmount * pool.reserve0) / pool.totalSupply;
      const amount1 = (lpAmount * pool.reserve1) / pool.totalSupply;
      return { amount0, amount1 };
    } catch {
      return null;
    }
  }, [pool, removeAmountStr]);

  const token0Display = useMemo(() => {
    if (!pool || !tokenA?.address) return tokenA;
    const isToken0 = tokenA.address.toLowerCase() === pool.token0.toLowerCase();
    return isToken0 ? tokenA : tokenB;
  }, [pool, tokenA, tokenB]);

  const token1Display = useMemo(() => {
    if (!pool || !tokenA?.address) return tokenB;
    const isToken0 = tokenA.address.toLowerCase() === pool.token0.toLowerCase();
    return isToken0 ? tokenB : tokenA;
  }, [pool, tokenA, tokenB]);

  const buttonState = useMemo(() => {
    if (!address) return { label: 'Connect Wallet', action: 'connect' as const };
    if (!isCorrectChain) return { label: 'Switch Network', action: 'switch' as const };
    if (!tokenA || !tokenB) return { label: 'Select Tokens', action: 'disabled' as const };

    if (activeTab === 'create') {
      if (pool) return { label: 'Pool Already Exists', action: 'disabled' as const };
      if (!amountAStr || !amountBStr) return { label: 'Enter Amounts', action: 'disabled' as const };
      return { label: 'Create Pool & Add Liquidity', action: 'create' as const };
    }

    if (activeTab === 'remove') {
      if (!pool) return { label: 'No Pool Found', action: 'disabled' as const };
      if (lpBalance === 0n) return { label: 'No LP Tokens', action: 'disabled' as const };
      if (!removeAmountStr) return { label: 'Enter Amount', action: 'disabled' as const };
      try {
        const lpAmount = parseTokenAmount(removeAmountStr, 18);
        if (lpAmount > lpBalance) return { label: 'Exceeds LP Balance', action: 'disabled' as const };
      } catch {
        return { label: 'Invalid Amount', action: 'disabled' as const };
      }
      return { label: 'Remove Liquidity', action: 'remove' as const };
    }

    if (!pool) return { label: 'No Pool — Create One First', action: 'disabled' as const };
    if (!amountAStr || !amountBStr) return { label: 'Enter Amounts', action: 'disabled' as const };
    try {
      const parsedA = parseTokenAmount(amountAStr, tokenA.decimals ?? 18);
      const parsedB = parseTokenAmount(amountBStr, tokenB.decimals ?? 18);
      if (parsedA > balanceA) return { label: `Insufficient ${tokenA.symbol ?? 'Token A'}`, action: 'disabled' as const };
      if (parsedB > balanceB) return { label: `Insufficient ${tokenB.symbol ?? 'Token B'}`, action: 'disabled' as const };
    } catch {
      return { label: 'Invalid Amount', action: 'disabled' as const };
    }
    return { label: 'Supply Liquidity', action: 'add' as const };
  }, [address, isCorrectChain, tokenA, tokenB, activeTab, pool, amountAStr, amountBStr, removeAmountStr, lpBalance, balanceA, balanceB]);

  const handleButtonClick = useCallback(async () => {
    if (buttonState.action === 'connect') { connect(); return; }
    if (buttonState.action === 'switch') { switchChain(); return; }
    if (!signer || !tokenA?.address || !tokenB?.address) return;

    if (buttonState.action === 'add' && pool) {
      const parsedA = parseTokenAmount(amountAStr, tokenA.decimals ?? 18);
      const parsedB = parseTokenAmount(amountBStr, tokenB.decimals ?? 18);
      await addLiquidity(signer, pool.poolAddress, tokenA.address, tokenB.address, parsedA, parsedB);
      refetchBalances();
      refetchPool();
    } else if (buttonState.action === 'remove' && pool) {
      const lpAmount = parseTokenAmount(removeAmountStr, 18);
      await removeLiquidity(signer, pool.poolAddress, lpAmount);
      refetchBalances();
      refetchPool();
    } else if (buttonState.action === 'create') {
      const poolAddr = await createPool(signer, tokenA.address, tokenB.address);
      if (poolAddr) {
        const parsedA = parseTokenAmount(amountAStr, tokenA.decimals ?? 18);
        const parsedB = parseTokenAmount(amountBStr, tokenB.decimals ?? 18);
        await addLiquidity(signer, poolAddr, tokenA.address, tokenB.address, parsedA, parsedB);
        refetchBalances();
        refetchPool();
      }
    }
  }, [buttonState.action, signer, tokenA, tokenB, pool, amountAStr, amountBStr, removeAmountStr, connect, switchChain, addLiquidity, removeLiquidity, createPool, refetchBalances, refetchPool]);

  const handleSelectToken = (token: Token) => {
    if (selectingFor === 'a') {
      if (tokenB?.address === token.address) setTokenB(tokenA);
      setTokenA(token);
    } else {
      if (tokenA?.address === token.address) setTokenA(tokenB);
      setTokenB(token);
    }
    setSelectingFor(null);
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'add', label: 'Add', icon: '+' },
    { id: 'remove', label: 'Remove', icon: '−' },
    { id: 'create', label: 'Create', icon: '◇' },
  ];

  return (
    <div className="flex items-center justify-center w-full h-full px-4">
      <div className="w-full max-w-[420px] animate-fadeInUp">
        <div className="gradient-border">
          <div className="glass-panel rounded-[1.4rem] p-6 relative overflow-hidden">
            {/* Nebula orbs */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-nebula-blue/8 blur-[80px] rounded-full orb-pulse"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-nebula-purple/10 blur-[60px] rounded-full orb-pulse" style={{ animationDelay: '2s' }}></div>

            {/* Tabs */}
            <div className="flex mb-6 relative z-10 bg-white/[0.02] rounded-xl p-1 border border-nebula-purple/8 animate-fadeIn stagger-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 rounded-lg text-[11px] font-body font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'text-white bg-white/[0.06] border border-white/[0.06] shadow-sm'
                      : 'text-white/30 hover:text-gray-300 border border-transparent'
                  }`}
                >
                  <span className="text-[10px] opacity-50">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative z-10">
              {/* Token A Input */}
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-nebula-purple/8 mb-2 hover:border-nebula-purple/15 transition-colors duration-300 animate-fadeIn stagger-2">
                <div className="flex justify-between mb-2.5">
                  <span className="text-[10px] text-white/30 font-data uppercase tracking-wider">Token A</span>
                  <span className="text-[10px] text-white/30 font-data">
                    Bal: {tokenA ? formatTokenAmount(balanceA, tokenA.decimals ?? 18) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={activeTab === 'remove' ? '' : amountAStr}
                    disabled={activeTab === 'remove'}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^[0-9]*\.?[0-9]*$/.test(v)) setAmountAStr(v);
                    }}
                    className="bg-transparent text-xl font-display font-bold outline-none w-1/2 disabled:text-white/15 placeholder:text-white/15"
                  />
                  <button
                    onClick={() => setSelectingFor('a')}
                    className="flex items-center gap-2 bg-nebula-purple/8 px-3.5 py-2 rounded-xl border border-white/[0.06] hover:bg-nebula-purple/12 hover:border-white/[0.12] transition-all duration-200 shrink-0"
                  >
                    {tokenA ? (
                      <>
                        <div
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-display font-bold"
                          style={{ backgroundColor: `#${tokenA.color.toString(16).padStart(6, '0')}30` }}
                        >
                          {(tokenA.symbol || tokenA.name)[0]}
                        </div>
                        <span className="font-body font-semibold text-sm">{tokenA.symbol ?? tokenA.name}</span>
                      </>
                    ) : (
                      <span className="font-body font-semibold text-sm text-white/40">Select</span>
                    )}
                    <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Plus divider */}
              <div className="flex justify-center -my-3 z-20 relative animate-fadeIn stagger-3">
                <div className="w-9 h-9 rounded-xl bg-deep border border-white/[0.08] flex items-center justify-center shadow-lg">
                  <span className="text-white/40 text-sm font-data">+</span>
                </div>
              </div>

              {/* Token B Input */}
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-nebula-purple/8 mb-4 hover:border-nebula-purple/15 transition-colors duration-300 animate-fadeIn stagger-3">
                <div className="flex justify-between mb-2.5">
                  <span className="text-[10px] text-white/30 font-data uppercase tracking-wider">Token B</span>
                  <span className="text-[10px] text-white/30 font-data">
                    Bal: {tokenB ? formatTokenAmount(balanceB, tokenB.decimals ?? 18) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={activeTab === 'remove' ? '' : amountBStr}
                    disabled={activeTab === 'remove'}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^[0-9]*\.?[0-9]*$/.test(v)) setAmountBStr(v);
                    }}
                    className="bg-transparent text-xl font-display font-bold outline-none w-1/2 disabled:text-white/15 placeholder:text-white/15"
                  />
                  <button
                    onClick={() => setSelectingFor('b')}
                    className="flex items-center gap-2 bg-nebula-purple/8 px-3.5 py-2 rounded-xl border border-white/[0.06] hover:bg-nebula-purple/12 hover:border-white/[0.12] transition-all duration-200 shrink-0"
                  >
                    {tokenB ? (
                      <>
                        <div
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-display font-bold"
                          style={{ backgroundColor: `#${tokenB.color.toString(16).padStart(6, '0')}30` }}
                        >
                          {(tokenB.symbol || tokenB.name)[0]}
                        </div>
                        <span className="font-body font-semibold text-sm">{tokenB.symbol ?? tokenB.name}</span>
                      </>
                    ) : (
                      <span className="font-body font-semibold text-sm text-white/40">Select</span>
                    )}
                    <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Remove: LP amount input */}
              {activeTab === 'remove' && pool && (
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-nebula-purple/8 mb-4 animate-fadeIn">
                  <div className="flex justify-between mb-2.5">
                    <span className="text-[10px] text-white/30 font-data uppercase tracking-wider">LP Tokens to Remove</span>
                    <button
                      onClick={() => setRemoveAmountStr(formatTokenAmount(lpBalance, 18))}
                      className="text-[10px] text-white/30 hover:text-nebula-purple transition-colors font-data"
                    >
                      Balance: {formatTokenAmount(lpBalance, 18)}
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.0"
                    value={removeAmountStr}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^[0-9]*\.?[0-9]*$/.test(v)) setRemoveAmountStr(v);
                    }}
                    className="bg-transparent text-xl font-display font-bold outline-none w-full placeholder:text-white/15"
                  />
                  {removePreview && (
                    <div className="mt-3 pt-3 border-t border-nebula-purple/8 space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/30 font-body">You receive {token0Display?.symbol ?? 'Token0'}</span>
                        <span className="text-white/80 font-data">
                          {formatTokenAmount(removePreview.amount0, token0Display?.decimals ?? 18)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-white/30 font-body">You receive {token1Display?.symbol ?? 'Token1'}</span>
                        <span className="text-white/80 font-data">
                          {formatTokenAmount(removePreview.amount1, token1Display?.decimals ?? 18)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Info Section */}
              {activeTab === 'add' && pool && (
                <div className="bg-white/[0.015] rounded-xl p-4 mb-4 space-y-2.5 border border-white/[0.03] animate-fadeIn stagger-4">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/30 font-body">Pool</span>
                    <span className="text-white/60 font-data text-[10px]">
                      {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/30 font-body">Your LP Balance</span>
                    <span className="text-white/80 font-data">{formatTokenAmount(lpBalance, 18)}</span>
                  </div>
                  {poolSharePct !== null && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/30 font-body">Pool Share</span>
                      <span className="text-aurora-cyan font-data font-medium">{poolSharePct.toFixed(4)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/30 font-body">Fee Tier</span>
                    <span className="text-white/60 font-data">{(pool.fee / 100).toFixed(2)}%</span>
                  </div>
                </div>
              )}

              {activeTab === 'create' && (
                <div className="rounded-xl p-4 mb-4 border animate-fadeIn stagger-4 ${pool ? 'bg-amber-500/5 border-amber-500/10' : 'bg-polkadot-cyan/5 border-polkadot-cyan/10'}">
                  {pool ? (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                      <p className="text-[11px] text-amber-300/80 font-body">
                        This pool already exists. Switch to the Add tab to add liquidity.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-polkadot-cyan/5 border border-polkadot-cyan/10 rounded-xl p-3">
                      <p className="text-[11px] text-aurora-cyan/70 font-body italic">
                        You are the first liquidity provider. The ratio of tokens you add will set the initial price.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleButtonClick}
                disabled={buttonState.action === 'disabled'}
                className={`w-full py-4 rounded-xl font-display font-bold text-sm transition-all duration-300 btn-press animate-fadeIn stagger-5 ${
                  buttonState.action === 'disabled'
                    ? 'bg-nebula-purple/8 text-gray-600 cursor-not-allowed border border-nebula-purple/8'
                    : buttonState.action === 'switch'
                    ? 'bg-orange-500/90 hover:bg-orange-500 text-white shadow-[0_0_25px_rgba(255,184,0,0.3)]'
                    : 'bg-gradient-to-r from-nebula-purple via-nebula-blue to-nebula-purple text-white shadow-[0_0_25px_rgba(123,47,190,0.3)] hover:shadow-[0_0_40px_rgba(123,47,190,0.5)]'
                }`}
              >
                {buttonState.label}
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectingFor && (
        <TokenSelectModal
          tokens={tokens}
          balances={balances}
          excludeAddress={selectingFor === 'a' ? tokenB?.address : tokenA?.address}
          onSelect={handleSelectToken}
          onClose={() => setSelectingFor(null)}
        />
      )}

      <TransactionStatus
        status={status}
        txHash={txHash}
        error={error}
        onClose={() => {
          reset();
          if (status === 'success') {
            setAmountAStr('');
            setAmountBStr('');
            setRemoveAmountStr('');
            refetchBalances();
            refetchPool();
          }
        }}
      />
    </div>
  );
}

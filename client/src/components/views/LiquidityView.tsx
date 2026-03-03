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

  // Token addresses for balances
  const tokenAddresses = useMemo(() => {
    const addrs: string[] = [];
    if (tokenA?.address) addrs.push(tokenA.address);
    if (tokenB?.address) addrs.push(tokenB.address);
    return addrs;
  }, [tokenA?.address, tokenB?.address]);

  const { balances, refetch: refetchBalances } = useTokenBalances(tokenAddresses, address, provider);
  const { pool, refetch: refetchPool } = usePool(tokenA?.address ?? null, tokenB?.address ?? null, provider);

  // Fetch LP balance
  useEffect(() => {
    if (!pool || !address || !provider) {
      setLpBalance(0n);
      return;
    }
    const poolContract = new Contract(pool.poolAddress, POOL_ABI, provider);
    poolContract.balanceOf(address).then((b: bigint) => setLpBalance(b)).catch(() => setLpBalance(0n));
  }, [pool, address, provider, status]);

  // Auto-calculate proportional amount B when user enters amount A (existing pool)
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

  // Pool share calculation
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

  // Remove: how many tokens you'd get back
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

  // Find token by pool address order
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

  // Button logic
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

    // Add tab
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
        // Pool created — now add initial liquidity
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

  return (
    <div className="flex items-center justify-center w-full h-full animate-fadeIn px-4">
      <div className="w-full max-w-md p-1 rounded-3xl bg-gradient-to-br from-white/10 to-transparent p-[1px]">
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-polkadot-pink/20 blur-[60px] rounded-full"></div>

          {/* Tabs */}
          <div className="flex space-x-6 mb-6 relative z-10 border-b border-white/10">
            {(['add', 'remove', 'create'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-white border-polkadot-pink'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                {tab === 'add' ? 'Add' : tab === 'remove' ? 'Remove' : 'Create Pair'}
              </button>
            ))}
          </div>

          <div className="relative z-10">
            {/* Token A Input */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-2">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">Token A</span>
                <span className="text-xs text-gray-400">
                  Bal: {tokenA ? formatTokenAmount(balanceA, tokenA.decimals ?? 18) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
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
                  className="bg-transparent text-xl font-bold outline-none w-1/2 disabled:text-gray-600"
                />
                <button
                  onClick={() => setSelectingFor('a')}
                  className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/20 transition"
                >
                  {tokenA ? (
                    <>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ backgroundColor: `#${tokenA.color.toString(16).padStart(6, '0')}` }}
                      >
                        {(tokenA.symbol || tokenA.name)[0]}
                      </div>
                      <span className="font-bold text-sm">{tokenA.symbol ?? tokenA.name}</span>
                    </>
                  ) : (
                    <span className="font-bold text-sm">Select</span>
                  )}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex justify-center -my-3 z-20 relative">
              <div className="bg-[#1a1a1a] p-1.5 rounded-full border border-white/20 shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-8-8h16" />
                </svg>
              </div>
            </div>

            {/* Token B Input */}
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-400">Token B</span>
                <span className="text-xs text-gray-400">
                  Bal: {tokenB ? formatTokenAmount(balanceB, tokenB.decimals ?? 18) : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
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
                  className="bg-transparent text-xl font-bold outline-none w-1/2 disabled:text-gray-600"
                />
                <button
                  onClick={() => setSelectingFor('b')}
                  className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/20 transition"
                >
                  {tokenB ? (
                    <>
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                        style={{ backgroundColor: `#${tokenB.color.toString(16).padStart(6, '0')}` }}
                      >
                        {(tokenB.symbol || tokenB.name)[0]}
                      </div>
                      <span className="font-bold text-sm">{tokenB.symbol ?? tokenB.name}</span>
                    </>
                  ) : (
                    <span className="font-bold text-sm">Select</span>
                  )}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Remove: LP amount input */}
            {activeTab === 'remove' && pool && (
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-gray-400">LP Tokens to Remove</span>
                  <button
                    onClick={() => setRemoveAmountStr(formatTokenAmount(lpBalance, 18))}
                    className="text-xs text-gray-400 hover:text-white transition"
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
                  className="bg-transparent text-xl font-bold outline-none w-full"
                />
                {removePreview && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">You receive {token0Display?.symbol ?? 'Token0'}</span>
                      <span className="text-white font-mono">
                        {formatTokenAmount(removePreview.amount0, token0Display?.decimals ?? 18)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">You receive {token1Display?.symbol ?? 'Token1'}</span>
                      <span className="text-white font-mono">
                        {formatTokenAmount(removePreview.amount1, token1Display?.decimals ?? 18)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Info Section */}
            {activeTab === 'add' && pool && (
              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Pool</span>
                  <span className="text-white font-mono text-[10px]">
                    {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Your LP Balance</span>
                  <span className="text-white font-mono">{formatTokenAmount(lpBalance, 18)}</span>
                </div>
                {poolSharePct !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Pool Share</span>
                    <span className="text-white font-mono">{poolSharePct.toFixed(4)}%</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Fee Tier</span>
                  <span className="text-white font-mono">{(pool.fee / 100).toFixed(2)}%</span>
                </div>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-2 border border-white/5">
                {pool ? (
                  <div className="p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                    <p className="text-[10px] text-yellow-300">
                      This pool already exists. Switch to the Add tab to add liquidity.
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                    <p className="text-[10px] text-blue-300 italic">
                      You are the first liquidity provider. The ratio of tokens you add will set the initial price of this pool.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleButtonClick}
              disabled={buttonState.action === 'disabled'}
              className={`w-full py-4 rounded-xl font-bold font-display text-sm transition ${
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
      </div>

      {/* Token Select Modal */}
      {selectingFor && (
        <TokenSelectModal
          tokens={tokens}
          balances={balances}
          excludeAddress={selectingFor === 'a' ? tokenB?.address : tokenA?.address}
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

'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Header } from '@/components/Header';
import { Starfield } from '@/components/Starfield';
import { NebulaBg } from '@/components/NebulaBg';

import { useWallet } from '@/context/WalletContext';
import { useFaucet, useTokenBalance } from '@/hooks/useFaucet';
import { TOKENS, HUB_TOKENS, USDT_TOKEN, GRS_TOKEN, type TokenConfig } from '@/config/tokens';
import { getTxUrl } from '@/config/chain';
import { globalStyles } from '@/styles/global-styles';

export default function FaucetPage() {
  const { address, connect } = useWallet();
  const isConnected = !!address;
  const { getState, claimTokens, resetState } = useFaucet();
  const { balances, loading: balanceLoading, fetchAllBalances, fetchBalance } = useTokenBalance();
  const [activeTab, setActiveTab] = useState<'hub' | 'all'>('hub');
  const [refreshing, setRefreshing] = useState(false);

  // All tokens including GRS
  const ALL_FAUCET_TOKENS = [...TOKENS, GRS_TOKEN];

  // Fetch balances on mount and when address changes
  useEffect(() => {
    if (address) {
      fetchAllBalances(ALL_FAUCET_TOKENS, address);
    }
  }, [address, fetchAllBalances]);

  const handleClaim = async (token: TokenConfig) => {
    if (!address) {
      connect();
      return;
    }

    const success = await claimTokens(token, address);
    if (success) {
      // Refresh balance after successful claim
      setTimeout(() => {
        fetchBalance(token, address);
      }, 2000);
    }
  };

  const handleRefresh = async () => {
    if (!address) return;
    setRefreshing(true);
    await fetchAllBalances(ALL_FAUCET_TOKENS, address);
    setRefreshing(false);
  };

  const displayTokens = activeTab === 'hub' ? HUB_TOKENS : ALL_FAUCET_TOKENS;

  return (
    <div className="relative w-full min-h-screen bg-void overflow-hidden font-sans text-white noise-overlay">
      <style>{globalStyles}</style>

      {/* Galaxy layers */}
      <NebulaBg />
      <Starfield count={150} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <Navbar currentView="faucet" />

        {/* Main content */}
        <main className="flex-1 container mx-auto px-6 py-8 pt-24">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Page Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-nebula-purple/30 to-nebula-blue/20 border border-nebula-purple/30 mb-4">
                <span className="text-3xl">🚰</span>
              </div>
              <h1 className="text-4xl font-display font-bold text-white">
                Token Faucet
              </h1>
              <p className="text-white/50 font-body max-w-xl mx-auto">
                Get free testnet tokens to start trading on gSwap. 
                <span className="text-nebula-purple"> USDT is recommended</span> as it connects to the most trading pairs.
              </p>
            </div>

            {/* GRS Platform Token Banner */}
            <div className="glass-panel rounded-xl p-5 border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-2xl">
                  ⬡
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-pink-300 mb-1">🚀 New: gSwap Token (GRS)</h3>
                  <p className="text-sm text-white/70 mb-2">
                    The gSwap platform token is now live! Stake GRS to earn rewards, reduce trading fees, and unlock exclusive benefits.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">Up to 20% APR</span>
                    <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">25% Fee Discount</span>
                    <span className="px-2 py-1 rounded bg-pink-500/20 text-pink-300">Airdrop Eligible</span>
                  </div>
                </div>
                <a
                  href="/staking"
                  className="px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 transition-all text-white font-medium text-sm"
                >
                  Stake GRS →
                </a>
              </div>
            </div>

            {/* Info Banner */}
            <div className="glass-panel rounded-xl p-4 border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-xl">💡</span>
                <div>
                  <h3 className="font-semibold text-amber-200 mb-1">Why USDT?</h3>
                  <p className="text-sm text-amber-100/70">
                    USDT is a hub token in our DEX graph, meaning you can trade from USDT to almost any other token directly. 
                    We recommend claiming USDT first for the best trading experience.
                  </p>
                </div>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setActiveTab('hub')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'hub'
                    ? 'bg-nebula-purple/30 text-white border border-nebula-purple/50'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                Hub Tokens ({HUB_TOKENS.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'all'
                    ? 'bg-nebula-purple/30 text-white border border-nebula-purple/50'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                All Tokens ({ALL_FAUCET_TOKENS.length})
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing || !address}
                className="ml-4 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
                         hover:bg-white/10 transition-all duration-300 text-sm font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                {refreshing ? 'Refreshing...' : 'Refresh Balances'}
              </button>
            </div>

            {/* Token Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTokens.map((token) => {
                const state = getState(token.address);
                const balance = balances[token.address];
                const isLoading = balanceLoading[token.address];
                const isUSDT = token.symbol === 'USDT';

                return (
                  <TokenCard
                    key={token.address}
                    token={token}
                    balance={balance}
                    isLoading={isLoading}
                    state={state}
                    isUSDT={isUSDT}
                    onClaim={() => handleClaim(token)}
                    onReset={() => resetState(token.address)}
                    isConnected={isConnected}
                    onConnect={connect}
                  />
                );
              })}
            </div>

            {/* How it works */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6 mt-12">
              <h2 className="text-xl font-display font-semibold mb-4">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StepCard
                  number="1"
                  title="Connect Wallet"
                  description="Connect your MetaMask or compatible wallet to the Polkadot Hub EVM network."
                  icon="🔗"
                />
                <StepCard
                  number="2"
                  title="Claim Tokens"
                  description="Click the claim button to receive 10,000 tokens of your choice for free."
                  icon="🚰"
                />
                <StepCard
                  number="3"
                  title="Start Trading"
                  description="Head to the Swap page and start trading with your newly acquired tokens!"
                  icon="⇄"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Token Card Component
interface TokenCardProps {
  token: TokenConfig;
  balance: string | undefined;
  isLoading: boolean;
  state: ReturnType<typeof useFaucet>['getState'];
  isUSDT: boolean;
  onClaim: () => void;
  onReset: () => void;
  isConnected: boolean;
  onConnect: () => void;
}

function TokenCard({
  token,
  balance,
  isLoading,
  state,
  isUSDT,
  onClaim,
  onReset,
  isConnected,
  onConnect,
}: TokenCardProps) {
  const faucetAmount = (10000).toLocaleString();

  return (
    <div
      className={`glass-panel rounded-xl p-5 border transition-all duration-300 relative overflow-hidden ${
        isUSDT
          ? 'border-nebula-purple/40 bg-gradient-to-br from-nebula-purple/10 to-transparent'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* USDT Badge */}
      {isUSDT && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-full bg-nebula-purple/30 text-nebula-purple text-xs font-semibold border border-nebula-purple/30">
            RECOMMENDED
          </span>
        </div>
      )}

      {/* Hub Badge */}
      {token.isHub && !isUSDT && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-full bg-nebula-blue/20 text-nebula-blue text-xs font-semibold border border-nebula-blue/20">
            HUB
          </span>
        </div>
      )}

      {/* Token Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
          style={{
            background: `linear-gradient(135deg, ${token.color}30, ${token.color}10)`,
            border: `1px solid ${token.color}40`,
            color: token.color,
          }}
        >
          {token.symbol.slice(0, 2)}
        </div>
        <div>
          <h3 className="font-semibold text-white">{token.symbol}</h3>
          <p className="text-xs text-white/40">{token.name}</p>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4 p-3 rounded-lg bg-white/5">
        <p className="text-xs text-white/40 mb-1">Your Balance</p>
        <p className="text-lg font-mono font-semibold">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : balance ? (
            <span className="text-white">{balance} <span className="text-white/50 text-sm">{token.symbol}</span></span>
          ) : (
            <span className="text-white/30">--</span>
          )}
        </p>
      </div>

      {/* Claim Amount */}
      <div className="mb-4 text-center">
        <p className="text-xs text-white/40">You will receive</p>
        <p className="text-xl font-bold text-emerald-400">+{faucetAmount} {token.symbol}</p>
      </div>

      {/* Action Button */}
      {!isConnected ? (
        <button
          onClick={onConnect}
          className="w-full py-3 rounded-xl bg-nebula-purple hover:bg-nebula-purple/80
                   transition-all duration-300 font-semibold text-white
                   shadow-[0_0_20px_rgba(123,47,190,0.3)]"
        >
          Connect Wallet
        </button>
      ) : state.isSuccess ? (
        <div className="space-y-2">
          <div className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40
                        text-emerald-400 font-semibold text-center flex items-center justify-center gap-2">
            <span>✅</span> Claimed Successfully!
          </div>
          <div className="flex gap-2">
            <a
              href={getTxUrl(state.txHash!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10
                       hover:bg-white/10 transition-all duration-300 text-sm text-center"
            >
              View Tx ↗
            </a>
            <button
              onClick={onReset}
              className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10
                       hover:bg-white/10 transition-all duration-300 text-sm"
            >
              Claim Again
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onClaim}
          disabled={state.isLoading}
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-300
            ${state.isLoading
              ? 'bg-white/10 text-white/50 cursor-wait'
              : state.error
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
              : isUSDT
              ? 'bg-nebula-purple hover:bg-nebula-purple/80 text-white shadow-[0_0_20px_rgba(123,47,190,0.3)]'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
        >
          {state.isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Claiming...
            </span>
          ) : state.error ? (
            <span className="flex items-center justify-center gap-2">
              <span>⚠️</span> {state.error.length > 30 ? state.error.slice(0, 30) + '...' : state.error}
            </span>
          ) : (
            `Claim ${token.symbol}`
          )}
        </button>
      )}
    </div>
  );
}

// Step Card Component
function StepCard({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-nebula-purple/20 border border-nebula-purple/30
                    flex items-center justify-center text-lg">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
            {number}
          </span>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-white/50">{description}</p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Header } from '@/components/Header';
import { Starfield } from '@/components/Starfield';
import { NebulaBg } from '@/components/NebulaBg';
import { useWallet } from '@/context/WalletContext';
import { useGRSStaking, useGRSToken } from '@/hooks/useGRSStaking';
import { getTxUrl } from '@/config/chain';
import { globalStyles } from '@/styles/global-styles';

// Contract addresses - DEPLOYED
const GRS_ADDRESS = '0x9d1939134297c5fa44A793c3E618f8D7Ba793024';
const STAKING_ADDRESS = '0x5a36D068898e8db3D089727890f89ae60a4b8c78';

export default function StakingPage() {
  const { address } = useWallet();
  const isConnected = !!address;
  
  const { 
    stake, withdraw, claimRewards, getStakeInfo,
    isStaking, isWithdrawing, isClaiming, error, txHash 
  } = useGRSStaking(GRS_ADDRESS, STAKING_ADDRESS);
  
  const { balance, tier, discount, isEligible, fetchGRSInfo } = useGRSToken(GRS_ADDRESS);
  
  const [stats, setStats] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lockTokens, setLockTokens] = useState(true);
  const [activeTab, setActiveTab] = useState<'stake' | 'withdraw'>('stake');

  // Refresh data
  const refreshData = async () => {
    if (!address) return;
    const info = await getStakeInfo(address);
    setStats(info);
    await fetchGRSInfo(address);
  };

  useEffect(() => {
    if (address) {
      refreshData();
    }
  }, [address]);

  const handleStake = async () => {
    if (!address || !stakeAmount) return;
    const success = await stake(stakeAmount, lockTokens, address);
    if (success) {
      setStakeAmount('');
      setTimeout(refreshData, 2000);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !withdrawAmount) return;
    const success = await withdraw(withdrawAmount, address);
    if (success) {
      setWithdrawAmount('');
      setTimeout(refreshData, 2000);
    }
  };

  const handleClaim = async () => {
    if (!address) return;
    const success = await claimRewards(address);
    if (success) {
      setTimeout(refreshData, 2000);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Unlocked';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  return (
    <div className="relative w-full min-h-screen bg-void overflow-hidden font-sans text-white noise-overlay">
      <style>{globalStyles}</style>

      <NebulaBg />
      <Starfield count={150} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <Navbar currentView="staking" />

        <main className="flex-1 container mx-auto px-6 py-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Page Header */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/30 to-pink-600/20 border border-pink-500/30 mb-4">
                <span className="text-3xl">⬡</span>
              </div>
              <h1 className="text-4xl font-display font-bold text-white">
                GRS Staking
              </h1>
              <p className="text-white/50 font-body max-w-xl mx-auto">
                Stake your GRS tokens to earn rewards, reduce trading fees, and unlock exclusive benefits.
              </p>
            </div>

            {/* Benefits Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BenefitCard
                icon="💰"
                title="Earn Rewards"
                description="Earn up to 20% APR by staking GRS with a 30-day lock"
                color="emerald"
              />
              <BenefitCard
                icon="⚡"
                title="Reduced Fees"
                description="Get up to 25% discount on all trading fees"
                color="amber"
              />
              <BenefitCard
                icon="🎁"
                title="Airdrops"
                description="Eligible for exclusive airdrops and platform rewards"
                color="pink"
              />
            </div>

            {/* Stats Overview */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-display font-semibold mb-4">Staking Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Total Staked" value={stats?.totalStaked || '0'} suffix=" GRS" />
                <StatBox label="Reward Pool" value={stats?.rewardPool || '0'} suffix=" GRS" />
                <StatBox label="Base APR" value="10%" color="emerald" />
                <StatBox label="Boosted APR" value="20%" color="pink" />
              </div>
            </div>

            {/* User Status */}
            {isConnected && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Your Position */}
                <div className="glass-panel rounded-2xl border border-white/10 p-6">
                  <h2 className="text-lg font-display font-semibold mb-4">Your Position</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-white/50">GRS Balance</span>
                      <span className="font-mono font-semibold">{balance} GRS</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-white/50">Staked Amount</span>
                      <span className="font-mono font-semibold">{stats?.userStake?.amount || '0'} GRS</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-white/50">Pending Rewards</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        {stats?.pendingRewards || '0'} GRS
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-white/50">Lock Status</span>
                      <span className={`font-semibold ${stats?.userStake?.isLocked ? 'text-amber-400' : 'text-white/70'}`}>
                        {stats?.userStake?.isLocked ? `Locked (${formatTime(stats?.remainingLockTime || 0)})` : 'Unlocked'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-white/50">Your Tier</span>
                      <span className={`font-semibold ${getTierColor(tier)}`}>{tier}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-white/50">Fee Discount</span>
                      <span className="font-semibold text-emerald-400">{discount}%</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-white/50">Airdrop Eligible</span>
                      <span className={`font-semibold ${isEligible ? 'text-emerald-400' : 'text-white/30'}`}>
                        {isEligible ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  </div>
                  
                  {Number(stats?.pendingRewards) > 0 && (
                    <button
                      onClick={handleClaim}
                      disabled={isClaiming}
                      className="w-full mt-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40
                               hover:bg-emerald-500/30 transition-all duration-300 font-semibold
                               text-emerald-400 disabled:opacity-50"
                    >
                      {isClaiming ? 'Claiming...' : `Claim ${stats?.pendingRewards} GRS Rewards`}
                    </button>
                  )}
                </div>

                {/* Staking Actions */}
                <div className="glass-panel rounded-2xl border border-white/10 p-6">
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setActiveTab('stake')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'stake'
                          ? 'bg-pink-500/30 text-pink-400 border border-pink-500/40'
                          : 'text-white/50 hover:bg-white/5'
                      }`}
                    >
                      Stake
                    </button>
                    <button
                      onClick={() => setActiveTab('withdraw')}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        activeTab === 'withdraw'
                          ? 'bg-pink-500/30 text-pink-400 border border-pink-500/40'
                          : 'text-white/50 hover:bg-white/5'
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>

                  {activeTab === 'stake' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-white/50 mb-2">Amount to Stake</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                     text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">GRS</span>
                        </div>
                        <p className="text-xs text-white/30 mt-1">Minimum: 100 GRS</p>
                      </div>

                      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                        <input
                          type="checkbox"
                          id="lock"
                          checked={lockTokens}
                          onChange={(e) => setLockTokens(e.target.checked)}
                          className="w-5 h-5 rounded border-white/30 bg-white/5 text-pink-500 focus:ring-pink-500"
                        />
                        <div className="flex-1">
                          <label htmlFor="lock" className="font-medium text-white cursor-pointer">
                            Lock for 30 days
                          </label>
                          <p className="text-xs text-white/50">
                            Get 2x rewards (20% APR) by locking your tokens
                          </p>
                        </div>
                        <span className="text-pink-400 font-semibold">2x Boost</span>
                      </div>

                      <button
                        onClick={handleStake}
                        disabled={!stakeAmount || isStaking}
                        className="w-full py-3 rounded-xl bg-pink-500 hover:bg-pink-600
                                 transition-all duration-300 font-semibold text-white
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 shadow-[0_0_20px_rgba(230,0,122,0.3)]"
                      >
                        {isStaking ? 'Staking...' : lockTokens ? 'Stake with Lock' : 'Stake GRS'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-white/50 mb-2">Amount to Withdraw</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                                     text-white placeholder-white/30 focus:outline-none focus:border-pink-500/50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">GRS</span>
                        </div>
                        <p className="text-xs text-white/30 mt-1">
                          Available: {stats?.userStake?.isLocked ? 'Locked' : (stats?.userStake?.amount || '0') + ' GRS'}
                        </p>
                      </div>

                      {stats?.userStake?.isLocked && (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm text-amber-400">
                            ⚠️ Your tokens are locked for {formatTime(stats?.remainingLockTime || 0)}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={handleWithdraw}
                        disabled={!withdrawAmount || isWithdrawing || stats?.userStake?.isLocked}
                        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20
                                 transition-all duration-300 font-semibold text-white
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 border border-white/20"
                      >
                        {isWithdrawing ? 'Withdrawing...' : 'Withdraw GRS'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fee Tiers Info */}
            <div className="glass-panel rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-display font-semibold mb-4">Fee Discount Tiers</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <TierCard
                  name="None"
                  requirement="0 GRS"
                  discount="0%"
                  benefits="Standard fees"
                  current={tier === 'None'}
                />
                <TierCard
                  name="Silver"
                  requirement="1,000 GRS"
                  discount="5%"
                  benefits="Reduced fees + Airdrop eligible"
                  current={tier === 'Silver'}
                />
                <TierCard
                  name="Gold"
                  requirement="10,000 GRS"
                  discount="10%"
                  benefits="Lower fees + Priority support"
                  current={tier === 'Gold'}
                />
                <TierCard
                  name="Platinum"
                  requirement="100,000 GRS"
                  discount="25%"
                  benefits="Maximum discount + Exclusive access"
                  current={tier === 'Platinum'}
                />
              </div>
            </div>

            {/* Transaction Status */}
            {txHash && (
              <div className="glass-panel rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/10">
                <p className="text-emerald-400 text-sm">
                  ✅ Transaction submitted!{' '}
                  <a
                    href={getTxUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-emerald-300"
                  >
                    View on Explorer ↗
                  </a>
                </p>
              </div>
            )}

            {error && (
              <div className="glass-panel rounded-xl p-4 border border-rose-500/30 bg-rose-500/10">
                <p className="text-rose-400 text-sm">❌ {error}</p>
              </div>
            )}

            {!isConnected && (
              <div className="text-center py-12">
                <p className="text-white/50 mb-4">Connect your wallet to start staking</p>
                <button
                  onClick={() => {}}
                  className="px-8 py-3 rounded-xl bg-pink-500 hover:bg-pink-600
                           transition-all duration-300 font-semibold text-white
                           shadow-[0_0_20px_rgba(230,0,122,0.3)]"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Benefit Card Component
function BenefitCard({ icon, title, description, color }: {
  icon: string;
  title: string;
  description: string;
  color: 'emerald' | 'amber' | 'pink';
}) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
    pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/20',
  };

  return (
    <div className={`glass-panel rounded-xl p-5 border bg-gradient-to-br ${colorClasses[color]}`}>
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-white/50">{description}</p>
    </div>
  );
}

// Stat Box Component
function StatBox({ label, value, suffix = '', color }: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
}) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' : color === 'pink' ? 'text-pink-400' : 'text-white';
  
  return (
    <div className="text-center p-4 rounded-xl bg-white/5">
      <p className="text-xs text-white/50 uppercase mb-1">{label}</p>
      <p className={`text-xl font-mono font-bold ${colorClass}`}>
        {value}{suffix}
      </p>
    </div>
  );
}

// Tier Card Component
function TierCard({ name, requirement, discount, benefits, current }: {
  name: string;
  requirement: string;
  discount: string;
  benefits: string;
  current: boolean;
}) {
  const tierColors: Record<string, string> = {
    'None': 'border-white/10',
    'Silver': 'border-gray-400/30 bg-gray-400/5',
    'Gold': 'border-amber-400/30 bg-amber-400/5',
    'Platinum': 'border-pink-400/30 bg-pink-400/5',
  };

  return (
    <div className={`p-4 rounded-xl border ${tierColors[name]} ${current ? 'ring-2 ring-pink-500' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{name}</span>
        {current && <span className="text-xs text-pink-400 font-medium">CURRENT</span>}
      </div>
      <p className="text-xs text-white/40 mb-2">{requirement}</p>
      <p className="text-lg font-bold text-emerald-400 mb-1">{discount}</p>
      <p className="text-xs text-white/50">{benefits}</p>
    </div>
  );
}

// Helper function
function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    'None': 'text-white/30',
    'Silver': 'text-gray-400',
    'Gold': 'text-amber-400',
    'Platinum': 'text-pink-400',
  };
  return colors[tier] || 'text-white/30';
}

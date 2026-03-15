'use client';

import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, type TransactionResponse } from 'ethers';
import { CHAIN_CONFIG } from '@/config/chain';

// GRS Staking ABI
export const GRS_STAKING_ABI = [
  'function stake(uint256 amount, bool lock) external',
  'function withdraw(uint256 amount) external',
  'function claimReward() external',
  'function pendingReward(address user) view returns (uint256)',
  'function getStakeInfo(address user) view returns (tuple(uint256 amount, uint256 rewardDebt, uint256 lastStakeTime, uint256 lockEndTime) info, uint256 apr)',
  'function getRemainingLockTime(address user) view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function rewardPool() view returns (uint256)',
  'function MIN_STAKE() view returns (uint256)',
  'event Staked(address indexed user, uint256 amount, bool locked)',
  'event Withdrawn(address indexed user, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 amount)',
] as const;

// GRS Token ABI (with staking integration)
export const GRS_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function getFeeDiscount(address account) view returns (uint256)',
  'function getTier(address account) view returns (string)',
  'function isAirdropEligible(address account) view returns (bool)',
  'function stakingContract() view returns (address)',
  'function mint(address to, uint256 amount) external',
  'function faucet() external',
] as const;

export interface StakeInfo {
  amount: string;
  rewardDebt: string;
  lastStakeTime: number;
  lockEndTime: number;
  isLocked: boolean;
  apr: number;
}

export interface StakingStats {
  totalStaked: string;
  rewardPool: string;
  userStake: StakeInfo | null;
  pendingRewards: string;
  remainingLockTime: number;
}

export function useGRSStaking(grsAddress: string, stakingAddress: string) {
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const stake = useCallback(async (
    amount: string,
    lock: boolean,
    walletAddress: string
  ): Promise<boolean> => {
    if (!window.ethereum) {
      setError('MetaMask required');
      return false;
    }

    setIsStaking(true);
    setError(null);
    setTxHash(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // First approve GRS
      const grsContract = new Contract(grsAddress, GRS_TOKEN_ABI, signer);
      const amountWei = BigInt(parseFloat(amount) * 10**18);
      
      const approveTx: TransactionResponse = await grsContract.approve(stakingAddress, amountWei);
      await approveTx.wait();
      
      // Then stake
      const stakingContract = new Contract(stakingAddress, GRS_STAKING_ABI, signer);
      const stakeTx: TransactionResponse = await stakingContract.stake(amountWei, lock);
      setTxHash(stakeTx.hash);
      
      await stakeTx.wait();
      setIsStaking(false);
      return true;
    } catch (err: any) {
      console.error('Stake error:', err);
      setError(err.message || 'Failed to stake');
      setIsStaking(false);
      return false;
    }
  }, [grsAddress, stakingAddress]);

  const withdraw = useCallback(async (
    amount: string,
    walletAddress: string
  ): Promise<boolean> => {
    if (!window.ethereum) {
      setError('MetaMask required');
      return false;
    }

    setIsWithdrawing(true);
    setError(null);
    setTxHash(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const stakingContract = new Contract(stakingAddress, GRS_STAKING_ABI, signer);
      const amountWei = BigInt(parseFloat(amount) * 10**18);
      
      const tx: TransactionResponse = await stakingContract.withdraw(amountWei);
      setTxHash(tx.hash);
      
      await tx.wait();
      setIsWithdrawing(false);
      return true;
    } catch (err: any) {
      console.error('Withdraw error:', err);
      setError(err.message || 'Failed to withdraw');
      setIsWithdrawing(false);
      return false;
    }
  }, [stakingAddress]);

  const claimRewards = useCallback(async (walletAddress: string): Promise<boolean> => {
    if (!window.ethereum) {
      setError('MetaMask required');
      return false;
    }

    setIsClaiming(true);
    setError(null);
    setTxHash(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const stakingContract = new Contract(stakingAddress, GRS_STAKING_ABI, signer);
      const tx: TransactionResponse = await stakingContract.claimReward();
      setTxHash(tx.hash);
      
      await tx.wait();
      setIsClaiming(false);
      return true;
    } catch (err: any) {
      console.error('Claim error:', err);
      setError(err.message || 'Failed to claim rewards');
      setIsClaiming(false);
      return false;
    }
  }, [stakingAddress]);

  const getStakeInfo = useCallback(async (walletAddress: string): Promise<StakingStats | null> => {
    if (!window.ethereum || !walletAddress) return null;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const stakingContract = new Contract(stakingAddress, GRS_STAKING_ABI, provider);
      
      const [info, apr] = await stakingContract.getStakeInfo(walletAddress);
      const pending = await stakingContract.pendingReward(walletAddress);
      const lockTime = await stakingContract.getRemainingLockTime(walletAddress);
      const total = await stakingContract.totalStaked();
      const rewards = await stakingContract.rewardPool();
      
      return {
        totalStaked: (Number(total) / 10**18).toLocaleString(),
        rewardPool: (Number(rewards) / 10**18).toLocaleString(),
        userStake: {
          amount: (Number(info.amount) / 10**18).toLocaleString(),
          rewardDebt: (Number(info.rewardDebt) / 10**18).toLocaleString(),
          lastStakeTime: Number(info.lastStakeTime) * 1000,
          lockEndTime: Number(info.lockEndTime) * 1000,
          isLocked: Number(info.lockEndTime) > Date.now() / 1000,
          apr: Number(apr),
        },
        pendingRewards: (Number(pending) / 10**18).toLocaleString(),
        remainingLockTime: Number(lockTime),
      };
    } catch (err) {
      console.error('Get stake info error:', err);
      return null;
    }
  }, [stakingAddress]);

  return {
    stake,
    withdraw,
    claimRewards,
    getStakeInfo,
    isStaking,
    isWithdrawing,
    isClaiming,
    error,
    txHash,
  };
}

// Hook for GRS token info
export function useGRSToken(grsAddress: string) {
  const [balance, setBalance] = useState<string>('0');
  const [tier, setTier] = useState<string>('None');
  const [discount, setDiscount] = useState<number>(0);
  const [isEligible, setIsEligible] = useState<boolean>(false);

  const fetchGRSInfo = useCallback(async (walletAddress: string) => {
    if (!window.ethereum || !walletAddress || !grsAddress) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const grsContract = new Contract(grsAddress, GRS_TOKEN_ABI, provider);
      
      const [bal, tierName, disc, eligible] = await Promise.all([
        grsContract.balanceOf(walletAddress),
        grsContract.getTier(walletAddress),
        grsContract.getFeeDiscount(walletAddress),
        grsContract.isAirdropEligible(walletAddress),
      ]);
      
      setBalance((Number(bal) / 10**18).toLocaleString());
      setTier(tierName);
      setDiscount(Number(disc));
      setIsEligible(eligible);
    } catch (err) {
      console.error('GRS info error:', err);
    }
  }, [grsAddress]);

  return { balance, tier, discount, isEligible, fetchGRSInfo };
}

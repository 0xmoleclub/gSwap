'use client';

import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, type TransactionResponse } from 'ethers';
import { ERC20_ABI } from '@/config/abis';
import { CHAIN_CONFIG } from '@/config/chain';
import type { TokenConfig } from '@/config/tokens';

export interface FaucetState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
  txHash: string | null;
}

export interface TokenFaucetState extends FaucetState {
  lastClaimed: number | null; // timestamp
}

export function useFaucet() {
  const [states, setStates] = useState<Record<string, TokenFaucetState>>({});

  const getState = (tokenAddress: string): TokenFaucetState => {
    return states[tokenAddress] || {
      isLoading: false,
      isSuccess: false,
      error: null,
      txHash: null,
      lastClaimed: null,
    };
  };

  const updateState = (tokenAddress: string, updates: Partial<TokenFaucetState>) => {
    setStates(prev => ({
      ...prev,
      [tokenAddress]: { ...getState(tokenAddress), ...updates },
    }));
  };

  const claimTokens = useCallback(async (
    token: TokenConfig,
    walletAddress: string | null
  ): Promise<boolean> => {
    if (!walletAddress) {
      updateState(token.address, { error: 'Please connect your wallet first' });
      return false;
    }

    // Check if wallet is on the correct chain
    if (!window.ethereum) {
      updateState(token.address, { error: 'MetaMask or compatible wallet required' });
      return false;
    }

    try {
      updateState(token.address, { 
        isLoading: true, 
        isSuccess: false, 
        error: null,
        txHash: null,
      });

      const provider = new BrowserProvider(window.ethereum);
      
      // Check current chain
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(CHAIN_CONFIG.chainId)) {
        // Try to switch chain
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_CONFIG.chainId }],
          });
        } catch (switchError: any) {
          // Chain not added, try to add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [CHAIN_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

      const signer = await provider.getSigner();
      const contract = new Contract(token.address, ERC20_ABI, signer);

      // Call the faucet function
      const tx: TransactionResponse = await contract.faucet();
      
      updateState(token.address, { txHash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt && receipt.status === 1) {
        updateState(token.address, { 
          isLoading: false, 
          isSuccess: true,
          lastClaimed: Date.now(),
        });
        return true;
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err: any) {
      console.error('Faucet error:', err);
      updateState(token.address, { 
        isLoading: false, 
        error: err.message || 'Failed to claim tokens',
      });
      return false;
    }
  }, []);

  const resetState = useCallback((tokenAddress: string) => {
    updateState(tokenAddress, {
      isLoading: false,
      isSuccess: false,
      error: null,
      txHash: null,
    });
  }, []);

  return {
    getState,
    claimTokens,
    resetState,
  };
}

// Hook for getting token balance
export function useTokenBalance() {
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const fetchBalance = useCallback(async (
    token: TokenConfig,
    walletAddress: string | null
  ): Promise<string | null> => {
    if (!walletAddress || !window.ethereum) return null;

    setLoading(prev => ({ ...prev, [token.address]: true }));

    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(token.address, ERC20_ABI, provider);
      
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      
      // Format balance
      const formatted = (Number(balance) / 10 ** Number(decimals)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });

      setBalances(prev => ({ ...prev, [token.address]: formatted }));
      setLoading(prev => ({ ...prev, [token.address]: false }));
      
      return formatted;
    } catch (err) {
      console.error('Balance fetch error:', err);
      setLoading(prev => ({ ...prev, [token.address]: false }));
      return null;
    }
  }, []);

  const fetchAllBalances = useCallback(async (
    tokens: TokenConfig[],
    walletAddress: string | null
  ) => {
    if (!walletAddress) return;
    
    for (const token of tokens) {
      await fetchBalance(token, walletAddress);
    }
  }, [fetchBalance]);

  return {
    balances,
    loading,
    fetchBalance,
    fetchAllBalances,
  };
}

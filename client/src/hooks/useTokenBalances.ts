'use client';

import { useState, useEffect, useCallback } from 'react';
import { Contract, BrowserProvider } from 'ethers';
import { ERC20_ABI } from '@/config/abis';

const POLL_INTERVAL = 15_000;

export function useTokenBalances(
  tokenAddresses: string[],
  walletAddress: string | null,
  provider: BrowserProvider | null,
) {
  const [balances, setBalances] = useState<Map<string, bigint>>(new Map());

  const fetchBalances = useCallback(async () => {
    if (!provider || !walletAddress || tokenAddresses.length === 0) {
      setBalances(new Map());
      return;
    }
    const results = await Promise.allSettled(
      tokenAddresses.map(async (addr) => {
        const token = new Contract(addr, ERC20_ABI, provider);
        const bal: bigint = await token.balanceOf(walletAddress);
        return [addr.toLowerCase(), bal] as const;
      }),
    );
    const map = new Map<string, bigint>();
    for (const r of results) {
      if (r.status === 'fulfilled') {
        map.set(r.value[0], r.value[1]);
      }
    }
    setBalances(map);
  }, [tokenAddresses.join(','), walletAddress, provider]);

  useEffect(() => {
    fetchBalances();
    const id = setInterval(fetchBalances, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchBalances]);

  return { balances, refetch: fetchBalances };
}

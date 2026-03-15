'use client';

import { useState, useEffect, useCallback } from 'react';
import { Contract, BrowserProvider, ZeroAddress } from 'ethers';
import { FACTORY_ABI, POOL_ABI } from '@/config/abis';
import { FACTORY_ADDRESS } from '@/config/chain';
import { sortTokens } from '@/lib/format';

export interface PoolData {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  fee: number;
  totalSupply: bigint;
}

const POLL_INTERVAL = 10_000;

export function usePool(
  tokenA: string | null,
  tokenB: string | null,
  provider: BrowserProvider | null,
) {
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPool = useCallback(async () => {
    if (!provider || !tokenA || !tokenB) {
      setPool(null);
      return;
    }
    setLoading(true);
    try {
      const [sorted0, sorted1] = sortTokens(tokenA, tokenB);
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      const poolAddr: string = await factory.getPool(sorted0, sorted1);

      if (!poolAddr || poolAddr === ZeroAddress) {
        setPool(null);
        return;
      }

      const poolContract = new Contract(poolAddr, POOL_ABI, provider);
      const [reserves, fee, totalSupply] = await Promise.all([
        poolContract.getReserves() as Promise<[bigint, bigint, bigint]>,
        poolContract.swapFee() as Promise<bigint>,
        poolContract.totalSupply() as Promise<bigint>,
      ]);

      setPool({
        poolAddress: poolAddr,
        token0: sorted0,
        token1: sorted1,
        reserve0: reserves[0],
        reserve1: reserves[1],
        fee: Number(fee),
        totalSupply,
      });
    } catch (err) {
      console.error('[usePool]', err);
      setPool(null);
    } finally {
      setLoading(false);
    }
  }, [tokenA, tokenB, provider]);

  useEffect(() => {
    fetchPool();
    const id = setInterval(fetchPool, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchPool]);

  return { pool, loading, refetch: fetchPool };
}

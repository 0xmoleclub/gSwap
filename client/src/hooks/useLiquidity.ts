'use client';

import { useState, useCallback } from 'react';
import { Contract, JsonRpcSigner, ZeroAddress } from 'ethers';
import { ERC20_ABI, POOL_ABI, FACTORY_ABI } from '@/config/abis';
import { FACTORY_ADDRESS } from '@/config/chain';
import { sortTokens } from '@/lib/format';

export type LiquidityStatus = 'idle' | 'approving' | 'adding' | 'removing' | 'creating' | 'success' | 'error';

export function useLiquidity() {
  const [status, setStatus] = useState<LiquidityStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, []);

  const addLiquidity = useCallback(async (
    signer: JsonRpcSigner,
    poolAddress: string,
    tokenA: string,
    tokenB: string,
    amountA: bigint,
    amountB: bigint,
  ) => {
    setError(null);
    setTxHash(null);
    const userAddr = await signer.getAddress();

    try {
      // Sort tokens to match pool ordering
      const [sorted0, sorted1] = sortTokens(tokenA, tokenB);
      const [amount0, amount1] =
        sorted0.toLowerCase() === tokenA.toLowerCase()
          ? [amountA, amountB]
          : [amountB, amountA];

      // Approve both tokens
      setStatus('approving');
      const token0 = new Contract(sorted0, ERC20_ABI, signer);
      const token1 = new Contract(sorted1, ERC20_ABI, signer);

      const [allowance0, allowance1] = await Promise.all([
        token0.allowance(userAddr, poolAddress) as Promise<bigint>,
        token1.allowance(userAddr, poolAddress) as Promise<bigint>,
      ]);

      const approvals: Promise<unknown>[] = [];
      if (allowance0 < amount0) approvals.push(token0.approve(poolAddress, amount0).then((tx: { wait: () => Promise<unknown> }) => tx.wait()));
      if (allowance1 < amount1) approvals.push(token1.approve(poolAddress, amount1).then((tx: { wait: () => Promise<unknown> }) => tx.wait()));
      if (approvals.length > 0) await Promise.all(approvals);

      // Add liquidity
      setStatus('adding');
      const pool = new Contract(poolAddress, POOL_ABI, signer);
      const tx = await pool.addLiquidity(amount0, amount1);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus('success');
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Add liquidity failed';
      setError(msg.length > 200 ? msg.slice(0, 200) + '...' : msg);
      setStatus('error');
    }
  }, []);

  const removeLiquidity = useCallback(async (
    signer: JsonRpcSigner,
    poolAddress: string,
    lpAmount: bigint,
  ) => {
    setError(null);
    setTxHash(null);
    try {
      setStatus('removing');
      const pool = new Contract(poolAddress, POOL_ABI, signer);
      const tx = await pool.removeLiquidity(lpAmount);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus('success');
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Remove liquidity failed';
      setError(msg.length > 200 ? msg.slice(0, 200) + '...' : msg);
      setStatus('error');
    }
  }, []);

  const createPool = useCallback(async (
    signer: JsonRpcSigner,
    tokenA: string,
    tokenB: string,
  ): Promise<string | null> => {
    setError(null);
    setTxHash(null);
    try {
      setStatus('creating');
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      // Check if pool already exists
      const [sorted0, sorted1] = sortTokens(tokenA, tokenB);
      const existing: string = await factory.getPool(sorted0, sorted1);
      if (existing && existing !== ZeroAddress) {
        setStatus('idle');
        return existing;
      }

      const tx = await factory.createPool(sorted0, sorted1);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);

      // Read the pool address from event
      const poolAddr: string = await factory.getPool(sorted0, sorted1);
      setStatus('success');
      return poolAddr;
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Create pool failed';
      setError(msg.length > 200 ? msg.slice(0, 200) + '...' : msg);
      setStatus('error');
      return null;
    }
  }, []);

  return { status, txHash, error, addLiquidity, removeLiquidity, createPool, reset };
}

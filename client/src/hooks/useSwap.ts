'use client';

import { useState, useCallback } from 'react';
import { Contract, JsonRpcSigner } from 'ethers';
import { ERC20_ABI, POOL_ABI } from '@/config/abis';

export type SwapStatus = 'idle' | 'approving' | 'swapping' | 'success' | 'error';

interface SwapParams {
  signer: JsonRpcSigner;
  poolAddress: string;
  tokenIn: string;
  amountIn: bigint;
  minAmountOut: bigint;
}

export function useSwap() {
  const [status, setStatus] = useState<SwapStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, []);

  const executeSwap = useCallback(async (params: SwapParams) => {
    const { signer, poolAddress, tokenIn, amountIn, minAmountOut } = params;
    setError(null);
    setTxHash(null);

    try {
      // Check allowance → approve if needed
      const token = new Contract(tokenIn, ERC20_ABI, signer);
      const currentAllowance: bigint = await token.allowance(
        await signer.getAddress(),
        poolAddress,
      );

      if (currentAllowance < amountIn) {
        setStatus('approving');
        const approveTx = await token.approve(poolAddress, amountIn);
        await approveTx.wait();
      }

      // Execute swap
      setStatus('swapping');
      const pool = new Contract(poolAddress, POOL_ABI, signer);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 min
      const tx = await pool.swap(tokenIn, amountIn, minAmountOut, deadline);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatus('success');
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Swap failed';
      // Extract revert reason if available
      const short = msg.length > 200 ? msg.slice(0, 200) + '...' : msg;
      setError(short);
      setStatus('error');
    }
  }, []);

  return { status, txHash, error, executeSwap, reset };
}

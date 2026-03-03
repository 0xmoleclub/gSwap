/** Format a bigint token amount to a human-readable string. */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (amount === 0n) return '0';
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  if (remainder === 0n) return whole.toString();
  const fracStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
  // Show at most 6 decimal places
  const trimmed = fracStr.slice(0, 6);
  return `${whole}.${trimmed}`;
}

/** Parse a user-entered amount string to bigint. */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!amount || amount === '0') return 0n;
  const [whole = '0', frac = ''] = amount.split('.');
  const paddedFrac = frac.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFrac);
}

/** Shorten an address to 0x1234...abcd format. */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Sort two token addresses for consistent on-chain ordering. */
export function sortTokens(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

/** Client-side constant-product getAmountOut (matches gPool.sol). */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number = 30,
): bigint {
  if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
  const amountInWithFee = amountIn * BigInt(10000 - feeBps);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10000n + amountInWithFee;
  return numerator / denominator;
}

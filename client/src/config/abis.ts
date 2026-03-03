export const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function faucet() external',
] as const;

export const POOL_ABI = [
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint256, uint256, uint32)',
  'function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) view returns (uint256)',
  'function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut, uint256 deadline) returns (uint256 amountOut)',
  'function addLiquidity(uint256 amount0, uint256 amount1) returns (uint256 lpTokens)',
  'function removeLiquidity(uint256 lpTokens) returns (uint256 amount0, uint256 amount1)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function swapFee() view returns (uint16)',
  'event Swap(address indexed sender, uint256 amountIn, uint256 amountOut, address indexed tokenIn, address indexed tokenOut)',
  'event Mint(address indexed sender, uint256 amount0, uint256 amount1, uint256 lpTokens)',
  'event Burn(address indexed sender, uint256 amount0, uint256 amount1, uint256 lpTokens)',
] as const;

export const FACTORY_ABI = [
  'function getPool(address token0, address token1) view returns (address)',
  'function createPool(address token0, address token1) returns (address pool)',
  'function getAllPools() view returns (address[])',
  'function poolCount() view returns (uint256)',
  'event PoolCreated(address indexed pool, address indexed token0, address indexed token1, uint256 poolIndex)',
] as const;

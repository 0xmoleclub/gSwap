export const gPoolAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "sender", "type": "address" },
      { "indexed": false, "name": "amountIn", "type": "uint256" },
      { "indexed": false, "name": "amountOut", "type": "uint256" },
      { "indexed": true, "name": "tokenIn", "type": "address" },
      { "indexed": true, "name": "tokenOut", "type": "address" }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "sender", "type": "address" },
      { "indexed": false, "name": "amount0", "type": "uint256" },
      { "indexed": false, "name": "amount1", "type": "uint256" },
      { "indexed": false, "name": "lpTokens", "type": "uint256" }
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "sender", "type": "address" },
      { "indexed": false, "name": "amount0", "type": "uint256" },
      { "indexed": false, "name": "amount1", "type": "uint256" },
      { "indexed": false, "name": "lpTokens", "type": "uint256" }
    ],
    "name": "Burn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "name": "reserve0", "type": "uint256" },
      { "indexed": false, "name": "reserve1", "type": "uint256" }
    ],
    "name": "Sync",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      { "name": "", "type": "uint256" },
      { "name": "", "type": "uint256" },
      { "name": "", "type": "uint32" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

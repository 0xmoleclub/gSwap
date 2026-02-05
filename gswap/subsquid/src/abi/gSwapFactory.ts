export const gSwapFactoryAbi = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "pool", "type": "address" },
      { "indexed": true, "name": "token0", "type": "address" },
      { "indexed": true, "name": "token1", "type": "address" },
      { "indexed": false, "name": "poolIndex", "type": "uint256" }
    ],
    "name": "PoolCreated",
    "type": "event"
  }
] as const;

export const gSwapFactoryAddress = process.env.FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000';

export const CHAIN_ID = 420420417;

export const CHAIN_CONFIG = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: 'Polkadot Hub EVM (Passet Hub Testnet)',
  nativeCurrency: {
    name: 'WND',
    symbol: 'WND',
    decimals: 18,
  },
  rpcUrls: ['https://services.polkadothub-rpc.com/testnet'],
  blockExplorerUrls: ['https://blockscout-passet-hub.parity-testchain.parity.io'],
};

export const FACTORY_ADDRESS = '0x02065b6786f0198686d31b646e75330e9829750c';

export const BLOCK_EXPLORER_URL = CHAIN_CONFIG.blockExplorerUrls[0];

export function getTxUrl(hash: string): string {
  return `${BLOCK_EXPLORER_URL}/tx/${hash}`;
}

export function getAddressUrl(address: string): string {
  return `${BLOCK_EXPLORER_URL}/address/${address}`;
}

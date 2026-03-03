'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { BrowserProvider, JsonRpcSigner, Eip1193Provider } from 'ethers';
import { CHAIN_ID, CHAIN_CONFIG } from '@/config/chain';
import { WalletSelectModal } from '@/components/WalletSelectModal';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface EthereumProvider extends Eip1193Provider {
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
}

// EIP-6963 types — exported for WalletSelectModal
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EthereumProvider;
}

interface EIP6963AnnounceProviderEvent extends Event {
  detail: EIP6963ProviderDetail;
}

interface WalletState {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  isCorrectChain: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = 'gswap-wallet-connected';
const WALLET_RDNS_KEY = 'gswap-wallet-rdns';

function getEthereum(): EthereumProvider | undefined {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return (window as any).ethereum as EthereumProvider;
  }
  return undefined;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    provider: null,
    signer: null,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  // Modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [discoveredWallets, setDiscoveredWallets] = useState<EIP6963ProviderDetail[]>([]);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Track the active provider (the one we connected with)
  const activeProviderRef = useRef<EthereumProvider | undefined>(undefined);

  const isCorrectChain = state.chainId === CHAIN_ID;

  const setupProvider = useCallback(async (ethereum: EthereumProvider) => {
    const provider = new BrowserProvider(ethereum);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setState({
      provider,
      signer,
      address,
      chainId,
      isConnecting: false,
      error: null,
    });
  }, []);

  const switchChainOnProvider = useCallback(async (ethereum: EthereumProvider) => {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_CONFIG.chainId }],
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CHAIN_CONFIG],
        });
      } else {
        throw err;
      }
    }
  }, []);

  const switchChain = useCallback(async () => {
    const ethereum = activeProviderRef.current || getEthereum();
    if (!ethereum) return;
    await switchChainOnProvider(ethereum);
  }, [switchChainOnProvider]);

  // Connect via a specific EIP-6963 wallet
  const connectWithProvider = useCallback(async (detail: EIP6963ProviderDetail) => {
    setConnectingWalletId(detail.info.rdns);
    setModalError(null);
    try {
      await detail.provider.request({ method: 'eth_requestAccounts' });
      try {
        await switchChainOnProvider(detail.provider);
      } catch {
        // User may reject chain switch — still connect
      }
      activeProviderRef.current = detail.provider;
      await setupProvider(detail.provider);
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(WALLET_RDNS_KEY, detail.info.rdns);
      setIsConnectModalOpen(false);
      setConnectingWalletId(null);
      setModalError(null);
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Connection failed';
      setModalError(msg);
      setConnectingWalletId(null);
    }
  }, [setupProvider, switchChainOnProvider]);

  // connect() now opens the modal
  const connect = useCallback(async () => {
    setModalError(null);
    setIsConnectModalOpen(true);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(WALLET_RDNS_KEY);
    activeProviderRef.current = undefined;
    setState({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  // EIP-6963 wallet discovery
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wallets = new Map<string, EIP6963ProviderDetail>();

    const handleAnnounce = (event: Event) => {
      const e = event as EIP6963AnnounceProviderEvent;
      if (e.detail?.info?.rdns) {
        wallets.set(e.detail.info.rdns, e.detail);
        setDiscoveredWallets(Array.from(wallets.values()));
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
    };
  }, []);

  // Legacy fallback: if no EIP-6963 wallets discovered but window.ethereum exists
  useEffect(() => {
    if (discoveredWallets.length > 0) return;
    const ethereum = getEthereum();
    if (!ethereum) return;

    // Wait a brief moment for EIP-6963 announcements to arrive
    const timeout = setTimeout(() => {
      setDiscoveredWallets((current) => {
        if (current.length > 0) return current;
        return [{
          info: {
            uuid: 'legacy-injected',
            name: 'Browser Wallet',
            icon: '',
            rdns: 'legacy.injected',
          },
          provider: ethereum,
        }];
      });
    }, 200);

    return () => clearTimeout(timeout);
  }, [discoveredWallets.length]);

  // Silent reconnect on mount — prefer stored wallet rdns
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) return;

    const storedRdns = localStorage.getItem(WALLET_RDNS_KEY);

    const tryReconnect = () => {
      // Try to find the stored wallet from discovered wallets
      if (storedRdns && discoveredWallets.length > 0) {
        const stored = discoveredWallets.find((w) => w.info.rdns === storedRdns);
        if (stored) {
          activeProviderRef.current = stored.provider;
          setupProvider(stored.provider).catch(() => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(WALLET_RDNS_KEY);
          });
          return;
        }
      }

      // Fallback to window.ethereum
      const ethereum = getEthereum();
      if (!ethereum) return;
      activeProviderRef.current = ethereum;
      setupProvider(ethereum).catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(WALLET_RDNS_KEY);
      });
    };

    // Delay to allow EIP-6963 wallets to announce
    const timeout = setTimeout(tryReconnect, 300);
    return () => clearTimeout(timeout);
  }, [setupProvider, discoveredWallets]);

  // Listen to wallet events on the active provider
  useEffect(() => {
    const ethereum = activeProviderRef.current || getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (state.address) {
        setupProvider(ethereum).catch(console.error);
      }
    };

    const handleChainChanged = () => {
      if (state.address) {
        setupProvider(ethereum).catch(console.error);
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [state.address, setupProvider, disconnect]);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, switchChain, isCorrectChain }}
    >
      {children}
      {isConnectModalOpen && (
        <WalletSelectModal
          discoveredWallets={discoveredWallets}
          connectingWalletId={connectingWalletId}
          error={modalError}
          onSelect={connectWithProvider}
          onClose={() => {
            setIsConnectModalOpen(false);
            setConnectingWalletId(null);
            setModalError(null);
          }}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

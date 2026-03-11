'use client';

import { defaultWalletChain, okxConnectNamespaces } from '@/lib/wallet/chains';
import {
  type OkxInjectedProvider,
  type OkxWalletSnapshot,
  type WalletConnectorType,
  buildSnapshotFromSession,
  getOkxExtensionProvider,
  getWalletChainName,
  getWalletErrorMessage,
  getWalletLabel,
  parseWalletChainId,
} from '@/lib/wallet/okx-wallet';
import {
  type TransactionParams,
  type TypedDataParams,
  type WalletActionDeps,
  walletSendTransaction,
  walletSignMessage,
  walletSignTypedData,
  walletSwitchChain,
} from '@/lib/wallet/okx-wallet-actions';
import type { ActionConfiguration, OKXUniversalConnectUI, SessionTypes } from '@okxconnect/ui';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type { TransactionParams, TypedDataParams } from '@/lib/wallet/okx-wallet-actions';

interface OkxWalletContextValue {
  address: string | null;
  chainId: number | null;
  chainName: string | null;
  connectorType: WalletConnectorType | null;
  walletLabel: string | null;
  extensionAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isRestoring: boolean;
  pendingConnector: WalletConnectorType | null;
  connectApp: () => Promise<void>;
  connectExtension: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendTransaction: (params: TransactionParams) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signTypedData: (typedData: TypedDataParams, chainId?: number) => Promise<string>;
  switchChain: (chainId: number) => Promise<void>;
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  connectorType: WalletConnectorType | null;
  pendingConnector: WalletConnectorType | null;
  extensionAvailable: boolean;
  isRestoring: boolean;
}

const INITIAL_STATE: WalletState = {
  address: null,
  chainId: null,
  connectorType: null,
  pendingConnector: null,
  extensionAvailable: false,
  isRestoring: true,
};

const REQUEST_ACTIONS: ActionConfiguration = {
  modals: 'all',
};

const OkxWalletContext = createContext<OkxWalletContextValue | null>(null);

export function OkxWalletProvider({ children }: { children: React.ReactNode }) {
  const [walletState, setWalletState] = useState<WalletState>(INITIAL_STATE);
  const universalUiRef = useRef<OKXUniversalConnectUI | null>(null);
  const universalUiPromiseRef = useRef<Promise<OKXUniversalConnectUI> | null>(null);
  const activeConnectorRef = useRef<WalletConnectorType | null>(null);

  const applySnapshot = useCallback(
    (snapshot: OkxWalletSnapshot | null, options?: { finishRestore?: boolean }) => {
      activeConnectorRef.current = snapshot?.connectorType ?? null;

      setWalletState((current) => ({
        ...current,
        address: snapshot?.address ?? null,
        chainId: snapshot?.chainId ?? null,
        connectorType: snapshot?.connectorType ?? null,
        pendingConnector: null,
        isRestoring: options?.finishRestore ? false : current.isRestoring,
      }));
    },
    []
  );

  const finishRestore = useCallback((extensionAvailable: boolean) => {
    setWalletState((current) => ({
      ...current,
      extensionAvailable,
      isRestoring: false,
    }));
  }, []);

  const getUniversalUi = useCallback(async (): Promise<OKXUniversalConnectUI> => {
    if (universalUiRef.current) {
      return universalUiRef.current;
    }

    if (!universalUiPromiseRef.current) {
      universalUiPromiseRef.current = import('@okxconnect/ui').then(
        async ({ OKXUniversalConnectUI, THEME }) => {
          const initOptions = {
            dappMetaData: {
              name: 'OKX OnchainOS Credit',
              icon: `${window.location.origin}/favicon.ico`,
            },
            actionsConfiguration: REQUEST_ACTIONS,
            language: 'en_US',
            restoreConnection: true,
            uiPreferences: {
              theme: THEME.DARK,
            },
          } as Parameters<typeof OKXUniversalConnectUI.init>[0];
          const ui = await OKXUniversalConnectUI.init(initOptions);

          universalUiRef.current = ui;
          return ui;
        }
      );
    }

    return universalUiPromiseRef.current;
  }, []);

  const readExtensionSnapshot = useCallback(
    async (provider: OkxInjectedProvider | null): Promise<OkxWalletSnapshot | null> => {
      if (!provider) {
        return null;
      }

      const accounts = await provider.request<string[]>({
        method: 'eth_accounts',
      });
      const address = accounts[0];

      if (!address) {
        return null;
      }

      const chainIdValue = await provider.request<string>({
        method: 'eth_chainId',
      });

      return {
        address,
        chainId: parseWalletChainId(chainIdValue) ?? defaultWalletChain.id,
        connectorType: 'extension',
      };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const extensionProvider = getOkxExtensionProvider();
    let removeAppListeners = () => {};

    setWalletState((current) => ({
      ...current,
      extensionAvailable: Boolean(extensionProvider),
    }));

    function handleExtensionAccountsChanged(nextAccounts?: unknown) {
      if (activeConnectorRef.current && activeConnectorRef.current !== 'extension') {
        return;
      }

      const address = Array.isArray(nextAccounts) ? nextAccounts[0] : null;
      if (typeof address !== 'string' || address.length === 0) {
        applySnapshot(null);
        return;
      }

      setWalletState((current) => ({
        ...current,
        address,
        connectorType: 'extension',
        pendingConnector: null,
      }));
      activeConnectorRef.current = 'extension';
    }

    function handleExtensionChainChanged(nextChainId?: unknown) {
      if (activeConnectorRef.current !== 'extension') {
        return;
      }

      const chainId = parseWalletChainId(nextChainId);
      if (chainId === null) {
        return;
      }

      setWalletState((current) => ({
        ...current,
        chainId,
      }));
    }

    function handleExtensionDisconnect() {
      if (activeConnectorRef.current === 'extension') {
        applySnapshot(null);
      }
    }

    extensionProvider?.on?.('accountsChanged', handleExtensionAccountsChanged);
    extensionProvider?.on?.('chainChanged', handleExtensionChainChanged);
    extensionProvider?.on?.('disconnect', handleExtensionDisconnect);

    void (async () => {
      try {
        const ui = await getUniversalUi();
        if (cancelled) {
          return;
        }

        const handleAppSessionChange = (session?: SessionTypes.Struct) => {
          if (activeConnectorRef.current && activeConnectorRef.current !== 'app') {
            return;
          }

          applySnapshot(buildSnapshotFromSession(session), {
            finishRestore: false,
          });
        };

        const handleAppSessionDelete = () => {
          if (activeConnectorRef.current === 'app') {
            applySnapshot(null);
          }
        };

        ui.on('session_update', handleAppSessionChange);
        ui.on('accountChanged', handleAppSessionChange);
        ui.on('session_delete', handleAppSessionDelete);
        removeAppListeners = () => {
          ui.off('session_update', handleAppSessionChange);
          ui.off('accountChanged', handleAppSessionChange);
          ui.off('session_delete', handleAppSessionDelete);
        };

        const appSnapshot =
          ui.connected() && ui.session ? buildSnapshotFromSession(ui.session, 'app') : null;

        if (appSnapshot) {
          applySnapshot(appSnapshot, { finishRestore: true });
          return;
        }

        const extensionSnapshot = await readExtensionSnapshot(extensionProvider);
        if (cancelled) {
          return;
        }

        if (extensionSnapshot) {
          applySnapshot(extensionSnapshot, { finishRestore: true });
          return;
        }

        finishRestore(Boolean(extensionProvider));
      } catch {
        if (!cancelled) {
          finishRestore(Boolean(extensionProvider));
        }
      }
    })();

    return () => {
      cancelled = true;
      removeAppListeners();
      extensionProvider?.removeListener?.('accountsChanged', handleExtensionAccountsChanged);
      extensionProvider?.removeListener?.('chainChanged', handleExtensionChainChanged);
      extensionProvider?.removeListener?.('disconnect', handleExtensionDisconnect);
    };
  }, [applySnapshot, finishRestore, getUniversalUi, readExtensionSnapshot]);

  async function connectExtension() {
    const provider = getOkxExtensionProvider();
    if (!provider) {
      throw new Error('OKX Wallet extension is not available in this browser.');
    }

    setWalletState((current) => ({
      ...current,
      extensionAvailable: true,
      pendingConnector: 'extension',
    }));

    try {
      const ui = await getUniversalUi();
      if (ui.connected()) {
        await ui.disconnect();
      }

      const accounts = await provider.request<string[]>({
        method: 'eth_requestAccounts',
      });
      const address = accounts[0];

      if (!address) {
        throw new Error('OKX Wallet did not return an address.');
      }

      const chainIdValue = await provider.request<string>({
        method: 'eth_chainId',
      });

      applySnapshot({
        address,
        chainId: parseWalletChainId(chainIdValue) ?? defaultWalletChain.id,
        connectorType: 'extension',
      });
    } catch (error) {
      setWalletState((current) => ({
        ...current,
        pendingConnector: null,
      }));
      throw new Error(getWalletErrorMessage(error, 'Unable to connect OKX Extension.'));
    }
  }

  async function connectApp() {
    setWalletState((current) => ({
      ...current,
      pendingConnector: 'app',
    }));

    try {
      const ui = await getUniversalUi();
      const session =
        ui.connected() && ui.session
          ? ui.session
          : await ui.openModal({ namespaces: okxConnectNamespaces });
      const snapshot = buildSnapshotFromSession(session, 'app');

      if (!snapshot) {
        throw new Error('OKX App did not return an EVM wallet address.');
      }

      applySnapshot(snapshot);
    } catch (error) {
      setWalletState((current) => ({
        ...current,
        pendingConnector: null,
      }));
      throw new Error(getWalletErrorMessage(error, 'Unable to connect OKX App.'));
    }
  }

  async function disconnect() {
    try {
      const ui = await getUniversalUi();
      if (ui.connected()) {
        await ui.disconnect();
      }
    } catch {
      // Clear local state even if the SDK disconnect call fails.
    } finally {
      applySnapshot(null);
    }
  }

  const actionDeps: WalletActionDeps = useMemo(
    () => ({
      address: walletState.address,
      chainId: walletState.chainId,
      connectorType: walletState.connectorType,
      getUniversalUi,
      requestActions: REQUEST_ACTIONS,
    }),
    [walletState.address, walletState.chainId, walletState.connectorType, getUniversalUi]
  );

  const switchChain = useCallback(
    (targetChainId: number) => walletSwitchChain(actionDeps, targetChainId),
    [actionDeps]
  );

  const sendTransaction = useCallback(
    (params: TransactionParams) => walletSendTransaction(actionDeps, params),
    [actionDeps]
  );

  const signMessage = useCallback(
    (message: string) => walletSignMessage(actionDeps, message),
    [actionDeps]
  );

  const signTypedData = useCallback(
    (typedData: TypedDataParams, chainId?: number) =>
      walletSignTypedData(actionDeps, typedData, chainId),
    [actionDeps]
  );

  return (
    <OkxWalletContext.Provider
      value={{
        address: walletState.address,
        chainId: walletState.chainId,
        chainName: getWalletChainName(walletState.chainId),
        connectorType: walletState.connectorType,
        walletLabel: getWalletLabel(walletState.connectorType),
        extensionAvailable: walletState.extensionAvailable,
        isConnected: walletState.address !== null,
        isConnecting: walletState.pendingConnector !== null,
        isRestoring: walletState.isRestoring,
        pendingConnector: walletState.pendingConnector,
        connectApp,
        connectExtension,
        disconnect,
        sendTransaction,
        signMessage,
        signTypedData,
        switchChain,
      }}
    >
      {children}
    </OkxWalletContext.Provider>
  );
}

export function useOkxWallet() {
  const context = useContext(OkxWalletContext);

  if (!context) {
    throw new Error('useOkxWallet must be used within an OkxWalletProvider.');
  }

  return context;
}

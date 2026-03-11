import { defaultWalletChain, toCaipChainId } from '@/lib/wallet/chains';
import {
  type WalletConnectorType,
  buildPersonalSignParams,
  getOkxExtensionProvider,
  getWalletErrorMessage,
} from '@/lib/wallet/okx-wallet';
import type { ActionConfiguration, OKXUniversalConnectUI } from '@okxconnect/ui';

export interface TransactionParams {
  to: string;
  data: string;
  value?: string;
  chainId?: number;
}

export interface WalletActionDeps {
  address: string | null;
  chainId: number | null;
  connectorType: WalletConnectorType | null;
  getUniversalUi: () => Promise<OKXUniversalConnectUI>;
  requestActions: ActionConfiguration;
}

export async function walletSwitchChain(
  deps: WalletActionDeps,
  targetChainId: number
): Promise<void> {
  if (deps.chainId === targetChainId) {
    return;
  }

  const hexChainId = `0x${targetChainId.toString(16)}`;

  if (deps.connectorType === 'extension') {
    const provider = getOkxExtensionProvider();
    if (!provider) {
      throw new Error('OKX Wallet extension is not available in this browser.');
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (error) {
      throw new Error(getWalletErrorMessage(error, 'Unable to switch chain.'));
    }
    return;
  }

  // For app connector, chain is specified per-request in sendTransaction
}

export async function walletSendTransaction(
  deps: WalletActionDeps,
  params: TransactionParams
): Promise<string> {
  const { address } = deps;
  if (!address) {
    throw new Error('Connect an OKX wallet before sending a transaction.');
  }

  const chainId = params.chainId ?? deps.chainId ?? defaultWalletChain.id;
  const txParams = {
    from: address,
    to: params.to,
    data: params.data,
    value: params.value ?? '0x0',
  };

  if (deps.connectorType === 'extension') {
    const provider = getOkxExtensionProvider();
    if (!provider) {
      throw new Error('OKX Wallet extension is not available in this browser.');
    }

    try {
      return await provider.request<string>({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
    } catch (error) {
      throw new Error(getWalletErrorMessage(error, 'Transaction rejected.'));
    }
  }

  const ui = await deps.getUniversalUi();
  try {
    return await ui.request<string>(
      {
        method: 'eth_sendTransaction',
        params: [txParams],
      },
      toCaipChainId(chainId),
      deps.requestActions
    );
  } catch (error) {
    throw new Error(getWalletErrorMessage(error, 'Transaction rejected.'));
  }
}

export async function walletSignMessage(deps: WalletActionDeps, message: string): Promise<string> {
  const { address } = deps;
  if (!address) {
    throw new Error('Connect an OKX wallet before requesting a signature.');
  }

  const chainId = deps.chainId ?? defaultWalletChain.id;
  const params = buildPersonalSignParams(message, address);

  if (deps.connectorType === 'extension') {
    const provider = getOkxExtensionProvider();
    if (!provider) {
      throw new Error('OKX Wallet extension is not available in this browser.');
    }

    try {
      return await provider.request<string>({
        method: 'personal_sign',
        params,
      });
    } catch (error) {
      throw new Error(getWalletErrorMessage(error, 'Unable to sign with OKX Extension.'));
    }
  }

  const ui = await deps.getUniversalUi();
  try {
    return await ui.request<string>(
      {
        method: 'personal_sign',
        params,
      },
      toCaipChainId(chainId),
      deps.requestActions
    );
  } catch (error) {
    throw new Error(getWalletErrorMessage(error, 'Unable to sign with OKX App.'));
  }
}

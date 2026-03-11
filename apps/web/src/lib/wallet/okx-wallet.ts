import type { SessionTypes } from '@okxconnect/ui';
import { type Hex, toHex } from 'viem';
import { defaultWalletChain, findSupportedChain } from './chains';

export type WalletConnectorType = 'extension' | 'app';

export interface OkxInjectedProvider {
  request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown> | object;
  }): Promise<T>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface OkxWalletSnapshot {
  address: string;
  chainId: number;
  connectorType: WalletConnectorType;
}

export function buildPersonalSignParams(message: string, address: string): [Hex, string] {
  return [toHex(message), address];
}

export function getOkxExtensionProvider(): OkxInjectedProvider | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const okxwallet = (window as Window & { okxwallet?: unknown }).okxwallet;
  if (!okxwallet || typeof okxwallet !== 'object' || !('request' in okxwallet)) {
    return null;
  }

  return okxwallet as OkxInjectedProvider;
}

export function parseWalletChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  if (value.startsWith('eip155:')) {
    const chainId = Number.parseInt(value.slice('eip155:'.length), 10);
    return Number.isFinite(chainId) ? chainId : null;
  }

  if (value.startsWith('0x')) {
    const chainId = Number.parseInt(value.slice(2), 16);
    return Number.isFinite(chainId) ? chainId : null;
  }

  const chainId = Number.parseInt(value, 10);
  return Number.isFinite(chainId) ? chainId : null;
}

export function parseSessionAccount(account: string): {
  address: string | null;
  chainId: number | null;
} {
  const [namespace, chainIdValue, address] = account.split(':');

  if (namespace !== 'eip155' || !address) {
    return { address: null, chainId: null };
  }

  return {
    address,
    chainId: parseWalletChainId(chainIdValue),
  };
}

export function buildSnapshotFromSession(
  session: SessionTypes.Struct | undefined,
  connectorType: WalletConnectorType = 'app'
): OkxWalletSnapshot | null {
  const accounts = session?.namespaces?.eip155?.accounts ?? [];

  for (const account of accounts) {
    const parsedAccount = parseSessionAccount(account);
    if (!parsedAccount.address) {
      continue;
    }

    const chainId =
      parsedAccount.chainId ??
      parseWalletChainId(session?.namespaces?.eip155?.defaultChain) ??
      parseWalletChainId(session?.namespaces?.eip155?.chains?.[0]) ??
      defaultWalletChain.id;

    return {
      address: parsedAccount.address,
      chainId,
      connectorType,
    };
  }

  return null;
}

export function getWalletLabel(connectorType: WalletConnectorType | null): string | null {
  if (connectorType === 'extension') {
    return 'OKX Extension';
  }

  if (connectorType === 'app') {
    return 'OKX App';
  }

  return null;
}

export function getWalletChainName(chainId: number | null): string | null {
  if (chainId === null) {
    return null;
  }

  return findSupportedChain(chainId)?.name ?? `Chain ${chainId}`;
}

export function getWalletErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const rejectedMessage = /reject|denied|declined/i;
    if (rejectedMessage.test(error.message)) {
      return 'Wallet request was rejected.';
    }

    return error.message || fallback;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    if (/reject|denied|declined/i.test(error.message)) {
      return 'Wallet request was rejected.';
    }

    return error.message || fallback;
  }

  return fallback;
}

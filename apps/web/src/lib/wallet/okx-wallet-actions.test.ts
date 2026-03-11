import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOkxExtensionProvider } from './okx-wallet';
import type { TypedDataParams, WalletActionDeps } from './okx-wallet-actions';
import { walletSignTypedData } from './okx-wallet-actions';

vi.mock('./okx-wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./okx-wallet')>();

  return {
    ...actual,
    getOkxExtensionProvider: vi.fn(),
  };
});

const typedData: TypedDataParams = {
  domain: {
    chainId: 196,
    name: 'USD₮0',
    verifyingContract: '0x779ded0c9e1022225f8e0630b35a9b54be713736',
    version: '1',
  },
  message: {
    from: '0x1234567890abcdef1234567890abcdef12345678',
    nonce: '0x1111111111111111111111111111111111111111111111111111111111111111',
    to: '0x6d5056da1e584e11faa280dbaf3b72676333dd05',
    validAfter: '1741708800',
    validBefore: '1741709400',
    value: '100000',
  },
  primaryType: 'TransferWithAuthorization',
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  },
};

function createActionDeps(overrides: Partial<WalletActionDeps> = {}): WalletActionDeps {
  return {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    chainId: 196,
    connectorType: 'app',
    getUniversalUi: async () =>
      ({
        request: vi.fn(),
      }) as never,
    requestActions: {} as WalletActionDeps['requestActions'],
    ...overrides,
  };
}

describe('walletSignTypedData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes typed data objects directly to the OKX app connector', async () => {
    const request = vi.fn().mockResolvedValue('0xsigned');
    const deps = createActionDeps({
      chainId: 1,
      getUniversalUi: async () =>
        ({
          request,
        }) as never,
    });

    const signature = await walletSignTypedData(deps, typedData, 196);

    expect(signature).toBe('0xsigned');
    expect(request).toHaveBeenCalledWith(
      {
        method: 'eth_signTypedData_v4',
        params: [deps.address, typedData],
      },
      'eip155:196',
      deps.requestActions
    );
  });

  it('passes typed data objects directly to the OKX extension provider', async () => {
    const request = vi.fn().mockResolvedValue('0xsigned');
    vi.mocked(getOkxExtensionProvider).mockReturnValue({
      request,
    });
    const deps = createActionDeps({
      connectorType: 'extension',
    });

    const signature = await walletSignTypedData(deps, typedData);

    expect(signature).toBe('0xsigned');
    expect(request).toHaveBeenCalledWith({
      method: 'eth_signTypedData_v4',
      params: [deps.address, typedData],
    });
  });
});

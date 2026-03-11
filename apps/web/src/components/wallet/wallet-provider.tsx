'use client';

import { OkxWalletProvider } from './okx-wallet-context';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <OkxWalletProvider>{children}</OkxWalletProvider>;
}

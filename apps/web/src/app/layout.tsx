import { SiteHeader } from '@/components/navigation/site-header';
import { WalletProvider } from '@/components/wallet/wallet-provider';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';

export const metadata: Metadata = {
  title: 'OKX OnchainOS Credit',
  description:
    'Wallet-native credit scoring, signed credentials, and enterprise underwriting APIs powered by OKX OnchainOS.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;

  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <SiteHeader sessionWallet={session?.wallet ?? null} />
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}

import { SiteHeader } from '@/components/navigation/site-header';
import { WalletProvider } from '@/components/wallet/wallet-provider';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import type { Metadata } from 'next';
import { DM_Serif_Display, IBM_Plex_Mono, Syne } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';

const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-data',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
});

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
    <html
      lang="en"
      className={`${dmSerifDisplay.variable} ${ibmPlexMono.variable} ${syne.variable}`}
    >
      <body>
        <SiteHeader sessionWallet={session?.wallet ?? null} />
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}

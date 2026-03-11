import { HeaderSignOutButton } from '@/components/navigation/header-sign-out-button';
import { truncateWalletAddress } from '@/lib/wallet/format';
import Link from 'next/link';

interface SiteHeaderProps {
  sessionWallet: string | null;
}

const marketingLinks = [
  { href: '/#credit-method', label: 'Methodology' },
  { href: '/#connect-credit-wallet', label: 'Connect' },
];

export function SiteHeader({ sessionWallet }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2a2a2a] bg-[rgba(0,0,0,0.8)] backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link className="min-w-0" href="/">
            <span className="text-sm font-medium text-white">OKX OnchainOS Credit</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {marketingLinks.map((link) => (
              <Link
                className="rounded-md px-3 py-1.5 text-sm text-[#888] transition hover:text-white"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {sessionWallet ? (
            <span className="hidden rounded-md border border-[#2a2a2a] px-3 py-1.5 font-mono text-xs text-[#888] md:block">
              {truncateWalletAddress(sessionWallet)}
            </span>
          ) : null}

          {sessionWallet ? (
            <>
              <Link
                className="rounded-md border border-[#333] px-3 py-1.5 text-sm text-white transition hover:bg-[#111]"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <HeaderSignOutButton />
            </>
          ) : (
            <Link
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition hover:bg-[#e5e5e5]"
              href="/#connect-credit-wallet"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

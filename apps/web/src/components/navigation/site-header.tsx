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
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[rgba(9,12,20,0.85)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5 md:px-10">
        <div className="flex min-w-0 items-center gap-8">
          <Link className="min-w-0 flex items-center gap-2" href="/">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-gold)]" />
            <span className="text-sm tracking-wide text-[var(--text-primary)]">
              OnchainOS Credit
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {marketingLinks.map((link) => (
              <Link
                className="px-3 py-1.5 text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {sessionWallet ? (
            <span className="hidden font-mono text-xs text-[var(--text-tertiary)] md:block">
              {truncateWalletAddress(sessionWallet)}
            </span>
          ) : null}

          {sessionWallet ? (
            <>
              <Link
                className="border border-[var(--border-default)] px-3.5 py-1.5 text-[13px] text-[var(--text-primary)] transition-colors hover:border-[var(--text-tertiary)] hover:bg-[var(--surface-overlay)]"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <HeaderSignOutButton />
            </>
          ) : (
            <Link
              className="bg-[var(--accent-gold)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--surface-base)] transition-colors hover:bg-[var(--accent-gold-hover)]"
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

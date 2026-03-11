import { HeaderSignOutButton } from '@/components/navigation/header-sign-out-button';
import { truncateWalletAddress } from '@/lib/wallet/format';
import Link from 'next/link';

interface SiteHeaderProps {
  sessionWallet: string | null;
}

const marketingLinks = [
  { href: '/#credit-method', label: 'Methodology' },
  { href: '/#connect-credit-wallet', label: 'Connect Wallet' },
];

export function SiteHeader({ sessionWallet }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(36,51,82,0.82)] bg-[rgba(8,12,20,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link className="min-w-0" href="/">
            <div className="font-mono text-[10px] uppercase tracking-[0.42em] text-[var(--okx-accent)]">
              OKX OnchainOS Credit
            </div>
            <p className="mt-1 truncate text-sm text-[var(--okx-text-muted)] md:text-base">
              Wallet-native underwriting infrastructure
            </p>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {marketingLinks.map((link) => (
              <Link
                className="rounded-full border border-transparent px-3 py-2 text-sm text-[var(--okx-text-muted)] transition hover:border-[rgba(36,51,82,0.82)] hover:text-[var(--color-foreground)]"
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
            <div className="hidden rounded-full border border-[rgba(36,51,82,0.82)] bg-[rgba(255,255,255,0.03)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)] md:block">
              {truncateWalletAddress(sessionWallet)}
            </div>
          ) : null}

          {sessionWallet ? (
            <>
              <Link
                className="rounded-full border border-[rgba(36,51,82,0.82)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <HeaderSignOutButton />
            </>
          ) : (
            <Link
              className="rounded-full bg-[var(--okx-accent)] px-4 py-2 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
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

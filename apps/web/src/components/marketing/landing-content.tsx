import Link from 'next/link';

export function LandingContent() {
  return (
    <section className="border-t border-[var(--border-subtle)] pt-16 pb-8">
      <div className="max-w-md">
        <h2 className="font-display text-2xl tracking-tight text-[var(--text-primary)] md:text-3xl">
          Start scoring
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
          Connect an OKX wallet, sign the SIWE challenge, and unlock your on-chain credit report.
          Scores are paid via x402 with zero-gas USDT0 on X Layer.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          className="bg-[var(--accent-gold)] px-5 py-2.5 text-sm font-medium text-[var(--surface-base)] transition-colors hover:bg-[var(--accent-gold-hover)]"
          href="/#connect-credit-wallet"
        >
          Connect Wallet
        </Link>
        <Link
          className="border border-[var(--border-default)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          href="/#credit-method"
        >
          Read methodology
        </Link>
      </div>
    </section>
  );
}

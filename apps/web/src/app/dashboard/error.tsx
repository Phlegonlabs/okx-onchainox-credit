'use client';

import Link from 'next/link';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.18),transparent_18%),linear-gradient(180deg,#0c1220_0%,#080c14_55%,#060910_100%)] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="rounded-[28px] border border-[rgba(239,68,68,0.2)] bg-[rgba(12,18,32,0.9)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-score-poor)]">
            Dashboard interrupted
          </p>
          <h1 className="mt-4 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-5xl">
            The authenticated dashboard could not finish loading.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
            Retry the request first. If this keeps happening, reconnect the wallet from the home
            screen and verify that the current environment has access to the OKX and credential
            services.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="min-h-[52px] rounded-full bg-[var(--okx-accent)] px-5 py-3 text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
              onClick={() => reset()}
              type="button"
            >
              Retry dashboard load
            </button>
            <Link
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
              href="/"
            >
              Return home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

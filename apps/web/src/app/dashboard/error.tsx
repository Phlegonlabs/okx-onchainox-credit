'use client';

import Link from 'next/link';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-2xl">
        <p className="text-[13px] uppercase tracking-[0.2em] text-[var(--error)]">Error</p>
        <h1 className="mt-4 font-display text-2xl tracking-tight text-[var(--text-primary)] md:text-3xl">
          The dashboard could not finish loading.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
          Retry the request first. If this keeps happening, reconnect the wallet from the home
          screen.
        </p>

        <div className="mt-8 flex gap-3">
          <button
            className="bg-[var(--accent-gold)] px-5 py-2.5 text-sm font-medium text-[var(--surface-base)] transition-colors hover:bg-[var(--accent-gold-hover)]"
            onClick={() => reset()}
            type="button"
          >
            Retry
          </button>
          <Link
            className="inline-flex items-center border border-[var(--border-default)] px-5 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            href="/"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-black px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="rounded-lg border border-[rgba(220,38,38,0.3)] bg-[#0a0a0a] p-6">
          <p className="text-xs text-red-500">Error</p>
          <h1 className="mt-3 text-2xl font-medium tracking-tight text-white md:text-3xl">
            The dashboard could not finish loading.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[#888]">
            Retry the request first. If this keeps happening, reconnect the wallet from the home
            screen.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#e5e5e5]"
              onClick={() => reset()}
              type="button"
            >
              Retry
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-md border border-[#333] px-4 py-2.5 text-sm text-white transition hover:bg-[#111]"
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

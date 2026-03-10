import { DashboardScorePanel } from '@/components/dashboard/dashboard-score-panel';
import { DashboardSessionCard } from '@/components/dashboard/dashboard-session-card';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;

  if (!session) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.18),transparent_18%),linear-gradient(180deg,#0c1220_0%,#080c14_55%,#060910_100%)] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <DashboardSessionCard expiresAt={session.expiresAt} wallet={session.wallet} />
        <DashboardScorePanel wallet={session.wallet} />

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.82)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Next in queue
            </p>
            <p className="mt-4 text-3xl [font-family:var(--font-display)]">Score gauge</p>
            <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              The authenticated dashboard shell is live. Score visualization lands next.
            </p>
          </article>

          <article className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.82)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Session scope
            </p>
            <p className="mt-4 text-3xl [font-family:var(--font-display)]">Wallet-first</p>
            <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              The dashboard only resolves for the signed wallet, not a detached browser profile.
            </p>
          </article>

          <article className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.82)] p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Credential path
            </p>
            <p className="mt-4 text-3xl [font-family:var(--font-display)]">Ready for x402</p>
            <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
              Payment gating and signed issuance can now attach to an authenticated score view.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

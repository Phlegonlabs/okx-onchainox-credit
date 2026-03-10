import { resolveWalletScore } from '@/lib/credit/score-service';
import { logger } from '@/lib/logger';
import { createWalletHash } from '@/lib/wallet/hash';
import { ImprovementTips } from './improvement-tips';
import { ScoreBreakdown } from './score-breakdown';
import { ScoreGauge } from './score-gauge';

export async function DashboardScorePanel({ wallet }: { wallet: string }) {
  try {
    const score = await resolveWalletScore(wallet);

    return (
      <div className="grid gap-4">
        <section className="grid gap-4 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
          <article className="min-w-0 rounded-[28px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
              Credit gauge
            </p>
            <div className="mt-5">
              <ScoreGauge score={score.score} tier={score.tier} />
            </div>
          </article>

          <article className="min-w-0 rounded-[28px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.84)] p-5 md:p-6">
            <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                  Score status
                </p>
                <h2 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-4xl">
                  The wallet is now being priced on actual on-chain behavior.
                </h2>
              </div>

              <div className="self-start rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)]">
                {score.stale ? 'Serving stale cache' : 'Fresh within 24h'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-text-dim)]">
                  Computed
                </p>
                <p className="mt-4 text-2xl [font-family:var(--font-display)]">
                  {new Date(score.computedAt).toLocaleDateString()}
                </p>
                <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
                  Last score refresh window.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-text-dim)]">
                  Expires
                </p>
                <p className="mt-4 text-2xl [font-family:var(--font-display)]">
                  {new Date(score.expiresAt).toLocaleDateString()}
                </p>
                <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
                  Cache lifetime before refresh.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-text-dim)]">
                  Gaps flagged
                </p>
                <p className="mt-4 text-2xl [font-family:var(--font-display)]">
                  {score.dataGaps?.length ?? 0}
                </p>
                <p className="mt-2 text-sm text-[var(--okx-text-muted)]">
                  Missing history signals detected during scoring.
                </p>
              </div>
            </div>

            {score.dataGaps?.length ? (
              <div className="mt-4 rounded-[24px] border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-score-fair)]">
                  Data gaps
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {score.dataGaps.map((gap) => (
                    <span
                      className="rounded-full border border-[rgba(245,158,11,0.22)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--okx-score-fair)]"
                      key={gap}
                    >
                      {gap.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        </section>

        <ScoreBreakdown dimensions={score.dimensions} tier={score.tier} />
        <ImprovementTips dimensions={score.dimensions} tier={score.tier} />
      </div>
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        operation: 'dashboard_score_load',
        walletHash: createWalletHash(wallet),
      },
      'dashboard score load failed'
    );

    return (
      <section className="rounded-[28px] border border-[rgba(239,68,68,0.2)] bg-[rgba(12,18,32,0.9)] p-5 md:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-score-poor)]">
          Score unavailable
        </p>
        <h2 className="mt-4 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-4xl">
          We could not retrieve wallet telemetry from OKX OnchainOS right now.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
          Reconnect the wallet or try again later. If the issue persists, verify that the OKX API
          configuration is available in the current environment.
        </p>
      </section>
    );
  }
}

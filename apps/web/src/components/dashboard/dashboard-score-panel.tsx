import { resolveWalletScore } from '@/lib/credit/score-service';
import { logger } from '@/lib/logger';
import { truncateWalletAddress } from '@/lib/wallet/format';
import { createWalletHash } from '@/lib/wallet/hash';
import { ImprovementTips } from './improvement-tips';
import { ScoreBreakdown } from './score-breakdown';
import { ScoreGauge } from './score-gauge';

export async function DashboardScorePanel({
  expiresAt,
  isLocalMockMode = false,
  wallet,
}: {
  expiresAt: string;
  isLocalMockMode?: boolean;
  wallet: string;
}) {
  try {
    const score = await resolveWalletScore(wallet);

    return (
      <div className="grid gap-6">
        <section className="rounded-[32px] border border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6">
          <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
                Credit overview
              </p>
              <h1 className="mt-3 text-3xl tracking-[-0.04em] text-balance [font-family:var(--font-display)] md:text-5xl">
                The wallet is being priced on actual on-chain behavior.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
                Dashboard access is wallet-gated. The score, underlying dimensions, and signed
                credential all resolve from the same telemetry surface.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isLocalMockMode ? (
                <div className="self-start rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.12)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                  Local mock mode
                </div>
              ) : null}
              <div className="self-start rounded-full border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-muted)]">
                {score.stale ? 'Serving stale cache' : 'Fresh within 24h'}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-center">
            <div className="mx-auto w-full max-w-[320px]">
              <ScoreGauge score={score.score} tier={score.tier} />
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-4 md:p-5">
                <div className="grid gap-4 md:grid-cols-4 md:divide-x md:divide-[rgba(36,51,82,0.72)]">
                  <div className="space-y-2 md:px-4 first:md:pl-0 last:md:pr-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                      Authorized wallet
                    </p>
                    <p
                      className="font-mono text-base text-[var(--color-foreground)]"
                      title={wallet}
                    >
                      {truncateWalletAddress(wallet)}
                    </p>
                  </div>
                  <div className="space-y-2 md:px-4 first:md:pl-0 last:md:pr-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                      Computed
                    </p>
                    <p className="text-2xl [font-family:var(--font-display)]">
                      {new Date(score.computedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-2 md:px-4 first:md:pl-0 last:md:pr-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                      Session expires
                    </p>
                    <p className="text-base text-[var(--color-foreground)]">
                      {new Date(expiresAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-2 md:px-4 first:md:pl-0 last:md:pr-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                      Gaps flagged
                    </p>
                    <p className="text-2xl [font-family:var(--font-display)]">
                      {score.dataGaps?.length ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {score.dataGaps?.length ? (
                <div className="rounded-[24px] border border-[rgba(245,158,11,0.24)] bg-[rgba(245,158,11,0.08)] p-4">
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
              ) : (
                <div className="rounded-[24px] border border-[rgba(16,185,129,0.24)] bg-[rgba(16,185,129,0.08)] p-4 text-sm leading-7 text-[var(--okx-text-muted)]">
                  No missing history signals were flagged during the current scoring window.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.84)] p-5 md:p-6">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-start">
            <div className="xl:border-r xl:border-[rgba(36,51,82,0.72)] xl:pr-8">
              <ScoreBreakdown dimensions={score.dimensions} tier={score.tier} />
            </div>
            <div className="xl:pl-2">
              <ImprovementTips dimensions={score.dimensions} tier={score.tier} />
            </div>
          </div>
        </section>
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
      <section className="rounded-[32px] border border-[rgba(239,68,68,0.2)] bg-[rgba(12,18,32,0.9)] p-5 md:p-6">
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

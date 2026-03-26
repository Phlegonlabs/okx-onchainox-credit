import { formatIsoDateUtc } from '@/lib/date-format';
import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { truncateWalletAddress } from '@/lib/wallet/format';
import { ImprovementTips } from './improvement-tips';
import { ScoreBreakdown } from './score-breakdown';
import { ScoreGauge } from './score-gauge';

export function DashboardScoreView({
  isLocalMockMode = false,
  score,
  sessionExpiresAt,
}: {
  isLocalMockMode?: boolean;
  score: SignedScoreQueryPayload;
  sessionExpiresAt: string;
}) {
  return (
    <div className="grid gap-8">
      <section className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-8">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl text-[var(--text-primary)]">Score Report</h2>
          <div className="flex flex-wrap items-center gap-2">
            {isLocalMockMode ? (
              <span className="border border-[var(--border-default)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
                Mock
              </span>
            ) : null}
            <span className="border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-xs text-[var(--score-excellent)]">
              x402 settled
            </span>
            <span className="border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-tertiary)]">
              {score.stale ? 'Stale cache' : 'Fresh'}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[260px]">
            <ScoreGauge score={score.score} tier={score.tier} />
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                  Wallet
                </p>
                <p
                  className="mt-1.5 font-mono text-sm text-[var(--text-primary)]"
                  title={score.wallet}
                >
                  {truncateWalletAddress(score.wallet)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                  Computed
                </p>
                <p className="mt-1.5 text-sm text-[var(--text-primary)]">
                  {formatIsoDateUtc(score.computedAt)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                  Expires
                </p>
                <p className="mt-1.5 text-sm text-[var(--text-primary)]">
                  {formatIsoDateUtc(score.expiresAt)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
                  Session
                </p>
                <p className="mt-1.5 text-sm text-[var(--text-primary)]">
                  {formatIsoDateUtc(sessionExpiresAt)}
                </p>
              </div>
            </div>

            {score.dataGaps.length ? (
              <div className="border border-[rgba(197,162,77,0.2)] bg-[rgba(197,162,77,0.04)] p-4">
                <p className="text-xs text-[var(--accent-gold)]">Data gaps</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {score.dataGaps.map((gap) => (
                    <span
                      className="border border-[rgba(197,162,77,0.15)] px-2 py-0.5 text-xs text-[var(--accent-gold)]"
                      key={gap}
                    >
                      {gap.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">No data gaps flagged.</p>
            )}
          </div>
        </div>
      </section>

      <section className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] lg:items-start">
          <div className="lg:border-r lg:border-[var(--border-subtle)] lg:pr-10">
            <ScoreBreakdown dimensions={score.breakdown} tier={score.tier} />
          </div>
          <div className="lg:pl-2">
            <ImprovementTips dimensions={score.breakdown} tier={score.tier} />
          </div>
        </div>
      </section>
    </div>
  );
}

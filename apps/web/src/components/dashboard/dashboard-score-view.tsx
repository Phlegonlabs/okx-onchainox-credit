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
    <div className="grid gap-6">
      <section className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5 md:p-6">
        <div className="flex flex-col gap-3 border-b border-[#2a2a2a] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium text-white">Score Report</h2>
          <div className="flex flex-wrap items-center gap-2">
            {isLocalMockMode ? (
              <span className="rounded-md border border-[#333] px-2 py-1 text-xs text-[#888]">
                Mock mode
              </span>
            ) : null}
            <span className="rounded-md border border-[rgba(5,150,105,0.3)] px-2 py-1 text-xs text-[var(--score-excellent)]">
              x402 settled
            </span>
            <span className="rounded-md border border-[#2a2a2a] px-2 py-1 text-xs text-[#666]">
              {score.stale ? 'Stale cache' : 'Fresh'}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[280px]">
            <ScoreGauge score={score.score} tier={score.tier} />
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[#666]">Wallet</p>
                <p className="mt-1 font-mono text-sm text-white" title={score.wallet}>
                  {truncateWalletAddress(score.wallet)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Computed</p>
                <p className="mt-1 text-sm text-white">
                  {new Date(score.computedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Expires</p>
                <p className="mt-1 text-sm text-white">
                  {new Date(score.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#666]">Session</p>
                <p className="mt-1 text-sm text-white">
                  {new Date(sessionExpiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {score.dataGaps.length ? (
              <div className="rounded-md border border-[rgba(217,119,6,0.3)] bg-[rgba(217,119,6,0.06)] p-3">
                <p className="text-xs text-[var(--score-fair)]">Data gaps</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {score.dataGaps.map((gap) => (
                    <span
                      className="rounded-md border border-[rgba(217,119,6,0.2)] px-2 py-0.5 text-xs text-[var(--score-fair)]"
                      key={gap}
                    >
                      {gap.replaceAll('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">No data gaps flagged.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-5 md:p-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)] lg:items-start">
          <div className="lg:border-r lg:border-[#2a2a2a] lg:pr-8">
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

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const detailCardSkeletonKeys = ['computed', 'expires', 'gaps'] as const;
const breakdownSkeletonKeys = [
  'wallet-age',
  'asset-scale',
  'stability',
  'repayment',
  'multichain',
] as const;
const tipSkeletonKeys = ['tip-1', 'tip-2', 'tip-3'] as const;
const flowStepSkeletonKeys = ['request', 'quote', 'settlement', 'issue'] as const;
const credentialMetricSkeletonKeys = ['score', 'issued', 'expires'] as const;

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(245,166,35,0.14),rgba(255,255,255,0.04))]',
        className
      )}
    />
  );
}

function SkeletonCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'overflow-hidden rounded-[28px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.84)]',
        className
      )}
    >
      {children}
    </article>
  );
}

function SummarySkeletonCard() {
  return (
    <SkeletonCard className="p-5">
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="mt-4 h-10 w-40" />
      <SkeletonBar className="mt-4 h-3 w-full" />
      <SkeletonBar className="mt-2 h-3 w-5/6" />
    </SkeletonCard>
  );
}

export function DashboardScorePanelSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4">
      <section className="grid gap-4 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)]">
        <SkeletonCard className="border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6">
          <SkeletonBar className="h-3 w-24" />
          <div className="mt-5 flex items-center justify-center">
            <div className="flex h-[220px] w-[220px] animate-pulse items-center justify-center rounded-full border border-[rgba(245,166,35,0.18)] bg-[radial-gradient(circle,rgba(245,166,35,0.12),rgba(12,18,32,0.04)_62%,transparent_70%)] md:h-[250px] md:w-[250px]">
              <div className="space-y-3 text-center">
                <SkeletonBar className="mx-auto h-3 w-24" />
                <SkeletonBar className="mx-auto h-16 w-28 rounded-[24px]" />
                <SkeletonBar className="mx-auto h-3 w-20" />
              </div>
            </div>
          </div>
        </SkeletonCard>

        <SkeletonCard className="p-5 md:p-6">
          <div className="border-b border-[var(--okx-border)] pb-5">
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="mt-4 h-10 w-full max-w-xl" />
            <SkeletonBar className="mt-2 h-10 w-5/6 max-w-lg" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {detailCardSkeletonKeys.map((key) => (
              <div
                className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4"
                key={key}
              >
                <SkeletonBar className="h-3 w-20" />
                <SkeletonBar className="mt-4 h-8 w-24" />
                <SkeletonBar className="mt-3 h-3 w-full" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </section>

      <SkeletonCard className="p-5 md:p-6">
        <SkeletonBar className="h-3 w-32" />
        <SkeletonBar className="mt-4 h-10 w-full max-w-2xl" />
        <div className="mt-6 grid gap-4">
          {breakdownSkeletonKeys.map((key) => (
            <div
              className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] p-4"
              key={key}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="w-full">
                  <SkeletonBar className="h-3 w-24" />
                  <SkeletonBar className="mt-3 h-3 w-40" />
                </div>
                <SkeletonBar className="h-8 w-20" />
              </div>
              <SkeletonBar className="mt-4 h-3 w-full rounded-[999px]" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="p-5 md:p-6">
        <SkeletonBar className="h-3 w-32" />
        <SkeletonBar className="mt-4 h-10 w-full max-w-2xl" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {tipSkeletonKeys.map((key) => (
            <div
              className="rounded-[24px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] p-5"
              key={key}
            >
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="mt-4 h-8 w-32" />
              <SkeletonBar className="mt-4 h-3 w-full" />
              <SkeletonBar className="mt-2 h-3 w-5/6" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

export function DashboardLoadingShell() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.18),transparent_18%),linear-gradient(180deg,#0c1220_0%,#080c14_55%,#060910_100%)] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <SkeletonCard className="border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.4)] md:p-6">
          <div className="border-b border-[var(--okx-border)] pb-5">
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="mt-4 h-10 w-full max-w-xl" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-5">
              <SkeletonBar className="h-3 w-28" />
              <SkeletonBar className="mt-4 h-8 w-full max-w-sm" />
              <SkeletonBar className="mt-3 h-3 w-40" />
            </div>
            <SkeletonBar className="min-h-[52px] rounded-[24px]" />
          </div>
        </SkeletonCard>

        <DashboardScorePanelSkeleton />

        <SkeletonCard className="p-5 md:p-6">
          <div className="border-b border-[var(--okx-border)] pb-5">
            <SkeletonBar className="h-3 w-32" />
            <SkeletonBar className="mt-4 h-10 w-full max-w-2xl" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5">
              <SkeletonBar className="h-3 w-16" />
              <div className="mt-4 grid gap-3">
                {flowStepSkeletonKeys.map((key) => (
                  <SkeletonBar className="h-3 w-full" key={key} />
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5">
              <SkeletonBar className="h-3 w-28" />
              <SkeletonBar className="mt-4 h-8 w-48" />
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {credentialMetricSkeletonKeys.map((key) => (
                  <div
                    className="rounded-[20px] border border-[var(--okx-border)] bg-[rgba(8,12,20,0.82)] p-4"
                    key={key}
                  >
                    <SkeletonBar className="h-3 w-16" />
                    <SkeletonBar className="mt-4 h-6 w-20" />
                  </div>
                ))}
              </div>
              <SkeletonBar className="mt-4 h-40 w-full rounded-[20px]" />
            </div>
          </div>
        </SkeletonCard>

        <section className="grid gap-4 md:grid-cols-3">
          <SummarySkeletonCard />
          <SummarySkeletonCard />
          <SummarySkeletonCard />
        </section>
      </div>
    </main>
  );
}

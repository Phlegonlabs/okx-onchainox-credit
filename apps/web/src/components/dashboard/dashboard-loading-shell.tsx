import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

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

export function DashboardScorePanelSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <SkeletonCard className="border-[var(--okx-border-light)] bg-[linear-gradient(180deg,rgba(12,18,32,0.96),rgba(8,12,20,0.98))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] md:p-6">
        <div className="border-b border-[var(--okx-border)] pb-6">
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="mt-4 h-10 w-full max-w-2xl" />
          <SkeletonBar className="mt-3 h-3 w-full max-w-xl" />
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <div className="flex items-center justify-center">
            <div className="flex h-[220px] w-[220px] animate-pulse items-center justify-center rounded-full border border-[rgba(245,166,35,0.18)] bg-[radial-gradient(circle,rgba(245,166,35,0.12),rgba(12,18,32,0.04)_62%,transparent_70%)] md:h-[250px] md:w-[250px]">
              <div className="space-y-3 text-center">
                <SkeletonBar className="mx-auto h-3 w-24" />
                <SkeletonBar className="mx-auto h-16 w-28 rounded-[24px]" />
                <SkeletonBar className="mx-auto h-3 w-20" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-4">
              <div className="grid gap-4 md:grid-cols-4">
                {['wallet', 'computed', 'session', 'gaps'].map((key) => (
                  <div className="space-y-3" key={key}>
                    <SkeletonBar className="h-3 w-20" />
                    <SkeletonBar className="h-6 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[24px] border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.08)] p-4">
              <SkeletonBar className="h-3 w-40" />
            </div>
          </div>
        </div>
      </SkeletonCard>

      <SkeletonCard className="p-5 md:p-6">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="xl:border-r xl:border-[rgba(36,51,82,0.72)] xl:pr-8">
            <SkeletonBar className="h-3 w-32" />
            <SkeletonBar className="mt-4 h-10 w-full max-w-2xl" />
            <div className="mt-6 grid gap-4">
              {breakdownSkeletonKeys.map((key) => (
                <div className="border-b border-[rgba(36,51,82,0.72)] pb-4" key={key}>
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
          </div>

          <div>
            <SkeletonBar className="h-3 w-32" />
            <SkeletonBar className="mt-4 h-10 w-full max-w-xl" />
            <div className="mt-6 grid gap-4">
              {tipSkeletonKeys.map((key) => (
                <div className="border-b border-[rgba(36,51,82,0.72)] pb-4" key={key}>
                  <SkeletonBar className="h-3 w-24" />
                  <SkeletonBar className="mt-4 h-8 w-32" />
                  <SkeletonBar className="mt-4 h-3 w-full" />
                  <SkeletonBar className="mt-5 h-14 w-full rounded-[20px]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}

export function DashboardLoadingShell() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.18),transparent_18%),linear-gradient(180deg,#0c1220_0%,#080c14_55%,#060910_100%)] px-5 pb-10 pt-5 md:px-8 md:pb-12 md:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <DashboardScorePanelSkeleton />

        <SkeletonCard className="p-5 md:p-6">
          <div className="border-b border-[var(--okx-border)] pb-5">
            <SkeletonBar className="h-3 w-32" />
            <SkeletonBar className="mt-4 h-10 w-full max-w-2xl" />
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="lg:border-r lg:border-[rgba(36,51,82,0.72)] lg:pr-8">
              <SkeletonBar className="h-3 w-16" />
              <div className="mt-4 grid gap-3">
                {flowStepSkeletonKeys.map((key) => (
                  <SkeletonBar className="h-3 w-full" key={key} />
                ))}
              </div>
            </div>

            <div>
              <SkeletonBar className="h-3 w-28" />
              <SkeletonBar className="mt-4 h-8 w-48" />
              <div className="mt-5 grid gap-4 rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-4 md:grid-cols-3">
                {credentialMetricSkeletonKeys.map((key) => (
                  <div className="space-y-3" key={key}>
                    <SkeletonBar className="h-3 w-16" />
                    <SkeletonBar className="mt-4 h-6 w-20" />
                  </div>
                ))}
              </div>
              <SkeletonBar className="mt-4 h-40 w-full rounded-[20px]" />
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}

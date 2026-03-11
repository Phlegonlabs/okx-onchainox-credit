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
const credentialMetricSkeletonKeys = ['score', 'issued', 'expires'] as const;

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[#1a1a1a]', className)} />;
}

function SkeletonCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]', className)}
    >
      {children}
    </div>
  );
}

export function DashboardScorePanelSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <SkeletonCard className="p-5 md:p-6">
        <div className="border-b border-[#2a2a2a] pb-5">
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="mt-4 h-8 w-full max-w-xl" />
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="flex items-center justify-center">
            <div className="flex h-[200px] w-[200px] animate-pulse items-center justify-center rounded-full border border-[#2a2a2a] md:h-[220px] md:w-[220px]">
              <div className="space-y-3 text-center">
                <SkeletonBar className="mx-auto h-12 w-24 rounded-md" />
                <SkeletonBar className="mx-auto h-3 w-16" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              {['wallet', 'computed', 'expires', 'session'].map((key) => (
                <div className="space-y-2" key={key}>
                  <SkeletonBar className="h-2 w-16" />
                  <SkeletonBar className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </SkeletonCard>

      <SkeletonCard className="p-5 md:p-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <div className="lg:border-r lg:border-[#2a2a2a] lg:pr-8">
            <SkeletonBar className="h-4 w-40" />
            <div className="mt-4 grid gap-4">
              {breakdownSkeletonKeys.map((key) => (
                <div className="border-b border-[#2a2a2a] pb-4" key={key}>
                  <div className="flex items-center justify-between">
                    <SkeletonBar className="h-3 w-24" />
                    <SkeletonBar className="h-4 w-10" />
                  </div>
                  <SkeletonBar className="mt-3 h-1.5 w-full" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <SkeletonBar className="h-4 w-32" />
            <div className="mt-4 grid gap-4">
              {tipSkeletonKeys.map((key) => (
                <div className="border-b border-[#2a2a2a] pb-4" key={key}>
                  <SkeletonBar className="h-3 w-20" />
                  <SkeletonBar className="mt-3 h-3 w-full" />
                  <SkeletonBar className="mt-3 h-8 w-full rounded-md" />
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
    <main className="min-h-screen bg-black px-5 pb-10 pt-6 md:px-8 md:pb-12 md:pt-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <DashboardScorePanelSkeleton />

        <SkeletonCard className="p-5 md:p-6">
          <div className="border-b border-[#2a2a2a] pb-5">
            <SkeletonBar className="h-4 w-28" />
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <SkeletonBar className="h-3 w-full" />
              <SkeletonBar className="mt-2 h-3 w-3/4" />
            </div>
            <div className="grid gap-3 rounded-md border border-[#2a2a2a] bg-black p-4 sm:grid-cols-3">
              {credentialMetricSkeletonKeys.map((key) => (
                <div className="space-y-2" key={key}>
                  <SkeletonBar className="h-2 w-12" />
                  <SkeletonBar className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonCard>
      </div>
    </main>
  );
}

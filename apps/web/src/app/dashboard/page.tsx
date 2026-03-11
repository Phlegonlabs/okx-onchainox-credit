import { CredentialIssuancePanel } from '@/components/dashboard/credential-issuance-panel';
import { DashboardScorePanelSkeleton } from '@/components/dashboard/dashboard-loading-shell';
import { DashboardScorePanel } from '@/components/dashboard/dashboard-score-panel';
import { LOCAL_MOCK_PAYMENT_RECEIPT, isLocalMockMode } from '@/lib/local-integration';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionToken ? verifySessionToken(sessionToken) : null;

  if (!session) {
    redirect('/');
  }

  const localMockMode = isLocalMockMode();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,166,35,0.18),transparent_18%),linear-gradient(180deg,#0c1220_0%,#080c14_55%,#060910_100%)] px-5 pb-10 pt-5 md:px-8 md:pb-12 md:pt-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Suspense fallback={<DashboardScorePanelSkeleton />}>
          <DashboardScorePanel
            expiresAt={session.expiresAt}
            isLocalMockMode={localMockMode}
            wallet={session.wallet}
          />
        </Suspense>
        <CredentialIssuancePanel
          isLocalMockMode={localMockMode}
          localMockReceipt={localMockMode ? LOCAL_MOCK_PAYMENT_RECEIPT : null}
          wallet={session.wallet}
        />
      </div>
    </main>
  );
}

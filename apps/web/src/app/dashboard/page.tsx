import { DashboardExperience } from '@/components/dashboard/dashboard-experience';
import { isLocalMockMode } from '@/lib/local-integration';
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
    <main className="min-h-screen px-6 pb-12 pt-8 md:px-10 md:pb-16 md:pt-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <DashboardExperience
          isLocalMockMode={isLocalMockMode()}
          sessionExpiresAt={session.expiresAt}
          sessionWallet={session.wallet}
        />
      </div>
    </main>
  );
}

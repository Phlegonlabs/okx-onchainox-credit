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
    <main className="min-h-screen bg-black px-5 pb-10 pt-6 md:px-8 md:pb-12 md:pt-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <DashboardExperience
          isLocalMockMode={isLocalMockMode()}
          sessionExpiresAt={session.expiresAt}
          sessionWallet={session.wallet}
        />
      </div>
    </main>
  );
}

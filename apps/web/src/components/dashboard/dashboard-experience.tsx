'use client';

import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { useState } from 'react';
import { CredentialIssuancePanel } from './credential-issuance-panel';
import { DashboardScorePanel } from './dashboard-score-panel';

export function DashboardExperience({
  isLocalMockMode = false,
  localMockReceipt = null,
  sessionExpiresAt,
  wallet,
}: {
  isLocalMockMode?: boolean;
  localMockReceipt?: string | null;
  sessionExpiresAt: string;
  wallet: string;
}) {
  const [unlockedScore, setUnlockedScore] = useState<SignedScoreQueryPayload | null>(null);

  return (
    <div className="grid gap-6">
      <DashboardScorePanel
        isLocalMockMode={isLocalMockMode}
        localMockReceipt={localMockReceipt}
        onScoreUnlocked={setUnlockedScore}
        sessionExpiresAt={sessionExpiresAt}
        wallet={wallet}
      />
      <CredentialIssuancePanel
        disabled={!unlockedScore}
        disabledReason={
          unlockedScore
            ? null
            : 'Unlock a paid score first. Credential issuance stays behind the same wallet session but only opens after the score query settles.'
        }
        isLocalMockMode={isLocalMockMode}
        localMockReceipt={localMockReceipt}
        wallet={wallet}
      />
    </div>
  );
}

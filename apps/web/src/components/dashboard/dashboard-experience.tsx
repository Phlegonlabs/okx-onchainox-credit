'use client';

import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { resolveTargetWalletInput } from '@/lib/wallet/target-wallet';
import { useState } from 'react';
import { CredentialIssuancePanel } from './credential-issuance-panel';
import { DashboardScorePanel } from './dashboard-score-panel';
import { DashboardTargetWalletPanel } from './dashboard-target-wallet-panel';

export function DashboardExperience({
  isLocalMockMode = false,
  sessionExpiresAt,
  sessionWallet,
}: {
  isLocalMockMode?: boolean;
  sessionExpiresAt: string;
  sessionWallet: string;
}) {
  const [unlockedScore, setUnlockedScore] = useState<SignedScoreQueryPayload | null>(null);
  const [targetWallet, setTargetWallet] = useState<string | null>(null);
  const [targetWalletError, setTargetWalletError] = useState<string | null>(null);
  const [targetWalletInput, setTargetWalletInput] = useState('');
  const hasActiveTarget = targetWallet !== null;

  function handleApplyTargetWallet() {
    const resolution = resolveTargetWalletInput(targetWalletInput);

    if (!resolution.normalizedWallet) {
      setTargetWalletError(resolution.errorMessage);
      return;
    }

    setTargetWalletError(null);
    setTargetWalletInput(resolution.normalizedWallet);
    setUnlockedScore(null);
    setTargetWallet(resolution.normalizedWallet);
  }

  function handleResetTargetWallet() {
    setUnlockedScore(null);
    setTargetWallet(null);
    setTargetWalletError(null);
  }

  return (
    <div className="grid gap-8">
      <DashboardTargetWalletPanel
        onApplyTargetWallet={handleApplyTargetWallet}
        onResetTargetWallet={handleResetTargetWallet}
        onTargetWalletInputChange={setTargetWalletInput}
        sessionExpiresAt={sessionExpiresAt}
        sessionWallet={sessionWallet}
        targetWallet={targetWallet}
        targetWalletError={targetWalletError}
        targetWalletInput={targetWalletInput}
      />
      {hasActiveTarget ? (
        <>
          <DashboardScorePanel
            key={`score-${targetWallet ?? 'empty'}`}
            isLocalMockMode={isLocalMockMode}
            onScoreUnlocked={setUnlockedScore}
            sessionExpiresAt={sessionExpiresAt}
            targetWallet={targetWallet}
          />
          <CredentialIssuancePanel
            key={`credential-${targetWallet ?? 'empty'}`}
            disabled={!unlockedScore || !targetWallet}
            disabledReason={
              targetWallet
                ? unlockedScore
                  ? null
                  : 'Unlock the paid score first.'
                : 'Select a target wallet first.'
            }
            isLocalMockMode={isLocalMockMode}
            wallet={targetWallet}
          />
        </>
      ) : (
        <section className="border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8">
          <p className="text-sm text-[var(--text-tertiary)]">
            Enter a wallet address above to begin scoring.
          </p>
        </section>
      )}
    </div>
  );
}

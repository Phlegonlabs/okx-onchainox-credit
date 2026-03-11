'use client';

import type { SignedScoreQueryPayload } from '@/lib/enterprise/score-payload';
import { resolveTargetWalletInput } from '@/lib/wallet/target-wallet';
import { useState } from 'react';
import { CredentialIssuancePanel } from './credential-issuance-panel';
import { DashboardScorePanel } from './dashboard-score-panel';
import { DashboardTargetWalletPanel } from './dashboard-target-wallet-panel';

export function DashboardExperience({
  isLocalMockMode = false,
  localMockReceipt = null,
  sessionExpiresAt,
  sessionWallet,
}: {
  isLocalMockMode?: boolean;
  localMockReceipt?: string | null;
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
    <div className="grid gap-6">
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
            localMockReceipt={localMockReceipt}
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
                  : 'Unlock the paid score for the active target wallet first. Credential issuance only opens after that wallet’s score query settles.'
                : 'Lock a target wallet first. The payer wallet signs in once, but score and credential flows only run for the active investigation target.'
            }
            isLocalMockMode={isLocalMockMode}
            localMockReceipt={localMockReceipt}
            wallet={targetWallet}
          />
        </>
      ) : (
        <section className="rounded-[32px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.82)] p-5 md:p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-dim)]">
            Investigation workspace
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="rounded-[28px] border border-[var(--okx-border)] bg-[linear-gradient(135deg,rgba(245,166,35,0.08),rgba(8,12,20,0.3))] p-5">
              <h2 className="text-3xl tracking-[-0.04em] [font-family:var(--font-display)] md:text-4xl">
                Lock a wallet above to open the score report.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
                The page stays intentionally quiet until you choose the wallet you want to
                investigate. Once a target is locked, the paid score workflow and optional
                credential section appear below as one continuous workspace.
              </p>
            </div>
            <div className="rounded-[28px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-text-dim)]">
                What opens next
              </p>
              <ol className="mt-4 grid gap-3 text-sm leading-7 text-[var(--okx-text-muted)]">
                <li>1. A compact unlock panel for the selected wallet.</li>
                <li>2. One dominant score report card after payment clears.</li>
                <li>3. An optional credential section underneath the report.</li>
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

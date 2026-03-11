const pillars = [
  {
    eyebrow: '01 / Scoring model',
    title: 'Five dimensions map raw chain behavior into lender-readable risk.',
    body: 'Wallet tenure, activity cadence, asset depth, DeFi repayment, and multichain fluency are normalized into a 300-850 score with transparent sub-metrics.',
  },
  {
    eyebrow: '02 / Signed proof',
    title: 'Every score can be converted into an ECDSA credential with a clear expiry.',
    body: 'Users first unlock the score over x402, then optionally mint a compact credential for protocols that need verifiable underwriting without direct raw history access.',
  },
  {
    eyebrow: '03 / Protocol integration',
    title: 'Enterprise systems query the same credit surface through a metered API.',
    body: 'Protocols can price risk, route limits, or decide eligibility using the same scoring engine, without inheriting custody or identity infrastructure they do not want.',
  },
];

const workflow = [
  {
    step: 'Connect',
    detail: 'Attach any EVM wallet and establish a SIWE-backed session.',
  },
  {
    step: 'Analyze',
    detail: 'Request the paid x402 score query and unlock the normalized OKX OnchainOS profile.',
  },
  {
    step: 'Issue',
    detail: 'Settle through x402 and receive a signed credential ready for reuse.',
  },
];

const operatingModes = [
  ['Retail', 'Connect a wallet, settle the paid score query, then mint a portable credential.'],
  ['Protocols', 'Query paid score APIs and verify credentials without storing raw wallet traces.'],
  [
    'Agents',
    'Call the same paid score API directly from agent infrastructure without relying on MCP.',
  ],
];

export function LandingContent() {
  return (
    <div className="grid gap-6">
      <section
        className="animate-rise rounded-[34px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(12,18,32,0.88),rgba(8,12,20,0.94))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-8"
        id="credit-method"
      >
        <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
              Methodology
            </p>
            <h2 className="max-w-4xl text-4xl tracking-[-0.04em] [font-family:var(--font-display)] md:text-5xl">
              One underwriting surface, explained in a smaller number of stronger sections.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-[var(--okx-text-muted)]">
            This flow stays wallet-native from session creation through paid score retrieval and
            optional credential issuance.
          </p>
        </div>

        <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-5">
            {pillars.map((pillar, index) => (
              <article
                className="border-b border-[rgba(36,51,82,0.72)] pb-5 last:border-none last:pb-0"
                key={pillar.eyebrow}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-accent)]">
                  {pillar.eyebrow}
                </p>
                <h3 className="mt-4 text-3xl leading-tight tracking-[-0.03em] [font-family:var(--font-display)]">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">{pillar.body}</p>
              </article>
            ))}
          </div>

          <div className="space-y-6 rounded-[28px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.03)] p-5 md:p-6">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                Operating sequence
              </p>
              <h3 className="mt-4 text-3xl tracking-[-0.03em] [font-family:var(--font-display)]">
                A three-step flow that stays native to wallets and paid APIs.
              </h3>
            </div>

            <div className="space-y-4">
              {workflow.map((item, index) => (
                <div
                  className="flex gap-4 border-b border-[rgba(36,51,82,0.72)] pb-4 last:border-none last:pb-0"
                  key={item.step}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--okx-border-light)] font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--okx-accent)]">
                    0{index + 1}
                  </div>
                  <div>
                    <p className="text-2xl [font-family:var(--font-display)]">{item.step}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--okx-text-muted)]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[rgba(36,51,82,0.72)] pt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                Operating modes
              </p>
              <div className="mt-4 space-y-3">
                {operatingModes.map(([label, detail]) => (
                  <div className="flex items-start justify-between gap-4" key={label}>
                    <p className="min-w-20 text-lg [font-family:var(--font-display)]">{label}</p>
                    <p className="max-w-sm text-right text-sm leading-7 text-[var(--okx-text-muted)]">
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-rise rounded-[34px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(245,166,35,0.12),rgba(12,18,32,0.92)_22%,rgba(8,12,20,0.96))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
              Launch posture
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl leading-tight tracking-[-0.03em] [font-family:var(--font-display)] md:text-5xl">
              Credit visibility for the next million on-chain balance sheets.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--okx-text-muted)]">
              The landing surface is only the first layer. From here the paid dashboard, credential
              issuance, and agent-facing API all resolve from the same scoring engine.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-[var(--okx-accent)] px-5 py-3 text-center text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
              href="#connect-credit-wallet"
            >
              Connect Wallet
            </a>
            <a
              className="rounded-full border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.03)] px-5 py-3 text-center text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
              href="#credit-method"
            >
              Review methodology
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

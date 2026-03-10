const pillars = [
  {
    eyebrow: '01 / Scoring model',
    title: 'Five dimensions map raw chain behavior into lender-readable risk.',
    body: 'Wallet tenure, activity cadence, asset depth, DeFi repayment, and multichain fluency are normalized into a 300-850 score with transparent sub-metrics.',
  },
  {
    eyebrow: '02 / Signed proof',
    title: 'Every score can be converted into an ECDSA credential with a clear expiry.',
    body: 'Users pay once over x402, receive a compact credential, and reuse that proof with protocols that need verifiable underwriting without direct raw history access.',
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
    detail: 'Pull OKX OnchainOS wallet, DeFi, and market views into a single normalized profile.',
  },
  {
    step: 'Issue',
    detail: 'Settle through x402 and receive a signed credential ready for reuse.',
  },
];

const operatingModes = [
  ['Retail', 'See your score, understand the weak dimensions, and mint a portable credential.'],
  ['Protocols', 'Query paid score APIs and verify credentials without storing raw wallet traces.'],
  ['Agents', 'Use the same credit surface through MCP tools for autonomous underwriting flows.'],
];

export function LandingContent() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="grid gap-6" id="credit-method">
        <div className="grid gap-4 lg:grid-cols-3">
          {pillars.map((pillar, index) => (
            <article
              className="animate-rise rounded-[28px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.78)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
              key={pillar.eyebrow}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-accent)]">
                {pillar.eyebrow}
              </p>
              <h2 className="mt-5 text-3xl leading-tight tracking-[-0.03em] [font-family:var(--font-display)]">
                {pillar.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--okx-text-muted)]">{pillar.body}</p>
            </article>
          ))}
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <article className="animate-rise rounded-[28px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(12,18,32,0.88),rgba(8,12,20,0.92))] p-6">
            <div className="flex flex-col gap-4 border-b border-[var(--okx-border)] pb-5 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
                  Operating sequence
                </p>
                <h2 className="text-4xl tracking-[-0.03em] [font-family:var(--font-display)]">
                  A three-step flow that stays native to wallets.
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-7 text-[var(--okx-text-muted)]">
                No account creation theater, no manual statements, no extra identity layer.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {workflow.map((item, index) => (
                <div
                  className="rounded-[24px] border border-[var(--okx-border)] bg-[rgba(255,255,255,0.02)] p-5"
                  key={item.step}
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--okx-text-dim)]">
                    0{index + 1}
                  </p>
                  <p className="mt-4 text-2xl [font-family:var(--font-display)]">{item.step}</p>
                  <p className="mt-3 text-sm leading-7 text-[var(--okx-text-muted)]">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <aside className="animate-rise rounded-[28px] border border-[var(--okx-border)] bg-[rgba(12,18,32,0.8)] p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--okx-text-muted)]">
              Who this is for
            </p>
            <div className="mt-5 space-y-4">
              {operatingModes.map(([label, detail]) => (
                <div
                  className="rounded-[22px] border border-[rgba(36,51,82,0.72)] bg-[rgba(255,255,255,0.02)] p-4"
                  key={label}
                >
                  <p className="text-xl [font-family:var(--font-display)]">{label}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--okx-text-muted)]">{detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </section>

      <aside className="animate-rise flex h-full flex-col justify-between rounded-[28px] border border-[var(--okx-border)] bg-[linear-gradient(180deg,rgba(245,166,35,0.12),rgba(12,18,32,0.92)_18%,rgba(8,12,20,0.96))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--okx-accent)]">
            Launch posture
          </p>
          <h2 className="mt-4 text-4xl leading-tight tracking-[-0.03em] [font-family:var(--font-display)]">
            Credit visibility for the next million on-chain balance sheets.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--okx-text-muted)]">
            The landing surface is only the first layer. From here the dashboard, credential
            issuance, and enterprise API all resolve from the same scoring engine.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <a
            className="block rounded-full bg-[var(--okx-accent)] px-5 py-3 text-center text-sm font-semibold text-[#080c14] transition hover:bg-[#ffb84d]"
            href="#connect-credit-wallet"
          >
            Connect Wallet
          </a>
          <a
            className="block rounded-full border border-[var(--okx-border-light)] bg-[rgba(255,255,255,0.03)] px-5 py-3 text-center text-sm font-medium text-[var(--color-foreground)] transition hover:border-[var(--okx-accent)]"
            href="#credit-method"
          >
            Review methodology
          </a>
        </div>
      </aside>
    </div>
  );
}

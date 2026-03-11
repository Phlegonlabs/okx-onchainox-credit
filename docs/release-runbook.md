# Release Runbook

Production launch currently covers the Next.js web app in `apps/web` and the public enterprise API routes it serves. `packages/mcp` and `packages/cli` remain preview/internal for this release wave.

## 1. Pull And Validate Release Env

Preview:

```bash
vercel env pull .env.vercel.preview.local --environment=preview
bun run release:env:preview -- --env-file .env.vercel.preview.local
```

Production:

```bash
vercel env pull .env.vercel.production.local --environment=production
bun run release:env:production -- --env-file .env.vercel.production.local
```

The preflight script fails closed when release envs still point at localhost, local SQLite, placeholder values, or `LOCAL_INTEGRATION_MODE=mock`.

## 2. Run Code Gates

```bash
bun run release:validate
```

This runs lint, type-check, unit tests, integration tests, and the production build before you touch Vercel production.

## 3. Push Production Schema

Use the production Turso env file from step 1, then push schema changes before production traffic moves:

```bash
bun run db:push
```

If the release contains no schema changes, still run the command once against production credentials to confirm the connection and Drizzle metadata are healthy.

## 4. Deploy Preview First

Open a PR or push the release branch so Vercel creates a preview deployment, then run the public smoke suite:

```bash
bun run release:smoke -- --base-url https://<preview-deployment>.vercel.app
```

The smoke script checks:
- landing page availability
- `/api/health`
- `/api/auth/nonce`
- retail credential `402` challenge
- paid score query `402` challenge
- enterprise credential verify `402` challenge

## 5. Manual Preview Checks

Do these after the automated smoke passes:
- Connect a real wallet and confirm `/api/auth/nonce` plus SIWE sign-in succeeds.
- Replay the same SIWE message and signature and confirm the second request fails.
- Complete one real retail score unlock: `402 -> verify -> settle -> score payload`.
- Complete one real retail credential purchase: `402 -> verify -> settle -> issue`.
- Complete one real enterprise score query: `402 -> verify -> settle -> response`.
- Confirm invalid input and rate-limited requests do not settle payments.
- Check Turso tables such as `audit_log`, `credit_scores`, and `api_rate_limits` for expected writes.

## 6. Production Deploy

Deploy `main` to Vercel production only after preview passes. Then rerun the same smoke suite against the production origin:

```bash
bun run release:smoke -- --base-url https://<production-domain>
```

Repeat the manual paid checks with production credentials and production payment rails.

## 7. Soft Launch Window

Keep the first 24 hours as a monitored soft launch. Watch:
- Vercel logs for auth, x402 verify, and x402 settle failures
- `401`, `402`, `429`, and `500` rates
- Turso write health and rate-limit growth
- paid score unlock success rate
- credential issuance success rate
- enterprise query success rate

## 8. Rollback

If auth, payment settlement, or database readiness regresses:
- Roll back to the previous stable Vercel deployment immediately.
- Pause external announcement/public traffic until the regression is understood.
- Keep the release env snapshot and the failed smoke output for incident review.
- Only roll back Turso schema separately if the incident is schema-driven and you have a tested reversal path.

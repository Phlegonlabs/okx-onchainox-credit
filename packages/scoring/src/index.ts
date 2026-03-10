// packages/scoring public API — implement during M2
// See: ARCHITECTURE.md → packages/scoring structure

export type {
  CreditAnalysis,
  CreditAnalysisDimension,
  CreditAnalysisDimensions,
  CreditImprovementTip,
  RawWalletData,
  DeFiPositionSnapshot,
  Score,
  ScoreDimensions,
  ScoreTier,
  TokenPriceQuote,
  TokenPriceRequest,
} from './types.js';
export type { CredentialPayload, IssuedCredential } from './credential.js';
export { analyzeWalletCredit, buildCreditAnalysis } from './analysis.js';
export { computeScore } from './scorer.js';
export {
  getCredentialPublicAddress,
  isCredentialPayload,
  parseIssuedCredential,
  serializeCredentialPayload,
  verifyCredentialSignature,
} from './credential.js';
export { getImprovementTips } from './lib/improvement-tips.js';
export { loadRawWalletData } from './lib/wallet-data.js';
export { OkxClient } from './lib/okx-client.js';
export { getWalletScore } from './wallet-score.js';

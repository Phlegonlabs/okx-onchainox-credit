import type { Score, ScoreDimensions, ScoreTier } from '@okx-credit/scoring';

const SCORE_QUERY_ISSUER = 'okx-onchainos-credit';
const SCORE_QUERY_VERSION = '1.0';

export interface ScoreQueryPayload {
  breakdown: ScoreDimensions;
  computedAt: string;
  dataGaps: string[];
  expiresAt: string;
  issuer: typeof SCORE_QUERY_ISSUER;
  score: number;
  stale: boolean;
  tier: ScoreTier;
  version: typeof SCORE_QUERY_VERSION;
  wallet: string;
}

export interface SignedScoreQueryPayload extends ScoreQueryPayload {
  signature: string;
}

export function createScoreQueryPayload(
  wallet: string,
  score: Pick<Score, 'computedAt' | 'dataGaps' | 'dimensions' | 'expiresAt' | 'score' | 'tier'> & {
    stale?: boolean;
  }
): ScoreQueryPayload {
  return {
    breakdown: score.dimensions,
    computedAt: score.computedAt,
    dataGaps: score.dataGaps ?? [],
    expiresAt: score.expiresAt,
    issuer: SCORE_QUERY_ISSUER,
    score: score.score,
    stale: score.stale ?? false,
    tier: score.tier,
    version: SCORE_QUERY_VERSION,
    wallet,
  };
}

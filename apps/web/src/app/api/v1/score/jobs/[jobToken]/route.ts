import {
  advanceScoreJob,
  buildScoreJobSnapshot,
  readScoreJobByToken,
} from '@/lib/credit/score-job-service';
import { NextResponse } from 'next/server';

interface ScoreJobRouteContext {
  params: Promise<{
    jobToken: string;
  }>;
}

export async function GET(request: Request, context: ScoreJobRouteContext) {
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const { jobToken } = await context.params;
  const advancedJob = await advanceScoreJob(jobToken, requestId ? { requestId } : {});
  const job = advancedJob ?? (await readScoreJobByToken(jobToken));

  if (!job) {
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'Score job was not found.',
        },
      },
      { status: 404 }
    );
  }

  return NextResponse.json(buildScoreJobSnapshot(job, jobToken, new URL(request.url).origin));
}

import {
  advanceScoreJob,
  buildScoreJobSnapshot,
  readScoreJobByToken,
} from '@/lib/credit/score-job-service';

const STREAM_WINDOW_MS = 25_000;
const TICK_INTERVAL_MS = 1_000;

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createSseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    },
  });
}

function encodeSseEvent(event: string, payload: unknown): Uint8Array {
  const body = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(body);
}

function resolveEventName(snapshot: ReturnType<typeof buildScoreJobSnapshot>): string {
  if (snapshot.kind === 'completed') {
    return 'completed';
  }

  if (snapshot.kind === 'failed') {
    return 'failed';
  }

  if (snapshot.status === 'retry_wait') {
    return 'retry_wait';
  }

  return snapshot.attemptCount > 0 ? 'progress' : 'accepted';
}

interface ScoreJobEventsRouteContext {
  params: Promise<{
    jobToken: string;
  }>;
}

export async function GET(request: Request, context: ScoreJobEventsRouteContext) {
  const { jobToken } = await context.params;
  const origin = new URL(request.url).origin;
  const requestId = request.headers.get('x-request-id') ?? undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const startedAt = Date.now();
      let lastSerializedSnapshot: string | null = null;

      while (Date.now() - startedAt < STREAM_WINDOW_MS) {
        const advancedJob = await advanceScoreJob(jobToken, requestId ? { requestId } : {});
        const job = advancedJob ?? (await readScoreJobByToken(jobToken));

        if (!job) {
          controller.enqueue(
            encodeSseEvent('failed', {
              error: {
                code: 'NOT_FOUND',
                message: 'Score job was not found.',
              },
              kind: 'failed',
              status: 'failed',
            })
          );
          controller.close();
          return;
        }

        const snapshot = buildScoreJobSnapshot(job, jobToken, origin);
        const serializedSnapshot = JSON.stringify(snapshot);

        if (serializedSnapshot !== lastSerializedSnapshot) {
          controller.enqueue(encodeSseEvent(resolveEventName(snapshot), snapshot));
          lastSerializedSnapshot = serializedSnapshot;
        } else {
          controller.enqueue(encodeSseEvent('heartbeat', { status: job.status }));
        }

        if (job.status === 'completed' || job.status === 'failed') {
          controller.close();
          return;
        }

        await sleep(TICK_INTERVAL_MS);
      }

      controller.enqueue(encodeSseEvent('heartbeat', { reconnect: true }));
      controller.close();
    },
  });

  return createSseResponse(stream);
}

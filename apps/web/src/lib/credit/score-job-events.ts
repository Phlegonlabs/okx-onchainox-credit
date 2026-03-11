import { parseScoreJobSnapshot } from './score-client';
import type { ScoreJobSnapshot } from './score-job-payload';

type ScoreJobListener = (snapshot: ScoreJobSnapshot) => void;

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    cache: 'no-store',
  });

  return response.json();
}

export async function fetchScoreJobSnapshot(statusUrl: string): Promise<ScoreJobSnapshot | null> {
  const payload = await fetchJson(statusUrl);
  return parseScoreJobSnapshot(payload);
}

export function subscribeToScoreJob(
  streamUrl: string,
  listener: ScoreJobListener,
  onDisconnect: () => void
): () => void {
  const source = new EventSource(streamUrl);

  function handleMessage(event: MessageEvent) {
    try {
      const payload = JSON.parse(event.data) as unknown;
      const snapshot = parseScoreJobSnapshot(payload);

      if (snapshot) {
        listener(snapshot);
      }
    } catch {
      // Ignore malformed events and wait for the next snapshot.
    }
  }

  source.addEventListener('accepted', handleMessage);
  source.addEventListener('progress', handleMessage);
  source.addEventListener('retry_wait', handleMessage);
  source.addEventListener('completed', handleMessage);
  source.addEventListener('failed', handleMessage);
  source.onerror = () => {
    source.close();
    onDisconnect();
  };

  return () => {
    source.close();
  };
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchRetry(url: string | URL, init: RequestInit = {}, attempts = 2): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(25_000) });
    if (response.status !== 429 && response.status !== 503) return response;
    last = response;
    await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
  }
  return last ?? new Response(null, { status: 503 });
}

export async function mapPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

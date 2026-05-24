import { describe, expect, it } from 'vitest';
import { requestWithRetry } from '../src/providers/http.js';

describe('requestWithRetry', () => {
  it('retries retryable HTTP responses up to the configured limit', async () => {
    const statuses = [429, 500, 200];
    const fetcher: typeof fetch = async () =>
      new Response('{}', { status: statuses.shift() ?? 200 });

    const response = await requestWithRetry('https://example.com', {}, {
      fetcher,
      maxRetries: 2,
      retryDelayMs: 0,
      timeoutMs: 1_000,
      providerName: 'test',
    });

    expect(response.status).toBe(200);
    expect(statuses).toEqual([]);
  });

  it('does not retry non-retryable HTTP responses', async () => {
    let attempts = 0;
    const fetcher: typeof fetch = async () => {
      attempts += 1;
      return new Response('bad request', { status: 400 });
    };

    const response = await requestWithRetry('https://example.com', {}, {
      fetcher,
      maxRetries: 2,
      retryDelayMs: 0,
      timeoutMs: 1_000,
      providerName: 'test',
    });

    expect(response.status).toBe(400);
    expect(attempts).toBe(1);
  });

  it('aborts requests that exceed the timeout', async () => {
    const fetcher: typeof fetch = async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });

    await expect(
      requestWithRetry('https://example.com', {}, {
        fetcher,
        maxRetries: 0,
        retryDelayMs: 0,
        timeoutMs: 1,
        providerName: 'test',
      }),
    ).rejects.toThrow('test request timed out after 1ms.');
  });
});

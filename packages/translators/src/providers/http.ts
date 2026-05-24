const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 250;

export interface RetryRequestOptions {
  fetcher?: typeof fetch;
  maxRetries?: number;
  providerName: string;
  retryDelayMs?: number;
  timeoutMs?: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
}

function parseNonNegativeInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function readRetryConfig(env: NodeJS.ProcessEnv = process.env): RetryConfig {
  return {
    maxRetries: parseNonNegativeInteger(env.STORE_RELEASE_TRANSLATOR_MAX_RETRIES, DEFAULT_MAX_RETRIES),
    retryDelayMs: parseNonNegativeInteger(
      env.STORE_RELEASE_TRANSLATOR_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS,
    ),
    timeoutMs: parseNonNegativeInteger(env.STORE_RELEASE_TRANSLATOR_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function wait(ms: number): Promise<void> {
  if (ms === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestWithRetry(
  url: string,
  init: RequestInit,
  options: RetryRequestOptions,
): Promise<Response> {
  const fetcher = options.fetcher ?? fetch;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetcher(url, {
        ...init,
        signal: controller.signal,
      });

      if (!isRetryableStatus(response.status) || attempt === maxRetries) {
        return response;
      }
    } catch (error) {
      if (timedOut) {
        throw new Error(`${options.providerName} request timed out after ${timeoutMs}ms.`);
      }

      lastError = error;
      if (attempt === maxRetries) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }

    await wait(retryDelayMs);
  }

  throw lastError instanceof Error ? lastError : new Error(`${options.providerName} request failed.`);
}

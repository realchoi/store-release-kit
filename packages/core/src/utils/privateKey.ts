import { StoreReleaseKitError } from './errors.js';

export function normalizePemPrivateKey(value: string): string {
  return value.includes('\\n') ? value.replaceAll('\\n', '\n') : value;
}

export function readPrivateKeyFromEnv(
  envName: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!envName) {
    throw new StoreReleaseKitError(
      'App Store Connect privateKeyEnv is not configured.',
      'APPSTORE_CONNECT_PRIVATE_KEY_ENV_MISSING',
    );
  }

  const value = env[envName];
  if (!value?.trim()) {
    throw new StoreReleaseKitError(
      `Environment variable ${envName} is not set or empty.`,
      'APPSTORE_CONNECT_PRIVATE_KEY_MISSING',
    );
  }

  return normalizePemPrivateKey(value);
}

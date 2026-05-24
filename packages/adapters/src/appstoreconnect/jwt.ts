import { NotImplementedError } from '@store-release-kit/core';
import type { AppStoreConnectCredentials } from './types.js';

export interface CreateAppStoreConnectJwtInput extends AppStoreConnectCredentials {
  expiresInSeconds?: number;
}

export async function createAppStoreConnectJwt(
  _input: CreateAppStoreConnectJwtInput,
): Promise<string> {
  throw new NotImplementedError(
    'App Store Connect JWT generation is a skeleton. Implement ES256 signing with issuerId, keyId, and private key.',
  );
}

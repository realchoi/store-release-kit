import { importPKCS8, SignJWT } from 'jose';
import type { AppStoreConnectCredentials } from './types.js';

export interface CreateAppStoreConnectJwtInput extends AppStoreConnectCredentials {
  expiresInSeconds?: number;
  now?: Date;
}

export async function createAppStoreConnectJwt(
  input: CreateAppStoreConnectJwtInput,
): Promise<string> {
  const expiresInSeconds = input.expiresInSeconds ?? 19 * 60;

  if (!input.privateKey.trim()) {
    throw new Error('App Store Connect private key must not be empty.');
  }

  if (expiresInSeconds > 20 * 60) {
    throw new Error('App Store Connect JWT expiresInSeconds must not exceed 1200 seconds.');
  }

  const now = Math.floor((input.now?.getTime() ?? Date.now()) / 1000);
  const privateKey = await importPKCS8(input.privateKey, 'ES256');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: input.keyId, typ: 'JWT' })
    .setIssuer(input.issuerId)
    .setAudience('appstoreconnect-v1')
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(privateKey);
}

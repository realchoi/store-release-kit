import { generateKeyPairSync } from 'node:crypto';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import { describe, expect, it } from 'vitest';
import { createAppStoreConnectJwt } from '../src/index.js';

function createPrivateKey(): string {
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  return privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
}

describe('createAppStoreConnectJwt', () => {
  it('generates an ES256 App Store Connect token', async () => {
    const token = await createAppStoreConnectJwt({
      issuerId: 'issuer-id',
      keyId: 'ABC123DEFG',
      privateKey: createPrivateKey(),
      now: new Date('2026-05-24T00:00:00.000Z'),
    });

    expect(decodeProtectedHeader(token)).toMatchObject({
      alg: 'ES256',
      kid: 'ABC123DEFG',
    });
    expect(decodeJwt(token)).toMatchObject({
      iss: 'issuer-id',
      aud: 'appstoreconnect-v1',
      iat: 1_779_580_800,
      exp: 1_779_581_940,
    });
  });

  it('rejects empty private keys and tokens over 20 minutes', async () => {
    await expect(
      createAppStoreConnectJwt({
        issuerId: 'issuer-id',
        keyId: 'ABC123DEFG',
        privateKey: '',
      }),
    ).rejects.toThrow('private key must not be empty');

    await expect(
      createAppStoreConnectJwt({
        issuerId: 'issuer-id',
        keyId: 'ABC123DEFG',
        privateKey: createPrivateKey(),
        expiresInSeconds: 1_201,
      }),
    ).rejects.toThrow('must not exceed 1200 seconds');
  });
});

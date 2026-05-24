import { describe, expect, it } from 'vitest';
import {
  LocaleMetadataSchema,
  ProjectConfigSchema,
  getReleaseSafety,
  normalizePemPrivateKey,
  readPrivateKeyFromEnv,
} from '../src/index.js';

describe('schemas', () => {
  it('parses a valid project config', () => {
    const config = ProjectConfigSchema.parse({
      appId: '1234567890',
      platform: 'ios',
      defaultLocale: 'zh-Hans',
      targetLocales: ['zh-Hans', 'en-US'],
      store: {
        provider: 'appstoreconnect',
        appStoreConnect: {
          issuerId: 'issuer',
          keyId: 'key',
          privateKeyEnv: 'APPSTORE_CONNECT_PRIVATE_KEY',
          appId: 'app-resource-id',
          bundleId: 'com.example.app',
        },
      },
      release: {
        safety: {
          requireDryRunBeforePush: true,
          blockMachineTranslations: true,
          allowPushBranches: ['release'],
        },
      },
      rules: {
        requireReviewBeforePush: true,
        allowMachineTranslation: false,
        maxKeywordsCount: 100,
      },
    });

    expect(config.appId).toBe('1234567890');
    expect(config.targetLocales).toContain('en-US');
    expect(config.store.appStoreConnect?.defaultPlatform).toBe('IOS');
    expect(config.store.appStoreConnect?.timeoutMs).toBe(30_000);
    expect(getReleaseSafety(config)).toMatchObject({
      requireDryRunBeforePush: true,
      blockMachineTranslations: true,
      allowPushBranches: ['release'],
    });
  });

  it('parses locale metadata', () => {
    const metadata = LocaleMetadataSchema.parse({
      locale: 'en-US',
      name: 'Focus Plan',
      keywords: ['focus', 'todo'],
      supportUrl: 'https://example.com/support',
      marketingUrl: 'https://example.com',
      reviewStatus: 'approved',
    });

    expect(metadata.locale).toBe('en-US');
    expect(metadata.keywords).toEqual(['focus', 'todo']);
  });

  it('rejects invalid URLs', () => {
    const result = LocaleMetadataSchema.safeParse({
      locale: 'en-US',
      supportUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('normalizes PEM private keys from environment variables', () => {
    expect(normalizePemPrivateKey('-----BEGIN\\nKEY\\n-----END')).toContain('\nKEY\n');
    expect(readPrivateKeyFromEnv('ASC_KEY', { ASC_KEY: 'pem\\nvalue' })).toBe('pem\nvalue');
    expect(() => readPrivateKeyFromEnv('ASC_KEY', {})).toThrow('ASC_KEY');
  });
});

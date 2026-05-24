import { describe, expect, it } from 'vitest';
import { LocaleMetadataSchema, ProjectConfigSchema } from '../src/index.js';

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
});

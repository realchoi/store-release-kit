import { describe, expect, it } from 'vitest';
import type { ProjectConfig, ReleaseProject } from '@store-release-kit/core';
import { AppStoreConnectAdapter } from '../src/index.js';

function createConfig(): ProjectConfig {
  return {
    appId: 'local-app',
    platform: 'ios',
    defaultLocale: 'zh-Hans',
    targetLocales: ['zh-Hans', 'en-US'],
    store: {
      provider: 'appstoreconnect',
      appStoreConnect: {
        issuerId: 'issuer',
        keyId: 'key',
        privateKeyEnv: 'ASC_PRIVATE_KEY',
        appId: 'asc-app',
        defaultPlatform: 'IOS',
        apiBaseUrl: 'https://api.example.test/v1',
        timeoutMs: 30_000,
      },
    },
    rules: {
      requireReviewBeforePush: true,
      allowMachineTranslation: false,
    },
  };
}

function createProject(): ReleaseProject {
  return {
    config: createConfig(),
    base: {
      version: '2.4.0',
      sourceLocale: 'zh-Hans',
      status: 'ready',
    },
    locales: {
      'zh-Hans': {
        locale: 'zh-Hans',
        description: '中文描述',
        whatsNew: '更新',
        reviewStatus: 'approved',
      },
      'en-US': {
        locale: 'en-US',
        description: 'English description',
        keywords: ['focus'],
        whatsNew: 'Updates',
        reviewStatus: 'approved',
      },
    },
  };
}

function createClient() {
  const writes: string[] = [];

  return {
    writes,
    async listAppStoreVersions() {
      return [
        {
          id: 'version-1',
          type: 'appStoreVersions' as const,
          attributes: {
            versionString: '2.4.0',
            platform: 'IOS' as const,
            appStoreState: 'PREPARE_FOR_SUBMISSION',
          },
        },
      ];
    },
    async listAppStoreVersionLocalizations() {
      return [
        {
          id: 'loc-zh',
          type: 'appStoreVersionLocalizations' as const,
          attributes: { locale: 'zh-Hans' },
        },
      ];
    },
    async createAppStoreVersionLocalization() {
      writes.push('create');
      return {
        id: 'new-loc',
        type: 'appStoreVersionLocalizations' as const,
        attributes: { locale: 'en-US' },
      };
    },
    async updateAppStoreVersionLocalization() {
      writes.push('update');
      return {
        id: 'loc-zh',
        type: 'appStoreVersionLocalizations' as const,
        attributes: { locale: 'zh-Hans' },
      };
    },
  };
}

describe('AppStoreConnectAdapter', () => {
  it('creates a dry-run create/update plan without write calls', async () => {
    process.env.ASC_PRIVATE_KEY = 'unused';
    const client = createClient();
    const adapter = new AppStoreConnectAdapter(client);
    const result = await adapter.pushRelease({ project: createProject(), dryRun: true });

    expect(result.pushed).toBe(false);
    expect(client.writes).toEqual([]);
    expect(result.payload).toMatchObject({
      appId: 'asc-app',
      appStoreVersionId: 'version-1',
      localizations: [
        { action: 'update', locale: 'zh-Hans', localizationId: 'loc-zh' },
        { action: 'create', locale: 'en-US' },
      ],
    });
  });

  it('blocks machine translations and missing editable versions', async () => {
    process.env.ASC_PRIVATE_KEY = 'unused';
    const project = createProject();
    project.locales['en-US']!.reviewStatus = 'machine';
    await expect(
      new AppStoreConnectAdapter(createClient()).pushRelease({ project, dryRun: true }),
    ).rejects.toThrow('MACHINE_TRANSLATION_NOT_REVIEWED');

    const client = createClient();
    client.listAppStoreVersions = async () => [];
    await expect(
      new AppStoreConnectAdapter(client).pullRelease({
        config: createConfig(),
        version: '2.4.0',
      }),
    ).rejects.toThrow('No editable App Store Connect version');
  });
});

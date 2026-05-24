import fs from 'fs-extra';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ReleaseProject } from '@store-release-kit/core';
import { exportFastlaneMetadata, importFastlaneMetadata } from '../src/index.js';

describe('exportFastlaneMetadata', () => {
  it('writes fastlane metadata files and skips missing fields', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'fastlane-metadata-'));
    const project: ReleaseProject = {
      config: {
        appId: '1234567890',
        platform: 'ios',
        defaultLocale: 'zh-Hans',
        targetLocales: ['zh-Hans', 'en-US'],
        store: {
          provider: 'fastlane',
        },
        rules: {
          requireReviewBeforePush: true,
          allowMachineTranslation: false,
        },
      },
      base: {
        version: '2.4.0',
        sourceLocale: 'zh-Hans',
        status: 'ready',
      },
      locales: {
        'en-US': {
          locale: 'en-US',
          name: 'Focus Plan',
          description: 'Focus app description.',
          keywords: ['focus', 'todo'],
          whatsNew: 'New dashboard.',
        },
      },
    };

    const result = await exportFastlaneMetadata({ project, outDir });

    expect(result.files.length).toBe(4);
    await expect(fs.readFile(join(outDir, 'en-US', 'name.txt'), 'utf8')).resolves.toBe(
      'Focus Plan',
    );
    await expect(fs.readFile(join(outDir, 'en-US', 'keywords.txt'), 'utf8')).resolves.toBe(
      'focus,todo',
    );
    expect(await fs.pathExists(join(outDir, 'en-US', 'subtitle.txt'))).toBe(false);
  });

  it('imports fastlane metadata files into locale metadata', async () => {
    const sourceDir = await mkdtemp(join(tmpdir(), 'fastlane-import-'));
    const localeDir = join(sourceDir, 'en-US');
    await fs.ensureDir(localeDir);
    await fs.writeFile(join(localeDir, 'name.txt'), 'Focus Plan', 'utf8');
    await fs.writeFile(join(localeDir, 'subtitle.txt'), 'Focus and todos', 'utf8');
    await fs.writeFile(join(localeDir, 'keywords.txt'), 'focus,todo', 'utf8');
    await fs.writeFile(join(localeDir, 'release_notes.txt'), 'New dashboard.', 'utf8');

    const result = await importFastlaneMetadata({ sourceDir });

    expect(result.locales['en-US']).toEqual({
      locale: 'en-US',
      name: 'Focus Plan',
      subtitle: 'Focus and todos',
      keywords: ['focus', 'todo'],
      whatsNew: 'New dashboard.',
      reviewStatus: 'human-reviewed',
    });
  });
});

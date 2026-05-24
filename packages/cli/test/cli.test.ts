import fs from 'fs-extra';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/index.js';
import { runExportCommand } from '../src/commands/export.js';
import { runInitCommand } from '../src/commands/init.js';
import { runPullCommand } from '../src/commands/pull.js';
import { runTranslateCommand } from '../src/commands/translate.js';
import { runValidateCommand } from '../src/commands/validate.js';

describe('cli', () => {
  it('can output help', () => {
    const help = createProgram().helpInformation();

    expect(help).toContain('store-release');
    expect(help).toContain('validate');
  });

  it('init creates base files in a temporary directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));

    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });

    expect(await fs.pathExists(join(dir, 'store-release.config.yml'))).toBe(true);
    expect(await fs.pathExists(join(dir, 'glossary.yml'))).toBe(true);
    expect(await fs.pathExists(join(dir, 'releases', '0.1.0', 'base.yml'))).toBe(true);
    expect(await fs.pathExists(join(dir, 'releases', '0.1.0', 'locales', 'zh-Hans.yml'))).toBe(
      true,
    );
    expect(await fs.pathExists(join(dir, 'releases', '0.1.0', 'locales', 'en-US.yml'))).toBe(true);
  });

  it('validate can emit JSON reports', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });

    const result = await runValidateCommand(dir, {
      version: '0.1.0',
      json: true,
    });

    expect(result.ok).toBe(true);
    expect(result.report).toContain('"ok": true');
  });

  it('pull imports fastlane metadata into release locale files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    const sourceDir = await mkdtemp(join(tmpdir(), 'fastlane-source-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });

    await fs.ensureDir(join(sourceDir, 'ja'));
    await fs.writeFile(join(sourceDir, 'ja', 'name.txt'), '集中プラン', 'utf8');
    await fs.writeFile(join(sourceDir, 'ja', 'description.txt'), '説明文', 'utf8');
    await fs.writeFile(join(sourceDir, 'ja', 'release_notes.txt'), '更新内容', 'utf8');

    const result = await runPullCommand(dir, {
      version: '0.1.0',
      provider: 'fastlane',
      in: sourceDir,
    });

    expect(result.writtenLocales).toEqual(['ja']);
    await expect(
      fs.readFile(join(dir, 'releases', '0.1.0', 'locales', 'ja.yml'), 'utf8'),
    ).resolves.toContain('name: 集中プラン');
  });

  it('rejects unsupported export formats before loading project files', async () => {
    await expect(
      runExportCommand('/does/not/exist', {
        version: '0.1.0',
        format: 'xml' as never,
      }),
    ).rejects.toThrow('Unsupported export format "xml". Expected one of: fastlane, json.');
  });

  it('rejects unsupported pull providers before loading project files', async () => {
    await expect(
      runPullCommand('/does/not/exist', {
        version: '0.1.0',
        provider: 'deepl' as never,
      }),
    ).rejects.toThrow(
      'Unsupported store provider "deepl". Expected one of: mock, appstoreconnect, fastlane.',
    );
  });

  it('rejects unsupported translate providers before loading project files', async () => {
    await expect(
      runTranslateCommand('/does/not/exist', {
        version: '0.1.0',
        provider: 'fastlane' as never,
      }),
    ).rejects.toThrow('Unsupported translation provider "fastlane". Expected one of: mock, openai, deepl.');
  });
});

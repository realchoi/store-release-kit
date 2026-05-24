import fs from 'fs-extra';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/index.js';
import { runExportCommand } from '../src/commands/export.js';
import { runInitCommand } from '../src/commands/init.js';
import { runPullCommand } from '../src/commands/pull.js';
import { runPushCommand } from '../src/commands/push.js';
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

  it('requires --allow-network for network translation providers', async () => {
    await expect(
      runTranslateCommand('/does/not/exist', {
        version: '0.1.0',
        provider: 'openai',
      }),
    ).rejects.toThrow('requires --allow-network');
  });

  it('translate dry-run does not write files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US,ja',
    });

    const result = await runTranslateCommand(dir, {
      version: '0.1.0',
      provider: 'mock',
      to: 'ja',
      dryRun: true,
    });

    expect(result.generatedLocales).toEqual(['ja']);
    expect(await fs.pathExists(join(dir, 'releases', '0.1.0', 'locales', 'ja.yml'))).toBe(false);
  });

  it('translate respects --fields and skips reviewed locales unless forced', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });

    const skipped = await runTranslateCommand(dir, {
      version: '0.1.0',
      provider: 'mock',
      to: 'en-US',
      fields: 'name',
    });
    expect(skipped.skippedLocales).toEqual(['en-US']);

    await runTranslateCommand(dir, {
      version: '0.1.0',
      provider: 'mock',
      to: 'en-US',
      fields: 'name',
      force: true,
    });

    const content = await fs.readFile(join(dir, 'releases', '0.1.0', 'locales', 'en-US.yml'), 'utf8');
    expect(content).toContain('name: "[en-US] 示例应用"');
    expect(content).toContain('description: This is a sample description');
  });

  it('push defaults to dry-run and writes a dry-run record', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });

    await runPushCommand(dir, {
      version: '0.1.0',
      provider: 'mock',
    });

    await expect(
      fs.readJson(join(dir, '.store-release', 'last-dry-run.json')),
    ).resolves.toMatchObject({
      version: '0.1.0',
      provider: 'mock',
    });
  });

  it('push rejects real push without --yes and stale dry-run records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });

    await expect(
      runPushCommand(dir, {
        version: '0.1.0',
        provider: 'mock',
        dryRun: false,
      }),
    ).rejects.toThrow('真实 push 必须显式传入 --yes');

    await fs.ensureDir(join(dir, '.store-release'));
    await fs.writeJson(join(dir, '.store-release', 'last-dry-run.json'), {
      version: '0.1.0',
      provider: 'mock',
      createdAt: '2026-05-24T00:00:00.000Z',
    });

    await expect(
      runPushCommand(dir, {
        version: '0.1.0',
        provider: 'mock',
        dryRun: false,
        yes: true,
      }),
    ).rejects.toThrow('30 分钟内');
  });

  it('push enforces branch allowlist for real push', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'store-release-kit-'));
    await runInitCommand(dir, {
      appId: '1234567890',
      defaultLocale: 'zh-Hans',
      targetLocales: 'zh-Hans,en-US',
    });
    const configPath = join(dir, 'store-release.config.yml');
    const config = parse(await fs.readFile(configPath, 'utf8')) as Record<string, unknown>;
    config.release = {
      safety: {
        allowPushBranches: ['release'],
      },
    };
    await fs.writeFile(configPath, stringify(config), 'utf8');
    await fs.ensureDir(join(dir, '.store-release'));
    await fs.writeJson(join(dir, '.store-release', 'last-dry-run.json'), {
      version: '0.1.0',
      provider: 'mock',
      createdAt: new Date().toISOString(),
    });

    await expect(
      runPushCommand(dir, {
        version: '0.1.0',
        provider: 'mock',
        dryRun: false,
        yes: true,
      }),
    ).rejects.toThrow('allowPushBranches');
  });
});

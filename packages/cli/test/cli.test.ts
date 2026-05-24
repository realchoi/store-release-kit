import fs from 'fs-extra';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createProgram } from '../src/index.js';
import { runInitCommand } from '../src/commands/init.js';

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
});

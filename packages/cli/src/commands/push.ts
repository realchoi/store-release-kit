import type { Command } from 'commander';
import fs from 'fs-extra';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import {
  formatValidationReport,
  getReleaseSafety,
  loadReleaseProject,
  validateRelease,
} from '@store-release-kit/core';
import { createStoreAdapter, type StoreAdapterName } from '@store-release-kit/adapters';
import { logger } from '../utils/logger.js';
import { parseStoreProvider } from '../utils/options.js';

interface PushOptions {
  version: string;
  provider?: StoreAdapterName;
  dryRun?: boolean;
  yes?: boolean;
}

interface DryRunRecord {
  version: string;
  provider: StoreAdapterName;
  createdAt: string;
}

const DRY_RUN_RECORD_MAX_AGE_MS = 30 * 60 * 1000;
const execFileAsync = promisify(execFile);

export async function runPushCommand(projectDir: string, options: PushOptions): Promise<void> {
  const providerName = parseStoreProvider(options.provider);
  const project = await loadReleaseProject(projectDir, options.version);
  const dryRun = options.dryRun ?? true;

  if (!dryRun && !options.yes) {
    process.exitCode = 1;
    throw new Error('真实 push 必须显式传入 --yes。');
  }

  const validation = validateRelease(project, { strict: true, forPush: true });
  logger.log(formatValidationReport(validation));

  if (!validation.ok) {
    process.exitCode = 1;
    throw new Error('push 被校验规则阻止。请完成人工审核或修复 metadata。');
  }

  if (!dryRun) {
    await assertRealPushSafety(projectDir, providerName, options.version, project.config);
  }

  const adapter = createStoreAdapter(providerName);
  const result = await adapter.pushRelease(
    options.yes === undefined ? { project, dryRun } : { project, dryRun, yes: options.yes },
  );

  if (dryRun) {
    await writeDryRunRecord(projectDir, {
      version: options.version,
      provider: providerName,
      createdAt: new Date().toISOString(),
    });
  }

  logger.info(result.message);
  if (result.payload) {
    logger.log(JSON.stringify(result.payload, null, 2));
  }
}

async function writeDryRunRecord(projectDir: string, record: DryRunRecord): Promise<void> {
  const filePath = join(projectDir, '.store-release', 'last-dry-run.json');
  await fs.ensureDir(join(projectDir, '.store-release'));
  await fs.writeJson(filePath, record, { spaces: 2 });
}

async function readDryRunRecord(projectDir: string): Promise<DryRunRecord | undefined> {
  const filePath = join(projectDir, '.store-release', 'last-dry-run.json');
  if (!(await fs.pathExists(filePath))) {
    return undefined;
  }

  return fs.readJson(filePath) as Promise<DryRunRecord>;
}

async function getCurrentBranch(projectDir: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['branch', '--show-current'], { cwd: projectDir });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function assertRealPushSafety(
  projectDir: string,
  provider: StoreAdapterName,
  version: string,
  config: Awaited<ReturnType<typeof loadReleaseProject>>['config'],
): Promise<void> {
  const safety = getReleaseSafety(config);

  if (safety.requireDryRunBeforePush) {
    const record = await readDryRunRecord(projectDir);
    const createdAt = record ? Date.parse(record.createdAt) : Number.NaN;
    const isFresh = Number.isFinite(createdAt) && Date.now() - createdAt <= DRY_RUN_RECORD_MAX_AGE_MS;

    if (!record || record.version !== version || record.provider !== provider || !isFresh) {
      throw new Error('真实 push 需要 30 分钟内同 version/provider 的 dry-run 记录。');
    }
  }

  if (safety.allowPushBranches.length > 0) {
    const branch = await getCurrentBranch(projectDir);
    if (!branch || !safety.allowPushBranches.includes(branch)) {
      throw new Error(
        `当前分支 ${branch ?? '(unknown)'} 不在 allowPushBranches: ${safety.allowPushBranches.join(', ')}。`,
      );
    }
  }
}

export function registerPushCommand(program: Command): void {
  program
    .command('push')
    .description('Dry-run or submit release metadata through a store provider.')
    .requiredOption('--version <version>', 'Release version')
    .option('--provider <provider>', 'Store provider: mock, appstoreconnect, fastlane', 'mock')
    .option('--dry-run', 'Print payload without submitting', true)
    .option('--no-dry-run', 'Submit metadata to the configured provider')
    .option('--yes', 'Confirm real push when --no-dry-run is used', false)
    .action(async (options: PushOptions) => {
      await runPushCommand(process.cwd(), options);
    });
}

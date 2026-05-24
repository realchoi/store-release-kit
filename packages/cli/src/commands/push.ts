import type { Command } from 'commander';
import { formatValidationReport, loadReleaseProject, validateRelease } from '@store-release-kit/core';
import { createStoreAdapter, type StoreAdapterName } from '@store-release-kit/adapters';
import { logger } from '../utils/logger.js';

interface PushOptions {
  version: string;
  provider?: StoreAdapterName;
  dryRun?: boolean;
  yes?: boolean;
}

export async function runPushCommand(projectDir: string, options: PushOptions): Promise<void> {
  const project = await loadReleaseProject(projectDir, options.version);
  const dryRun = options.dryRun ?? false;

  if (!dryRun) {
    process.exitCode = 1;
    throw new Error('push 默认拒绝直接提交。第一版只允许 --dry-run。');
  }

  const validation = validateRelease(project, { strict: true, forPush: true });
  logger.log(formatValidationReport(validation));

  if (!validation.ok) {
    process.exitCode = 1;
    throw new Error('push 被校验规则阻止。请完成人工审核或修复 metadata。');
  }

  const adapter = createStoreAdapter(options.provider ?? 'mock');
  const result = await adapter.pushRelease(
    options.yes === undefined ? { project, dryRun } : { project, dryRun, yes: options.yes },
  );

  logger.info(result.message);
  if (result.payload) {
    logger.log(JSON.stringify(result.payload, null, 2));
  }
}

export function registerPushCommand(program: Command): void {
  program
    .command('push')
    .description('Dry-run push release metadata. Real push is intentionally disabled in v0.1.')
    .requiredOption('--version <version>', 'Release version')
    .option('--provider <provider>', 'Store provider: mock, appstoreconnect, fastlane', 'mock')
    .option('--dry-run', 'Print payload without submitting', false)
    .option('--yes', 'Reserved confirmation flag for future real push', false)
    .action(async (options: PushOptions) => {
      await runPushCommand(process.cwd(), options);
    });
}

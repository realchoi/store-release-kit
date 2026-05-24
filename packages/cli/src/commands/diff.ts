import type { Command } from 'commander';
import { diffRelease, loadReleaseProject } from '@store-release-kit/core';
import { logger } from '../utils/logger.js';

interface DiffOptions {
  from: string;
  to: string;
  locale?: string;
}

export async function runDiffCommand(projectDir: string, options: DiffOptions): Promise<void> {
  const before = await loadReleaseProject(projectDir, options.from);
  const after = await loadReleaseProject(projectDir, options.to);
  const result = diffRelease(before, after, options.locale ? { locale: options.locale } : {});

  if (result.changes.length === 0) {
    logger.success('没有发现 metadata 差异。');
    return;
  }

  for (const change of result.changes) {
    logger.info(`${change.type.toUpperCase()} ${change.path}`);
    if (change.type !== 'added') {
      logger.log(`  - ${JSON.stringify(change.before)}`);
    }
    if (change.type !== 'removed') {
      logger.log(`  + ${JSON.stringify(change.after)}`);
    }
  }
}

export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('Diff metadata between two local releases.')
    .requiredOption('--from <version>', 'Base release version')
    .requiredOption('--to <version>', 'Target release version')
    .option('--locale <locale>', 'Only diff one locale')
    .action(async (options: DiffOptions) => {
      await runDiffCommand(process.cwd(), options);
    });
}

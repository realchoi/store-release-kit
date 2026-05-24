import type { Command } from 'commander';
import { loadReleaseProject, validateRelease } from '@store-release-kit/core';
import { logger } from '../utils/logger.js';

interface ValidateOptions {
  version: string;
  strict?: boolean;
}

export async function runValidateCommand(
  projectDir: string,
  options: ValidateOptions,
): Promise<void> {
  const project = await loadReleaseProject(projectDir, options.version);
  const result = validateRelease(project, { strict: options.strict ?? false });

  for (const warning of result.warnings) {
    logger.warn(`${warning.code}: ${warning.message}`);
  }

  for (const error of result.errors) {
    logger.error(`${error.code}: ${error.message}`);
  }

  if (!result.ok) {
    process.exitCode = 1;
    throw new Error(`Validation failed with ${result.errors.length} error(s).`);
  }

  logger.success(`Release ${options.version} 校验通过。`);
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate release metadata.')
    .requiredOption('--version <version>', 'Release version')
    .option('--strict', 'Treat missing target locales and descriptions as errors', false)
    .action(async (options: ValidateOptions) => {
      await runValidateCommand(process.cwd(), options);
    });
}

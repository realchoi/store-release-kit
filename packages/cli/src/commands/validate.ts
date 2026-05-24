import type { Command } from 'commander';
import {
  formatValidationReport,
  loadReleaseProject,
  validateRelease,
  type ValidationResult,
} from '@store-release-kit/core';
import { logger } from '../utils/logger.js';

interface ValidateOptions {
  version: string;
  strict?: boolean;
  json?: boolean;
}

interface ValidateCommandResult {
  ok: boolean;
  result: ValidationResult;
  report: string;
}

export async function runValidateCommand(
  projectDir: string,
  options: ValidateOptions,
): Promise<ValidateCommandResult> {
  const project = await loadReleaseProject(projectDir, options.version);
  const result = validateRelease(project, { strict: options.strict ?? false });
  const report = options.json
    ? JSON.stringify(result, null, 2)
    : formatValidationReport(result);

  logger.log(report);

  if (!result.ok) {
    process.exitCode = 1;
    throw new Error(`Validation failed with ${result.errors.length} error(s).`);
  }

  if (!options.json) {
    logger.success(`Release ${options.version} 校验通过。`);
  }

  return {
    ok: result.ok,
    result,
    report,
  };
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate release metadata.')
    .requiredOption('--version <version>', 'Release version')
    .option('--strict', 'Treat missing target locales and descriptions as errors', false)
    .option('--json', 'Output validation result as JSON', false)
    .action(async (options: ValidateOptions) => {
      await runValidateCommand(process.cwd(), options);
    });
}

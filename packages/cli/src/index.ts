import 'dotenv/config';
import { Command } from 'commander';
import { registerDiffCommand } from './commands/diff.js';
import { registerExportCommand } from './commands/export.js';
import { registerInitCommand } from './commands/init.js';
import { registerPullCommand } from './commands/pull.js';
import { registerPushCommand } from './commands/push.js';
import { registerTranslateCommand } from './commands/translate.js';
import { registerValidateCommand } from './commands/validate.js';
import { logger } from './utils/logger.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('store-release')
    .description('GitOps-style App Store release metadata and localization CLI.')
    .version('0.1.0', '--cli-version', 'Output the CLI version.');

  registerInitCommand(program);
  registerValidateCommand(program);
  registerDiffCommand(program);
  registerTranslateCommand(program);
  registerExportCommand(program);
  registerPullCommand(program);
  registerPushCommand(program);

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    process.exitCode = process.exitCode && process.exitCode !== 0 ? process.exitCode : 1;
    logger.error(error instanceof Error ? error.message : String(error));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

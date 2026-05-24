import type { ProjectConfig } from './app.js';

export interface ResolvedReleaseSafety {
  requireReviewedLocales: string[];
  requireDryRunBeforePush: boolean;
  blockMachineTranslations: boolean;
  allowPushBranches: string[];
}

export function getReleaseSafety(config: ProjectConfig): ResolvedReleaseSafety {
  const safety = config.release?.safety ?? {};

  return {
    requireReviewedLocales: safety.requireReviewedLocales ?? [],
    requireDryRunBeforePush: safety.requireDryRunBeforePush ?? true,
    blockMachineTranslations:
      safety.blockMachineTranslations ??
      (config.rules.requireReviewBeforePush && !config.rules.allowMachineTranslation),
    allowPushBranches: safety.allowPushBranches ?? [],
  };
}

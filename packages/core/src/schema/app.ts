import { z } from 'zod';
import { LocaleCodeSchema } from './locale.js';

export const StoreProviderSchema = z.enum(['appstoreconnect', 'fastlane', 'mock']);

export const AppStoreConnectPlatformSchema = z.enum(['IOS', 'MAC_OS', 'TV_OS', 'VISION_OS']);

export const ReleaseSafetySchema = z.object({
  requireReviewedLocales: z.array(LocaleCodeSchema).optional(),
  requireDryRunBeforePush: z.boolean().optional(),
  blockMachineTranslations: z.boolean().optional(),
  allowPushBranches: z.array(z.string().min(1)).optional(),
});

export const ProjectConfigSchema = z.object({
  appId: z.string().min(1, 'appId is required'),
  platform: z.enum(['ios', 'android', 'multi']),
  defaultLocale: LocaleCodeSchema,
  targetLocales: z.array(LocaleCodeSchema).min(1, 'targetLocales must contain at least one locale'),
  store: z.object({
    provider: StoreProviderSchema,
    appStoreConnect: z
      .object({
        issuerId: z.string().min(1).optional(),
        keyId: z.string().min(1).optional(),
        privateKeyEnv: z.string().min(1).optional(),
        appId: z.string().min(1).optional(),
        bundleId: z.string().min(1).optional(),
        defaultPlatform: AppStoreConnectPlatformSchema.default('IOS'),
        apiBaseUrl: z.string().url().default('https://api.appstoreconnect.apple.com/v1'),
        timeoutMs: z.number().int().positive().default(30_000),
      })
      .optional(),
  }),
  release: z
    .object({
      safety: ReleaseSafetySchema.default({}),
    })
    .optional(),
  rules: z.object({
    requireReviewBeforePush: z.boolean().default(true),
    allowMachineTranslation: z.boolean().default(false),
    maxKeywordsCount: z.number().int().positive().optional(),
  }),
});

export type StoreProvider = z.infer<typeof StoreProviderSchema>;
export type AppStoreConnectPlatform = z.infer<typeof AppStoreConnectPlatformSchema>;
export type ReleaseSafety = z.infer<typeof ReleaseSafetySchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

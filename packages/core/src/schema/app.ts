import { z } from 'zod';
import { LocaleCodeSchema } from './locale.js';

export const StoreProviderSchema = z.enum(['appstoreconnect', 'fastlane', 'mock']);

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
      })
      .optional(),
  }),
  rules: z.object({
    requireReviewBeforePush: z.boolean().default(true),
    allowMachineTranslation: z.boolean().default(false),
    maxKeywordsCount: z.number().int().positive().optional(),
  }),
});

export type StoreProvider = z.infer<typeof StoreProviderSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

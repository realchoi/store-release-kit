import { z } from 'zod';
import { LocaleCodeSchema, LocaleMetadataSchema } from './locale.js';
import { ProjectConfigSchema } from './app.js';
import { GlossarySchema } from './glossary.js';

export const ReleaseBaseSchema = z.object({
  version: z.string().min(1, 'version is required'),
  build: z.string().min(1).optional(),
  sourceLocale: LocaleCodeSchema,
  status: z.enum(['draft', 'translated', 'reviewed', 'ready']),
  createdAt: z.string().datetime({ offset: true }).optional(),
  notes: z.array(z.string().min(1)).optional(),
});

export const ReleaseProjectSchema = z.object({
  config: ProjectConfigSchema,
  base: ReleaseBaseSchema,
  locales: z.record(LocaleCodeSchema, LocaleMetadataSchema),
  glossary: GlossarySchema.optional(),
});

export type ReleaseBase = z.infer<typeof ReleaseBaseSchema>;
export type ReleaseProject = z.infer<typeof ReleaseProjectSchema>;

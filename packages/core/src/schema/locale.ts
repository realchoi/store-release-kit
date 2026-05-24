import { z } from 'zod';

export const LocaleCodeSchema = z.string().min(2, 'locale must not be empty');

export const UrlStringSchema = z.string().url('must be a valid URL');

export const LocaleMetadataSchema = z.object({
  locale: LocaleCodeSchema,
  name: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  promotionalText: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  keywords: z.array(z.string().min(1)).optional(),
  whatsNew: z.string().min(1).optional(),
  supportUrl: UrlStringSchema.optional(),
  marketingUrl: UrlStringSchema.optional(),
  reviewStatus: z.enum(['machine', 'human-reviewed', 'approved']).optional(),
  translatorNotes: z.array(z.string().min(1)).optional(),
});

export type LocaleMetadata = z.infer<typeof LocaleMetadataSchema>;

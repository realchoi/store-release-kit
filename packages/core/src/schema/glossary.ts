import { z } from 'zod';

export const GlossaryTermSchema = z.object({
  source: z.string().min(1, 'source term is required'),
  translations: z.record(z.string().min(2), z.string().min(1)),
  locked: z.boolean().optional(),
  note: z.string().min(1).optional(),
});

export const GlossarySchema = z.object({
  terms: z.array(GlossaryTermSchema).default([]),
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;
export type Glossary = z.infer<typeof GlossarySchema>;

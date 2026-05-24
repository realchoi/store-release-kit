import type { LocaleMetadata } from '../schema/locale.js';
import type { ReleaseProject } from '../schema/release.js';

export interface ReleaseDiffChange {
  path: string;
  type: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
}

export interface DiffReleaseOptions {
  locale?: string;
}

export interface ReleaseDiffResult {
  changes: ReleaseDiffChange[];
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function diffObject(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix: string,
): ReleaseDiffChange[] {
  const changes: ReleaseDiffChange[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of [...keys].sort()) {
    const beforeValue = before[key];
    const afterValue = after[key];
    const path = `${prefix}.${key}`;

    if (!(key in before)) {
      changes.push({ path, type: 'added', after: afterValue });
      continue;
    }

    if (!(key in after)) {
      changes.push({ path, type: 'removed', before: beforeValue });
      continue;
    }

    if (!valuesEqual(beforeValue, afterValue)) {
      changes.push({ path, type: 'changed', before: beforeValue, after: afterValue });
    }
  }

  return changes;
}

export function diffRelease(
  before: ReleaseProject,
  after: ReleaseProject,
  options: DiffReleaseOptions = {},
): ReleaseDiffResult {
  const changes: ReleaseDiffChange[] = [];

  changes.push(
    ...diffObject(
      before.base as unknown as Record<string, unknown>,
      after.base as unknown as Record<string, unknown>,
      'base',
    ),
  );

  const locales = options.locale
    ? [options.locale]
    : [...new Set([...Object.keys(before.locales), ...Object.keys(after.locales)])].sort();

  for (const locale of locales) {
    const beforeLocale = before.locales[locale] as LocaleMetadata | undefined;
    const afterLocale = after.locales[locale] as LocaleMetadata | undefined;

    if (!beforeLocale && afterLocale) {
      changes.push({ path: `locales.${locale}`, type: 'added', after: afterLocale });
      continue;
    }

    if (beforeLocale && !afterLocale) {
      changes.push({ path: `locales.${locale}`, type: 'removed', before: beforeLocale });
      continue;
    }

    if (beforeLocale && afterLocale) {
      changes.push(
        ...diffObject(
          beforeLocale as unknown as Record<string, unknown>,
          afterLocale as unknown as Record<string, unknown>,
          `locales.${locale}`,
        ),
      );
    }
  }

  return { changes };
}

import { describe, expect, it } from 'vitest';
import type { ReleaseProject } from '../src/index.js';
import { validateRelease } from '../src/index.js';

function createProject(): ReleaseProject {
  return {
    config: {
      appId: '1234567890',
      platform: 'ios',
      defaultLocale: 'zh-Hans',
      targetLocales: ['zh-Hans', 'en-US'],
      store: {
        provider: 'mock',
      },
      rules: {
        requireReviewBeforePush: true,
        allowMachineTranslation: false,
        maxKeywordsCount: 2,
      },
    },
    base: {
      version: '2.4.0',
      sourceLocale: 'zh-Hans',
      status: 'ready',
    },
    locales: {
      'zh-Hans': {
        locale: 'zh-Hans',
        description: '中文描述',
        keywords: ['专注'],
        whatsNew: '更新说明',
        reviewStatus: 'approved',
      },
    },
    glossary: {
      terms: [],
    },
  };
}

describe('validateRelease', () => {
  it('returns warning for missing target locale in non-strict mode', () => {
    const result = validateRelease(createProject());

    expect(result.ok).toBe(true);
    expect(result.warnings.some((issue) => issue.code === 'TARGET_LOCALE_MISSING')).toBe(true);
  });

  it('returns error for missing target locale in strict mode', () => {
    const result = validateRelease(createProject(), { strict: true });

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'TARGET_LOCALE_MISSING')).toBe(true);
  });

  it('blocks machine translation before push', () => {
    const project = createProject();
    project.locales['en-US'] = {
      locale: 'en-US',
      description: 'Description',
      whatsNew: 'Release notes',
      reviewStatus: 'machine',
    };

    const result = validateRelease(project, { strict: true, forPush: true });

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'MACHINE_TRANSLATION_NOT_REVIEWED')).toBe(
      true,
    );
  });

  it('returns error when keywords exceed max count', () => {
    const project = createProject();
    project.locales['zh-Hans'] = {
      ...project.locales['zh-Hans']!,
      keywords: ['a', 'b', 'c'],
    };

    const result = validateRelease(project);

    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.code === 'KEYWORDS_TOO_MANY')).toBe(true);
  });
});

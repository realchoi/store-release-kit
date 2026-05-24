import type { LocaleMetadata } from '../schema/locale.js';
import type { ReleaseProject } from '../schema/release.js';
import {
  APP_STORE_PROMOTIONAL_TEXT_MAX_LENGTH,
  createValidationResult,
  DEFAULT_MAX_KEYWORDS_COUNT,
  type ValidateReleaseOptions,
  type ValidationIssue,
  type ValidationResult,
} from './rules.js';

interface ValidationContext {
  project: ReleaseProject;
  strict: boolean;
  forPush: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  maxKeywordsCount: number;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function addMissingDescriptionIssue(
  locale: string,
  metadata: LocaleMetadata,
  strict: boolean,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  if (metadata.description) {
    return;
  }

  const issue: ValidationIssue = {
    code: 'DESCRIPTION_MISSING',
    message: `Locale ${locale} should include description.`,
    path: `locales.${locale}.description`,
    locale,
  };

  if (strict) {
    errors.push(issue);
    return;
  }

  warnings.push(issue);
}

function addStrictIssue(context: ValidationContext, issue: ValidationIssue): void {
  if (context.strict) {
    context.errors.push(issue);
    return;
  }

  context.warnings.push(issue);
}

function validateConfiguredLocales(context: ValidationContext): void {
  const { project } = context;

  if (!project.locales[project.config.defaultLocale]) {
    context.errors.push({
      code: 'DEFAULT_LOCALE_MISSING',
      message: `Default locale ${project.config.defaultLocale} is missing.`,
      path: `locales.${project.config.defaultLocale}`,
      locale: project.config.defaultLocale,
    });
  }

  for (const targetLocale of project.config.targetLocales) {
    if (project.locales[targetLocale]) {
      continue;
    }

    const issue: ValidationIssue = {
      code: 'TARGET_LOCALE_MISSING',
      message: `Target locale ${targetLocale} is missing.`,
      path: `locales.${targetLocale}`,
      locale: targetLocale,
    };

    addStrictIssue(context, issue);
  }
}

function validateLocaleIdentity(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  const { project } = context;

  if (metadata.locale !== localeName) {
    context.errors.push({
      code: 'LOCALE_FILENAME_MISMATCH',
      message: `Locale file ${localeName} declares locale ${metadata.locale}.`,
      path: `locales.${localeName}.locale`,
      locale: localeName,
    });
  }

  if (!project.config.targetLocales.includes(metadata.locale)) {
    context.warnings.push({
      code: 'LOCALE_NOT_TARGETED',
      message: `Locale ${metadata.locale} is not listed in targetLocales.`,
      path: `locales.${localeName}`,
      locale: metadata.locale,
    });
  }
}

function validateKeywords(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  if (!metadata.keywords || metadata.keywords.length <= context.maxKeywordsCount) {
    return;
  }

  context.errors.push({
    code: 'KEYWORDS_TOO_MANY',
    message: `Locale ${localeName} has ${metadata.keywords.length} keywords; max is ${context.maxKeywordsCount}.`,
    path: `locales.${localeName}.keywords`,
    locale: localeName,
  });
}

function validateUrls(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  if (metadata.supportUrl && !isValidUrl(metadata.supportUrl)) {
    context.errors.push({
      code: 'SUPPORT_URL_INVALID',
      message: `Locale ${localeName} supportUrl is not a valid URL.`,
      path: `locales.${localeName}.supportUrl`,
      locale: localeName,
    });
  }

  if (metadata.marketingUrl && !isValidUrl(metadata.marketingUrl)) {
    context.errors.push({
      code: 'MARKETING_URL_INVALID',
      message: `Locale ${localeName} marketingUrl is not a valid URL.`,
      path: `locales.${localeName}.marketingUrl`,
      locale: localeName,
    });
  }
}

function validatePushReviewState(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  const { project } = context;
  const blocksMachineTranslation =
    context.forPush &&
    project.config.rules.requireReviewBeforePush &&
    !project.config.rules.allowMachineTranslation &&
    metadata.reviewStatus === 'machine';

  if (!blocksMachineTranslation) {
    return;
  }

  context.errors.push({
    code: 'MACHINE_TRANSLATION_NOT_REVIEWED',
    message: `Locale ${localeName} is machine translated and must be reviewed before push.`,
    path: `locales.${localeName}.reviewStatus`,
    locale: localeName,
  });
}

function validateRequiredContent(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  if (context.project.base.status !== 'draft' && !metadata.whatsNew) {
    context.errors.push({
      code: 'WHATS_NEW_MISSING',
      message: `Locale ${localeName} must include whatsNew unless release status is draft.`,
      path: `locales.${localeName}.whatsNew`,
      locale: localeName,
    });
  }

  addMissingDescriptionIssue(
    localeName,
    metadata,
    context.strict,
    context.errors,
    context.warnings,
  );
}

function validatePromotionalText(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  if (
    !metadata.promotionalText ||
    metadata.promotionalText.length <= APP_STORE_PROMOTIONAL_TEXT_MAX_LENGTH
  ) {
    return;
  }

  context.warnings.push({
    code: 'PROMOTIONAL_TEXT_LENGTH_TODO',
    message: 'TODO: enforce platform-specific promotionalText max length with per-store rules.',
    path: `locales.${localeName}.promotionalText`,
    locale: localeName,
  });
}

function validateLocale(
  context: ValidationContext,
  localeName: string,
  metadata: LocaleMetadata,
): void {
  validateLocaleIdentity(context, localeName, metadata);
  validateKeywords(context, localeName, metadata);
  validateUrls(context, localeName, metadata);
  validatePushReviewState(context, localeName, metadata);
  validateRequiredContent(context, localeName, metadata);
  validatePromotionalText(context, localeName, metadata);
}

export function validateRelease(
  project: ReleaseProject,
  options: ValidateReleaseOptions = {},
): ValidationResult {
  const context: ValidationContext = {
    project,
    strict: options.strict ?? false,
    forPush: options.forPush ?? false,
    errors: [],
    warnings: [],
    maxKeywordsCount: project.config.rules.maxKeywordsCount ?? DEFAULT_MAX_KEYWORDS_COUNT,
  };

  validateConfiguredLocales(context);

  for (const [localeName, metadata] of Object.entries(project.locales)) {
    validateLocale(context, localeName, metadata);
  }

  return createValidationResult(context.errors, context.warnings);
}

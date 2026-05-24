import type { LocaleMetadata, ReleaseProject } from '@store-release-kit/core';
import type {
  AppStoreConnectLocalizationAttributes,
  AppStoreConnectPushPlan,
} from './types.js';

function assignIfDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

export function mapLocaleToAppStoreConnectAttributes(
  metadata: LocaleMetadata,
): AppStoreConnectLocalizationAttributes {
  const attributes: AppStoreConnectLocalizationAttributes = {
    locale: metadata.locale,
  };

  assignIfDefined(attributes, 'name', metadata.name);
  assignIfDefined(attributes, 'subtitle', metadata.subtitle);
  assignIfDefined(attributes, 'promotionalText', metadata.promotionalText);
  assignIfDefined(attributes, 'description', metadata.description);
  assignIfDefined(attributes, 'keywords', metadata.keywords?.join(','));
  assignIfDefined(attributes, 'whatsNew', metadata.whatsNew);
  assignIfDefined(attributes, 'supportUrl', metadata.supportUrl);
  assignIfDefined(attributes, 'marketingUrl', metadata.marketingUrl);

  return attributes;
}

export function mapAppStoreConnectAttributesToLocale(
  attributes: AppStoreConnectLocalizationAttributes,
): LocaleMetadata {
  return {
    locale: attributes.locale,
    ...(attributes.name !== undefined ? { name: attributes.name } : {}),
    ...(attributes.subtitle !== undefined ? { subtitle: attributes.subtitle } : {}),
    ...(attributes.promotionalText !== undefined
      ? { promotionalText: attributes.promotionalText }
      : {}),
    ...(attributes.description !== undefined ? { description: attributes.description } : {}),
    ...(attributes.keywords !== undefined
      ? {
          keywords: attributes.keywords
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        }
      : {}),
    ...(attributes.whatsNew !== undefined ? { whatsNew: attributes.whatsNew } : {}),
    ...(attributes.supportUrl !== undefined ? { supportUrl: attributes.supportUrl } : {}),
    ...(attributes.marketingUrl !== undefined ? { marketingUrl: attributes.marketingUrl } : {}),
    reviewStatus: 'human-reviewed',
  };
}

export function mapReleaseToAppStoreConnectPayload(
  project: ReleaseProject,
): Omit<AppStoreConnectPushPlan, 'appStoreVersionId' | 'dryRun'> {
  return {
    appId: project.config.appId,
    version: project.base.version,
    localizations: Object.values(project.locales).map((metadata) => ({
      action: 'create',
      locale: metadata.locale,
      attributes: mapLocaleToAppStoreConnectAttributes(metadata),
    })),
  };
}

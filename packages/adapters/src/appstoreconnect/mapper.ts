import type { LocaleMetadata, ReleaseProject } from '@store-release-kit/core';
import type { AppStoreConnectLocalePayload, AppStoreConnectReleasePayload } from './types.js';

export function mapLocaleToAppStoreConnectPayload(
  metadata: LocaleMetadata,
): AppStoreConnectLocalePayload {
  const payload: AppStoreConnectLocalePayload = {
    locale: metadata.locale,
  };

  if (metadata.name) payload.name = metadata.name;
  if (metadata.subtitle) payload.subtitle = metadata.subtitle;
  if (metadata.promotionalText) payload.promotionalText = metadata.promotionalText;
  if (metadata.description) payload.description = metadata.description;
  if (metadata.keywords?.length) payload.keywords = metadata.keywords.join(',');
  if (metadata.whatsNew) payload.whatsNew = metadata.whatsNew;
  if (metadata.supportUrl) payload.supportUrl = metadata.supportUrl;
  if (metadata.marketingUrl) payload.marketingUrl = metadata.marketingUrl;

  return payload;
}

export function mapReleaseToAppStoreConnectPayload(
  project: ReleaseProject,
): AppStoreConnectReleasePayload {
  return {
    appId: project.config.appId,
    version: project.base.version,
    locales: Object.values(project.locales).map(mapLocaleToAppStoreConnectPayload),
  };
}

export interface AppStoreConnectCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

export type AppStoreConnectPlatform = 'IOS' | 'MAC_OS' | 'TV_OS' | 'VISION_OS';

export interface AppStoreConnectVersionAttributes {
  versionString: string;
  platform: AppStoreConnectPlatform;
  appStoreState?: string;
}

export interface AppStoreConnectVersionResource {
  id: string;
  type: 'appStoreVersions';
  attributes: AppStoreConnectVersionAttributes;
}

export interface AppStoreConnectLocalizationAttributes {
  locale: string;
  name?: string;
  subtitle?: string;
  promotionalText?: string;
  description?: string;
  keywords?: string;
  whatsNew?: string;
  supportUrl?: string;
  marketingUrl?: string;
}

export interface AppStoreConnectLocalizationResource {
  id: string;
  type: 'appStoreVersionLocalizations';
  attributes: AppStoreConnectLocalizationAttributes;
}

export interface AppStoreConnectJsonApiList<T> {
  data: T[];
}

export interface AppStoreConnectJsonApiItem<T> {
  data: T;
}

export interface AppStoreConnectLocalizationPlanItem {
  action: 'create' | 'update';
  locale: string;
  localizationId?: string;
  attributes: AppStoreConnectLocalizationAttributes;
}

export interface AppStoreConnectPushPlan {
  appId: string;
  version: string;
  appStoreVersionId: string;
  dryRun: boolean;
  localizations: AppStoreConnectLocalizationPlanItem[];
}

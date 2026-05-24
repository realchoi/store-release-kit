export interface AppStoreConnectCredentials {
  issuerId: string;
  keyId: string;
  privateKey: string;
}

export interface AppStoreConnectLocalePayload {
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

export interface AppStoreConnectReleasePayload {
  appId: string;
  version: string;
  locales: AppStoreConnectLocalePayload[];
}

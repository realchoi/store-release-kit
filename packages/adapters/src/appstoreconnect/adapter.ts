import {
  formatValidationReport,
  getReleaseSafety,
  readPrivateKeyFromEnv,
  validateRelease,
  type LocaleMetadata,
} from '@store-release-kit/core';
import type {
  PullReleaseInput,
  PullReleaseResult,
  PushReleaseInput,
  PushReleaseResult,
  StoreAdapter,
} from '../types.js';
import { AppStoreConnectClient } from './client.js';
import {
  mapAppStoreConnectAttributesToLocale,
  mapLocaleToAppStoreConnectAttributes,
} from './mapper.js';
import type {
  AppStoreConnectLocalizationPlanItem,
  AppStoreConnectLocalizationResource,
  AppStoreConnectPlatform,
  AppStoreConnectPushPlan,
  AppStoreConnectVersionResource,
} from './types.js';

const EDITABLE_VERSION_STATE = 'PREPARE_FOR_SUBMISSION';

interface AppStoreConnectClientLike {
  listAppStoreVersions(input: {
    appId: string;
    version: string;
    platform?: AppStoreConnectPlatform;
  }): Promise<AppStoreConnectVersionResource[]>;
  listAppStoreVersionLocalizations(
    appStoreVersionId: string,
  ): Promise<AppStoreConnectLocalizationResource[]>;
  createAppStoreVersionLocalization(
    appStoreVersionId: string,
    attributes: AppStoreConnectLocalizationResource['attributes'],
  ): Promise<AppStoreConnectLocalizationResource>;
  updateAppStoreVersionLocalization(
    localizationId: string,
    attributes: AppStoreConnectLocalizationResource['attributes'],
  ): Promise<AppStoreConnectLocalizationResource>;
}

export class AppStoreConnectAdapter implements StoreAdapter {
  name = 'appstoreconnect' as const;

  constructor(private readonly client?: AppStoreConnectClientLike) {}

  async pullRelease(input: PullReleaseInput): Promise<PullReleaseResult> {
    const settings = getAppStoreConnectSettings(input.config);
    const client = this.client ?? createClientFromSettings(settings);
    const version = await findEditableVersion(client, {
      appId: settings.appId,
      version: input.version,
      platform: settings.defaultPlatform,
    });
    const localizations = await client.listAppStoreVersionLocalizations(version.id);
    const locales = Object.fromEntries(
      localizations.map((localization) => [
        localization.attributes.locale,
        mapAppStoreConnectAttributesToLocale(localization.attributes),
      ]),
    );

    return {
      message: `Pulled ${localizations.length} App Store Connect localization(s) for ${input.version}.`,
      release: {
        config: input.config,
        base: {
          version: input.version,
          sourceLocale: input.config.defaultLocale,
          status: 'draft',
        },
        locales,
      },
    };
  }

  async pushRelease(input: PushReleaseInput): Promise<PushReleaseResult> {
    assertPushAllowed(input);

    const settings = getAppStoreConnectSettings(input.project.config);
    const client = this.client ?? createClientFromSettings(settings);
    const version = await findEditableVersion(client, {
      appId: settings.appId,
      version: input.project.base.version,
      platform: settings.defaultPlatform,
    });
    const remoteLocalizations = await client.listAppStoreVersionLocalizations(version.id);
    const plan = createPushPlan(
      settings.appId,
      input.project.base.version,
      version.id,
      input.dryRun,
      Object.values(input.project.locales),
      remoteLocalizations,
    );

    if (input.dryRun) {
      return {
        pushed: false,
        message: 'App Store Connect dry-run completed. No remote localization was changed.',
        payload: plan,
      };
    }

    for (const item of plan.localizations) {
      if (item.action === 'create') {
        await client.createAppStoreVersionLocalization(plan.appStoreVersionId, item.attributes);
      } else if (item.localizationId) {
        await client.updateAppStoreVersionLocalization(item.localizationId, item.attributes);
      }
    }

    return {
      pushed: true,
      message: `Pushed ${plan.localizations.length} App Store Connect localization change(s).`,
      payload: plan,
    };
  }
}

function getAppStoreConnectSettings(config: PullReleaseInput['config']): {
  issuerId: string;
  keyId: string;
  privateKey: string;
  appId: string;
  defaultPlatform: AppStoreConnectPlatform;
  apiBaseUrl: string;
  timeoutMs: number;
} {
  const settings = config.store.appStoreConnect;
  if (!settings?.issuerId || !settings.keyId) {
    throw new Error('App Store Connect issuerId and keyId must be configured.');
  }

  return {
    issuerId: settings.issuerId,
    keyId: settings.keyId,
    privateKey: readPrivateKeyFromEnv(settings.privateKeyEnv),
    appId: settings.appId ?? config.appId,
    defaultPlatform: settings.defaultPlatform,
    apiBaseUrl: settings.apiBaseUrl,
    timeoutMs: settings.timeoutMs,
  };
}

function createClientFromSettings(settings: ReturnType<typeof getAppStoreConnectSettings>) {
  return new AppStoreConnectClient({
    issuerId: settings.issuerId,
    keyId: settings.keyId,
    privateKey: settings.privateKey,
    apiBaseUrl: settings.apiBaseUrl,
    timeoutMs: settings.timeoutMs,
  });
}

async function findEditableVersion(
  client: AppStoreConnectClientLike,
  input: { appId: string; version: string; platform: AppStoreConnectPlatform },
): Promise<AppStoreConnectVersionResource> {
  const versions = await client.listAppStoreVersions(input);
  const editable = versions.find(
    (version) => version.attributes.appStoreState === EDITABLE_VERSION_STATE,
  );

  if (!editable) {
    throw new Error(
      `No editable App Store Connect version ${input.version} for ${input.platform}. Expected ${EDITABLE_VERSION_STATE}.`,
    );
  }

  return editable;
}

function createPushPlan(
  appId: string,
  version: string,
  appStoreVersionId: string,
  dryRun: boolean,
  locales: LocaleMetadata[],
  remoteLocalizations: AppStoreConnectLocalizationResource[],
): AppStoreConnectPushPlan {
  const byLocale = new Map(
    remoteLocalizations.map((localization) => [localization.attributes.locale, localization]),
  );
  const localizations: AppStoreConnectLocalizationPlanItem[] = locales.map((metadata) => {
    const existing = byLocale.get(metadata.locale);

    return {
      action: existing ? 'update' : 'create',
      locale: metadata.locale,
      ...(existing ? { localizationId: existing.id } : {}),
      attributes: mapLocaleToAppStoreConnectAttributes(metadata),
    };
  });

  return {
    appId,
    version,
    appStoreVersionId,
    dryRun,
    localizations,
  };
}

function assertPushAllowed(input: PushReleaseInput): void {
  if (!input.dryRun && !input.yes) {
    throw new Error('Real App Store Connect push requires --yes.');
  }

  const validation = validateRelease(input.project, { forPush: true, strict: true });
  if (!validation.ok) {
    throw new Error(`Push blocked by validation:\n${formatValidationReport(validation)}`);
  }

  const safety = getReleaseSafety(input.project.config);
  const reviewedLocales = new Set(safety.requireReviewedLocales);
  for (const locale of reviewedLocales) {
    const metadata = input.project.locales[locale];
    if (!metadata || metadata.reviewStatus === 'machine') {
      throw new Error(`Locale ${locale} must be reviewed before App Store Connect push.`);
    }
  }
}

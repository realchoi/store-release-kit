import { createAppStoreConnectJwt } from './jwt.js';
import type {
  AppStoreConnectCredentials,
  AppStoreConnectJsonApiItem,
  AppStoreConnectJsonApiList,
  AppStoreConnectLocalizationAttributes,
  AppStoreConnectLocalizationResource,
  AppStoreConnectPlatform,
  AppStoreConnectVersionResource,
} from './types.js';

export class AppStoreConnectApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId: string | undefined,
    readonly body: string,
  ) {
    super(message);
    this.name = 'AppStoreConnectApiError';
  }
}

export interface AppStoreConnectClientOptions extends AppStoreConnectCredentials {
  apiBaseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  tokenFactory?: () => Promise<string>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  query?: Record<string, string | undefined>;
  body?: unknown;
}

export class AppStoreConnectClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenFactory: () => Promise<string>;

  constructor(options: AppStoreConnectClientOptions) {
    this.baseUrl = options.apiBaseUrl ?? 'https://api.appstoreconnect.apple.com/v1';
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.tokenFactory =
      options.tokenFactory ??
      (() =>
        createAppStoreConnectJwt({
          issuerId: options.issuerId,
          keyId: options.keyId,
          privateKey: options.privateKey,
        }));
  }

  async listAppStoreVersions(input: {
    appId: string;
    version: string;
    platform?: AppStoreConnectPlatform;
  }): Promise<AppStoreConnectVersionResource[]> {
    const response = await this.request<AppStoreConnectJsonApiList<AppStoreConnectVersionResource>>(
      '/appStoreVersions',
      {
        query: {
          'filter[app]': input.appId,
          'filter[versionString]': input.version,
          ...(input.platform ? { 'filter[platform]': input.platform } : {}),
        },
      },
    );

    return response.data;
  }

  async listAppStoreVersionLocalizations(
    appStoreVersionId: string,
  ): Promise<AppStoreConnectLocalizationResource[]> {
    const response = await this.request<
      AppStoreConnectJsonApiList<AppStoreConnectLocalizationResource>
    >(`/appStoreVersions/${appStoreVersionId}/appStoreVersionLocalizations`);

    return response.data;
  }

  async createAppStoreVersionLocalization(
    appStoreVersionId: string,
    attributes: AppStoreConnectLocalizationAttributes,
  ): Promise<AppStoreConnectLocalizationResource> {
    const response = await this.request<
      AppStoreConnectJsonApiItem<AppStoreConnectLocalizationResource>
    >('/appStoreVersionLocalizations', {
      method: 'POST',
      body: {
        data: {
          type: 'appStoreVersionLocalizations',
          attributes,
          relationships: {
            appStoreVersion: {
              data: {
                type: 'appStoreVersions',
                id: appStoreVersionId,
              },
            },
          },
        },
      },
    });

    return response.data;
  }

  async updateAppStoreVersionLocalization(
    localizationId: string,
    attributes: AppStoreConnectLocalizationAttributes,
  ): Promise<AppStoreConnectLocalizationResource> {
    const response = await this.request<
      AppStoreConnectJsonApiItem<AppStoreConnectLocalizationResource>
    >(`/appStoreVersionLocalizations/${localizationId}`, {
      method: 'PATCH',
      body: {
        data: {
          type: 'appStoreVersionLocalizations',
          id: localizationId,
          attributes,
        },
      },
    });

    return response.data;
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}${path}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const token = await this.tokenFactory();

    try {
      const response = await this.fetchImpl(this.buildUrl(path, options.query), {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
      const bodyText = await response.text();

      if (!response.ok) {
        const requestId = response.headers.get('x-request-id') ?? undefined;
        throw new AppStoreConnectApiError(
          `App Store Connect API request failed with HTTP ${response.status}.`,
          response.status,
          requestId,
          bodyText,
        );
      }

      return (bodyText ? JSON.parse(bodyText) : {}) as T;
    } catch (error) {
      if (error instanceof AppStoreConnectApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`App Store Connect API request timed out after ${this.timeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

import { describe, expect, it } from 'vitest';
import { AppStoreConnectClient, type AppStoreConnectApiError } from '../src/index.js';

describe('AppStoreConnectClient', () => {
  it('sends Authorization, query params, and JSON API POST/PATCH bodies', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init: init ?? {} });

      if (String(url).includes('/appStoreVersions?')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          data: {
            id: 'loc-1',
            type: 'appStoreVersionLocalizations',
            attributes: { locale: 'en-US' },
          },
        }),
        { status: 200 },
      );
    };
    const client = new AppStoreConnectClient({
      issuerId: 'issuer',
      keyId: 'key',
      privateKey: 'unused',
      tokenFactory: async () => 'jwt-token',
      apiBaseUrl: 'https://api.example.test/v1',
      fetchImpl,
    });

    await client.listAppStoreVersions({
      appId: 'app-1',
      version: '2.4.0',
      platform: 'IOS',
    });
    await client.createAppStoreVersionLocalization('version-1', {
      locale: 'en-US',
      name: 'Focus Plan',
    });
    await client.updateAppStoreVersionLocalization('loc-1', {
      locale: 'en-US',
      subtitle: 'Focus',
    });

    expect(requests[0]?.url).toContain('filter%5Bapp%5D=app-1');
    expect(requests[0]?.url).toContain('filter%5BversionString%5D=2.4.0');
    expect(requests[0]?.init.headers).toMatchObject({
      Authorization: 'Bearer jwt-token',
    });
    expect(JSON.parse(String(requests[1]?.init.body))).toMatchObject({
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'en-US', name: 'Focus Plan' },
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: 'version-1' },
          },
        },
      },
    });
    expect(requests[2]?.init.method).toBe('PATCH');
    expect(JSON.parse(String(requests[2]?.init.body))).toMatchObject({
      data: {
        id: 'loc-1',
        attributes: { locale: 'en-US', subtitle: 'Focus' },
      },
    });
  });

  it('throws AppStoreConnectApiError with request id for non-2xx responses', async () => {
    const client = new AppStoreConnectClient({
      issuerId: 'issuer',
      keyId: 'key',
      privateKey: 'unused',
      tokenFactory: async () => 'jwt-token',
      fetchImpl: async () =>
        new Response('bad request', {
          status: 400,
          headers: { 'x-request-id': 'request-1' },
        }),
    });

    await expect(client.listAppStoreVersions({ appId: 'app-1', version: '2.4.0' })).rejects.toMatchObject({
      status: 400,
      requestId: 'request-1',
      body: 'bad request',
    } satisfies Partial<AppStoreConnectApiError>);
  });
});

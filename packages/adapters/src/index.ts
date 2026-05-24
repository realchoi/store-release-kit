export * from './types.js';
export * from './fastlane/exportMetadata.js';
export * from './fastlane/importMetadata.js';
export * from './appstoreconnect/client.js';
export * from './appstoreconnect/jwt.js';
export * from './appstoreconnect/mapper.js';
export * from './appstoreconnect/types.js';

import { NotImplementedError, validateRelease } from '@store-release-kit/core';
import { exportFastlaneMetadata } from './fastlane/exportMetadata.js';
import type {
  ExportReleaseInput,
  ExportReleaseResult,
  PullReleaseInput,
  PullReleaseResult,
  PushReleaseInput,
  PushReleaseResult,
  StoreAdapter,
  StoreAdapterName,
} from './types.js';

export class MockAdapter implements StoreAdapter {
  name = 'mock' as const;

  async pullRelease(input: PullReleaseInput): Promise<PullReleaseResult> {
    return {
      message: `Mock pull for ${input.config.appId} ${input.version}. No remote data was fetched.`,
    };
  }

  async pushRelease(input: PushReleaseInput): Promise<PushReleaseResult> {
    if (!input.dryRun) {
      throw new NotImplementedError('Mock push only supports dry-run in the first release.');
    }

    return {
      pushed: false,
      message: 'Mock dry-run completed. No remote data was changed.',
      payload: {
        appId: input.project.config.appId,
        version: input.project.base.version,
        locales: Object.keys(input.project.locales),
      },
    };
  }
}

export class FastlaneAdapter implements StoreAdapter {
  name = 'fastlane' as const;

  async pullRelease(_input: PullReleaseInput): Promise<PullReleaseResult> {
    throw new NotImplementedError('Fastlane pull/import is not implemented in the first release.');
  }

  async pushRelease(input: PushReleaseInput): Promise<PushReleaseResult> {
    if (!input.dryRun) {
      throw new NotImplementedError('Fastlane push is not implemented. Use export instead.');
    }

    return {
      pushed: false,
      message: 'Fastlane adapter dry-run completed. Use export to generate metadata files.',
    };
  }

  async exportRelease(input: ExportReleaseInput): Promise<ExportReleaseResult> {
    if (input.format !== 'fastlane') {
      throw new NotImplementedError('Fastlane adapter only exports fastlane format.');
    }

    return exportFastlaneMetadata(input);
  }
}

export class AppStoreConnectAdapter implements StoreAdapter {
  name = 'appstoreconnect' as const;

  async pullRelease(_input: PullReleaseInput): Promise<PullReleaseResult> {
    throw new NotImplementedError(
      'App Store Connect pull is a skeleton and does not call the API yet.',
    );
  }

  async pushRelease(input: PushReleaseInput): Promise<PushReleaseResult> {
    const validation = validateRelease(input.project, { forPush: true, strict: true });
    if (!validation.ok) {
      return {
        pushed: false,
        message: `Push blocked by validation: ${validation.errors.map((issue) => issue.message).join('; ')}`,
      };
    }

    if (!input.dryRun) {
      throw new NotImplementedError(
        'App Store Connect push is a skeleton and does not call the API yet.',
      );
    }

    return {
      pushed: false,
      message: 'App Store Connect dry-run completed. No API call was made.',
    };
  }
}

export function createStoreAdapter(name: StoreAdapterName): StoreAdapter {
  switch (name) {
    case 'mock':
      return new MockAdapter();
    case 'fastlane':
      return new FastlaneAdapter();
    case 'appstoreconnect':
      return new AppStoreConnectAdapter();
  }
}

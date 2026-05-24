import { NotImplementedError } from '@store-release-kit/core';
import type {
  PullReleaseInput,
  PullReleaseResult,
  PushReleaseInput,
  PushReleaseResult,
} from '../types.js';

export class AppStoreConnectClient {
  constructor(
    private readonly tokenFactory: () => Promise<string>,
    private readonly baseUrl = 'https://api.appstoreconnect.apple.com/v1',
  ) {}

  async pullRelease(_input: PullReleaseInput): Promise<PullReleaseResult> {
    await this.tokenFactory();
    throw new NotImplementedError(
      `App Store Connect pull is not implemented yet. Base URL reserved: ${this.baseUrl}`,
    );
  }

  async pushRelease(_input: PushReleaseInput): Promise<PushReleaseResult> {
    await this.tokenFactory();
    throw new NotImplementedError(
      `App Store Connect push is not implemented yet. Base URL reserved: ${this.baseUrl}`,
    );
  }
}

import type {
  LocaleMetadata,
  ProjectConfig,
  ReleaseBase,
  ReleaseProject,
} from '@store-release-kit/core';

export type StoreAdapterName = 'mock' | 'appstoreconnect' | 'fastlane';

export interface PullReleaseInput {
  config: ProjectConfig;
  version: string;
  sourceDir?: string;
}

export interface PullReleaseResult {
  release?: ReleaseProject;
  message: string;
}

export interface PushReleaseInput {
  project: ReleaseProject;
  dryRun: boolean;
  yes?: boolean;
}

export interface PushReleaseResult {
  pushed: boolean;
  message: string;
  payload?: unknown;
}

export interface ExportReleaseInput {
  project: ReleaseProject;
  outDir: string;
  format: 'fastlane' | 'json';
}

export interface ExportReleaseResult {
  outDir: string;
  files: string[];
}

export interface StoreAdapter {
  name: StoreAdapterName;
  pullRelease(input: PullReleaseInput): Promise<PullReleaseResult>;
  pushRelease(input: PushReleaseInput): Promise<PushReleaseResult>;
  exportRelease?(input: ExportReleaseInput): Promise<ExportReleaseResult>;
}

export interface AppStoreReleasePayload {
  base: ReleaseBase;
  locales: LocaleMetadata[];
}

import { NotImplementedError } from '@store-release-kit/core';

export async function importFastlaneMetadata(): Promise<never> {
  throw new NotImplementedError(
    'Fastlane metadata import is planned for a future release after export mapping stabilizes.',
  );
}

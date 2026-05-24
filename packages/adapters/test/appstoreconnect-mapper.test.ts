import { describe, expect, it } from 'vitest';
import {
  mapAppStoreConnectAttributesToLocale,
  mapLocaleToAppStoreConnectAttributes,
} from '../src/index.js';

describe('App Store Connect mapper', () => {
  it('maps locale metadata to attributes and skips undefined fields', () => {
    expect(
      mapLocaleToAppStoreConnectAttributes({
        locale: 'en-US',
        name: 'Focus Plan',
        keywords: ['focus', 'todo'],
      }),
    ).toEqual({
      locale: 'en-US',
      name: 'Focus Plan',
      keywords: 'focus,todo',
    });
  });

  it('maps localization attributes back to locale metadata', () => {
    expect(
      mapAppStoreConnectAttributesToLocale({
        locale: 'en-US',
        name: 'Focus Plan',
        keywords: 'focus, todo,,productivity',
      }),
    ).toMatchObject({
      locale: 'en-US',
      name: 'Focus Plan',
      keywords: ['focus', 'todo', 'productivity'],
      reviewStatus: 'human-reviewed',
    });
  });
});

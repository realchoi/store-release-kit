# Metadata Schema

metadata 使用 YAML 保存，核心由 project config、release base、locale metadata 和 glossary 组成。

## store-release.config.yml

```yaml
appId: '1234567890'
platform: ios
defaultLocale: zh-Hans
targetLocales:
  - zh-Hans
  - en-US
store:
  provider: mock
  appStoreConnect:
    issuerId: ''
    keyId: ''
    privateKeyEnv: APPSTORE_CONNECT_PRIVATE_KEY
rules:
  requireReviewBeforePush: true
  allowMachineTranslation: false
  maxKeywordsCount: 100
```

字段说明：

- `appId`：应用商店中的应用 ID 或团队内部应用 ID。
- `platform`：`ios`、`android` 或 `multi`。
- `defaultLocale`：源语言。
- `targetLocales`：需要维护和发布的 locale 列表。
- `store.provider`：`appstoreconnect`、`fastlane` 或 `mock`。
- `rules.requireReviewBeforePush`：push 前是否要求人工审核。
- `rules.allowMachineTranslation`：是否允许机器翻译直接发布。
- `rules.maxKeywordsCount`：关键词数量上限，默认 100。

## releases/<version>/base.yml

```yaml
version: 2.4.0
build: '240'
sourceLocale: zh-Hans
status: reviewed
createdAt: '2026-05-24T00:00:00.000Z'
notes:
  - '新增周报仪表盘。'
```

`status` 可选值为 `draft`、`translated`、`reviewed`、`ready`。

## releases/<version>/locales/<locale>.yml

```yaml
locale: en-US
name: 'Pomodoro Plan'
subtitle: 'Focus, todos, and habit tracking'
promotionalText: 'A new weekly dashboard and faster sync experience.'
description: |
  Pomodoro Plan brings focus sessions, todos, and habit tracking into one workflow.
keywords:
  - 'pomodoro'
  - 'focus'
whatsNew: |
  - Added a weekly dashboard.
supportUrl: 'https://example.com/support'
marketingUrl: 'https://example.com'
reviewStatus: approved
translatorNotes:
  - '人工审核英文示例。'
```

`reviewStatus` 可选值为 `machine`、`human-reviewed`、`approved`。`machine` 内容默认不能 push。

## glossary.yml

```yaml
terms:
  - source: '番茄计划'
    translations:
      en-US: 'Pomodoro Plan'
      ja: 'ポモドーロ計画'
    locked: true
    note: '产品名保持统一。'
```

`locked: true` 表示翻译 provider 应尽量保持该术语的指定译法。第一版 mock provider 会做基础替换，真实 provider 后续需要把 glossary 注入 prompt 或 API 参数。

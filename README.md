# store-release-kit

`store-release-kit` 是一个 GitOps 风格的 App Store / 应用商店版本发布信息管理与多语言本地化工具。它用 Git 管理每个 App 版本的 metadata，通过 CLI 完成拉取、校验、翻译、diff、导出和发布前 dry-run。

第一阶段重点支持 Apple App Store Connect 和 Fastlane metadata 目录，后续可扩展 Google Play、Microsoft Store 等发布渠道。

## 为什么需要这个工具

应用商店文案通常散落在后台、表格、翻译工具和聊天记录里，缺少版本化、审查和回滚能力。`store-release-kit` 把 release metadata 放回工程流程中：每次版本文案都有结构化 YAML、Git diff、测试校验和人工 review。

## 核心理念

- Git 是 source of truth。
- CLI 是核心入口，方便本地和 CI/CD 使用。
- YAML/JSON 是版本信息的结构化存储格式。
- LLM、DeepL、Google Translate 都只是翻译 provider。
- App Store Connect API、Fastlane metadata 都只是发布 adapter。
- 自动生成内容必须支持 diff、review、dry-run，不默认直接发布。

## 快速开始

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js --help
```

`store-release-kit` 当前是本地 monorepo 工具。运行 metadata 项目命令时，建议先构建 CLI，然后从 metadata 项目目录调用构建后的入口：

```bash
export STORE_RELEASE_KIT=/path/to/store-release-kit

store-release() {
  node "$STORE_RELEASE_KIT/packages/cli/dist/index.js" "$@"
}
```

初始化一个 metadata 项目：

```bash
mkdir my-app-metadata
cd my-app-metadata
store-release init \
  --app-id 1234567890 \
  --default-locale zh-Hans \
  --target-locales zh-Hans,en-US,ja,ko
```

使用内置示例：

```bash
cd "$STORE_RELEASE_KIT/examples/simple-ios-app"
store-release validate --version 2.4.0
store-release export --version 2.4.0 --format fastlane
```

不要用 `pnpm --filter @store-release-kit/cli dev ...` 在 metadata 项目中执行 `validate`、`export`、`translate` 等命令。`pnpm --filter` 会切换到 `packages/cli` 运行脚本，CLI 会在那里查找 `store-release.config.yml`，导致读取不到当前 metadata 项目的配置。

## CLI 命令示例

```bash
store-release init --app-id 1234567890 --default-locale zh-Hans --target-locales zh-Hans,en-US
store-release validate --version 2.4.0 --strict
store-release diff --from 2.3.0 --to 2.4.0 --locale en-US
store-release translate --version 2.4.0 --from zh-Hans --to en-US,ja --provider mock
store-release export --version 2.4.0 --format fastlane --out ./dist/fastlane-metadata
store-release pull --version 2.4.0 --provider mock
store-release push --version 2.4.0 --provider mock --dry-run
```

## 项目目录说明

```text
packages/core         schema、validation、diff、文件加载与写入
packages/cli          store-release 命令行入口
packages/translators  翻译 provider 接口和 mock/OpenAI/DeepL skeleton
packages/adapters     store adapter、Fastlane export、App Store Connect skeleton
examples/simple-ios-app 完整 iOS 示例 metadata
docs/                 架构、schema、工作流和路线图
```

## Metadata YAML 示例

```yaml
locale: zh-Hans
name: '番茄计划'
subtitle: '专注、待办与习惯追踪'
promotionalText: '全新的周报仪表盘，更快的同步体验。'
description: |
  番茄计划帮助你把专注、待办和习惯追踪放在同一个工作流里。
keywords:
  - '番茄钟'
  - '专注'
  - '待办'
whatsNew: |
  - 新增周报仪表盘。
supportUrl: 'https://example.com/support'
marketingUrl: 'https://example.com'
reviewStatus: approved
```

## 翻译工作流

1. 在默认语言 locale 中维护源文案。
2. 维护 `glossary.yml`，锁定产品名、品牌名和核心术语。
3. 使用 `store-release translate --provider mock` 生成目标语言草稿。
4. 用 `store-release diff` 审查变更。
5. 人工审核后把 `reviewStatus` 改为 `human-reviewed` 或 `approved`。
6. 运行 `store-release validate --strict`，再执行 `push --dry-run` 或 `export`。

## Review / dry-run / push 安全机制

`push` 第一版只允许 `--dry-run`，不会真实提交到任何应用商店。若 locale 的 `reviewStatus` 是 `machine`，且配置不允许机器翻译直接发布，push 校验会失败。未来真实 push 也会先走相同 validation gate。

## Fastlane export 示例

```bash
store-release export --version 2.4.0 --format fastlane --out ./dist/fastlane-metadata
```

输出示例：

```text
dist/fastlane-metadata/en-US/name.txt
dist/fastlane-metadata/en-US/subtitle.txt
dist/fastlane-metadata/en-US/promotional_text.txt
dist/fastlane-metadata/en-US/description.txt
dist/fastlane-metadata/en-US/keywords.txt
dist/fastlane-metadata/en-US/release_notes.txt
```

## 未来路线图

- MVP：CLI、schema、validation、mock translator、Fastlane export、dry-run push。
- v0.2：App Store Connect pull、Fastlane import、字段长度规则。
- v0.3：真实 OpenAI / DeepL provider、glossary 强约束、CI 模板。
- v1.0：稳定 adapter API、多平台 store provider、Web UI 管理界面。

## 开发命令

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm dev
pnpm typecheck
```

开发调试 CLI 帮助信息时可以使用：

```bash
pnpm --filter @store-release-kit/cli dev --help
```

但需要读取 metadata 项目文件的命令，应优先使用构建后的 `packages/cli/dist/index.js`，并从包含 `store-release.config.yml` 的项目目录执行。

# 架构说明

`store-release-kit` 采用轻量 monorepo。核心边界是：`core` 管数据模型和本地文件，`cli` 管用户入口，`translators` 管翻译 provider，`adapters` 管应用商店或导出格式。

## 包边界

- `packages/core`：不依赖任何内部包，提供 zod schema、TypeScript 类型、release validation、metadata diff、本地 YAML 加载与写入。
- `packages/cli`：依赖 core、translators、adapters，是 `store-release` 命令入口。
- `packages/translators`：依赖 core，定义 `TranslatorProvider`，实现 mock、OpenAI 和 DeepL provider。网络 provider 默认由 CLI `--allow-network` 门禁保护。
- `packages/adapters`：依赖 core，定义 `StoreAdapter`，提供 mock adapter、Fastlane import/export、App Store Connect localization client/adapter。

依赖方向保持为：

```text
cli -> core, translators, adapters
translators -> core
adapters -> core
core -> no internal package
```

## 为什么 Git 是 source of truth

应用商店 metadata 是版本发布的一部分，应该和代码、设计变更、发布计划一样可审查、可回滚、可追踪。把 YAML 文件放在 Git 中，可以自然获得 diff、code review、branch、tag 和 CI/CD 能力。

这也避免了后台直接修改造成的不可见风险：发布说明、关键词、截图文案和多语言描述都可以在提交前被校验和审查。

## 为什么 CLI 优先

CLI 是最小、最稳定的自动化边界。它可以在本地使用，也可以放进 CI。Web UI 后续可以作为 CLI/core 的上层体验，而不是重新定义业务逻辑。

第一版不实现 Web UI，但目录结构为未来扩展预留：schema、validation、translator、adapter 都可以被 Web UI 复用。

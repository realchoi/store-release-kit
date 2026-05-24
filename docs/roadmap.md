# Roadmap

## MVP

- Monorepo 工程骨架。
- Core schema、validation、diff、YAML load/write。
- CLI：init、validate、diff、translate、export、pull、push。
- Mock translator。
- Mock adapter。
- Fastlane metadata export。
- App Store Connect localization JWT/client/pull/push dry-run 与受门禁保护的真实 localization update。
- 示例 App、中文文档和基础测试。

## v0.2

- Fastlane metadata import。
- 更完整的 App Store 字段长度规则。
- 更清晰的人类可读 validation report。
- CI 示例和 GitHub Actions 模板。
- OpenAI translator 已有 Responses API structured output、超时 / 重试、prompt 约束和可选 live smoke。
- DeepL translator 已有基础 API 调用、超时 / 重试和可选 live smoke。
- glossary locked terms 强约束。

## v0.3

- 按字段配置 tone、styleGuide、max length。
- release 之间的结构化 diff report。

## v1.0

- 稳定 adapter API。
- App Store Connect 截图上传、创建版本和提交审核。
- Google Play adapter。
- Microsoft Store adapter。
- Web UI，用于审查、对比和批量编辑 metadata。

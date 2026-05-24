# AGENTS.md

本文件约束自动化代理在 `store-release-kit` 仓库内工作的默认方式。全局规则仍然生效；若与本文件冲突，以本文件的项目级约定优先。

## 项目定位

`store-release-kit` 是一个 GitOps 风格的 App Store / 应用商店版本发布 metadata 管理与本地化工具。

当前阶段的真实能力边界：

- CLI、schema、validation、diff、mock translator、Fastlane export、JSON export 可用。
- `push` 只允许 `--dry-run`，不得实现或宣称真实远端提交已可用，除非代码和文档同时明确支持。
- OpenAI / DeepL translator 目前是 skeleton，不应在文档或交付中说成已接入真实翻译。
- App Store Connect adapter 当前是 skeleton / dry-run 方向能力，不应默认真实操作 App Store Connect。

## 仓库结构

```text
packages/core         schema、validation、diff、文件加载与写入
packages/cli          store-release 命令行入口
packages/translators  translator provider 接口与 mock/OpenAI/DeepL
packages/adapters     store adapter、Fastlane export、App Store Connect skeleton
examples/simple-ios-app 示例 metadata 项目
docs/                 架构、schema、工作流与路线图
```

改动时优先保持模块边界：

- schema / validation / load / write / diff 放在 `packages/core`。
- 命令参数、交互输出和命令编排放在 `packages/cli`。
- 翻译 provider 放在 `packages/translators`。
- Fastlane、App Store Connect 等外部格式和商店适配放在 `packages/adapters`。
- 示例数据只放在 `examples/`，不要让生产逻辑依赖示例路径。

## CLI 使用约定

先构建：

```bash
pnpm build
```

从包含 `store-release.config.yml` 的 metadata 项目目录调用构建后的 CLI：

```bash
node /path/to/store-release-kit/packages/cli/dist/index.js validate --version 2.4.0
node /path/to/store-release-kit/packages/cli/dist/index.js export --version 2.4.0 --format fastlane
```

不要把下面这种形式作为 README 或用户指引中的 metadata 项目命令：

```bash
pnpm --filter @store-release-kit/cli dev validate --version 2.4.0
```

原因：`pnpm --filter` 会切到 `packages/cli` 执行脚本，CLI 使用 `process.cwd()` 读取项目文件，会去 `packages/cli` 查找 `store-release.config.yml`。

`pnpm --filter @store-release-kit/cli dev --help` 只适合开发调试 CLI 帮助信息。

## 开发命令

常用验证：

```bash
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

示例项目 smoke test：

```bash
cd examples/simple-ios-app
node ../../packages/cli/dist/index.js validate --version 2.4.0
node ../../packages/cli/dist/index.js export --version 2.4.0 --format fastlane
node ../../packages/cli/dist/index.js push --version 2.4.0 --provider mock --dry-run
```

## 实现与测试规则

- 行为变化优先补测试；schema、validation、diff、load/write、export 映射属于高回归风险区域。
- CLI 命令改动至少覆盖命令函数或新增 smoke test。
- Fastlane 文件名、字段映射、locale 路径变更必须同步更新测试和 README / docs。
- 修改 release schema 时，同步检查 `docs/metadata-schema.md`、示例 YAML 和 validation 规则。
- 修改 provider / adapter 名称时，同步检查 CLI help、README 和相关类型导出。

## 文档规则

- README 面向使用者，优先提供可直接运行的命令。
- `docs/architecture.md` 面向架构和边界说明。
- `docs/localization-workflow.md` 面向 metadata 本地化操作流程。
- `docs/appstoreconnect.md` 面向 App Store Connect 集成状态与安全边界。
- 文档不得夸大 skeleton 能力；真实未实现的能力必须标注为 future / skeleton / dry-run。

## 安全边界

- 不要硬编码 API Key、issuer id、private key 或 App Store Connect 凭证。
- 不要默认执行真实远端提交、上传或发布动作。
- 不要让 `push` 绕过 `validateRelease(..., { strict: true, forPush: true })`。
- 不要放宽 `reviewStatus: machine` 的发布门禁，除非配置、测试、文档同时说明行为变化。
- 不要删除用户 metadata 文件；覆盖文件必须由显式 `--force` 或明确用户要求触发。

## 完成前检查

根据改动范围选择最小充分验证：

- 仅文档改动：检查 Markdown 内容、命令示例路径和当前能力描述是否准确。
- CLI / core / adapter / translator 改动：运行 `pnpm build`、相关包测试，以及示例项目 smoke test。
- schema / validation 改动：运行 `pnpm test`，并手动验证至少一个示例 release。
- 导出行为改动：检查 `examples/simple-ios-app/dist/fastlane-metadata` 输出是否符合预期。

没有实际运行的命令，不得声称已经通过。

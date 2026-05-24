# 本地化工作流

`store-release-kit` 的本地化流程围绕源语言、目标语言、术语表、机器翻译、人工审核和发布前校验展开。

## 1. 维护主语言

在 `releases/<version>/locales/<defaultLocale>.yml` 中维护源文案。源文案通常由产品、运营或开发者直接编写，并标记为 `approved`。

## 2. 维护术语表

在 `glossary.yml` 中维护产品名、功能名、品牌词和不希望自由翻译的术语。`locked: true` 的术语应被 provider 优先保留。

## 3. 生成机器翻译

```bash
store-release translate --version 2.4.0 --from zh-Hans --to en-US,ja,ko --provider mock
store-release translate --version 2.4.0 --from zh-Hans --to en-US --provider openai --allow-network
```

`mock` provider 会给文本加 locale 前缀；`openai` 和 `deepl` provider 会调用真实翻译 API，因此必须显式传入 `--allow-network`。默认读取 `glossary.yml`，也可以通过 `--glossary` 指定文件，通过 `--style-guide` 传入风格说明，通过 `--fields name,subtitle,whatsNew` 限定字段。生成结果都会标记：

```yaml
reviewStatus: machine
```

## 4. Review 和 diff

翻译后使用 Git diff 或 CLI diff 审查：

```bash
store-release diff --from 2.3.0 --to 2.4.0
```

人工审核完成后，把 locale 文件中的 `reviewStatus` 改为 `human-reviewed` 或 `approved`。

## 5. 校验和发布前 dry-run

```bash
store-release validate --version 2.4.0 --strict
store-release push --version 2.4.0 --provider mock
```

`push` 默认就是 dry-run，并写入 `.store-release/last-dry-run.json`。如果存在 `reviewStatus: machine` 且配置不允许机器翻译发布，push 会被阻止。真实 App Store Connect push 需要 `--no-dry-run --yes`，并要求 30 分钟内存在同 version/provider 的 dry-run 记录。

## 6. 导出 Fastlane metadata

```bash
store-release export --version 2.4.0 --format fastlane --out ./dist/fastlane-metadata
```

导出的目录可以交给 Fastlane 或其他发布流水线使用。

## 7. 导入 Fastlane metadata

```bash
store-release pull --version 2.4.0 --provider fastlane --in ./fastlane/metadata
```

默认不会覆盖已有 locale 文件；需要覆盖时显式添加 `--force`。导入内容会标记为 `human-reviewed`，因为 Fastlane metadata 通常来自已有人工维护目录。

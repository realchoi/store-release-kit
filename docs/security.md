# 安全说明

## 凭证管理

不要把 `OPENAI_API_KEY`、`DEEPL_API_KEY`、App Store Connect issuer id、key id 或 `.p8` 私钥提交到仓库。`.env.example` 只保留占位值；真实值应放在本机环境变量或 CI secret 中。

App Store Connect 私钥通过 `store.appStoreConnect.privateKeyEnv` 指定环境变量名。该变量可以保存原始 PEM，也可以保存带 `\n` 转义的单行字符串。

## 网络翻译

`translate --provider openai|deepl` 默认拒绝运行，必须显式添加 `--allow-network`。所有真实 provider 生成内容都会写成 `reviewStatus: machine`，需要人工审核后再改为 `human-reviewed` 或 `approved`。

## Push 门禁

`push` 默认 dry-run。真实 App Store Connect push 需要：

- `--no-dry-run --yes`
- 30 分钟内同 version/provider 的 dry-run 记录
- strict validation 通过
- machine translation gate 通过
- 可选 branch allowlist 通过

当前真实 push 只 create/update localization metadata，不创建版本、不提交审核、不上传截图。

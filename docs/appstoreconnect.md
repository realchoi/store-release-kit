# App Store Connect 接入说明

当前 App Store Connect adapter 已支持 localization metadata 的读取、dry-run plan 和受门禁保护的 create/update。它不会创建新 App Store version、上传截图、提交审核或发布版本。

## 认证信息

接入 App Store Connect API 需要：

- `issuerId`：App Store Connect API issuer ID。
- `keyId`：API key ID。
- `privateKeyEnv`：保存 `.p8` 私钥内容的环境变量名，支持原始 PEM 和 `\n` 转义格式。
- `appId`：Apple API 中的 app resource id。不要和项目顶层通用 `appId` 混淆。
- `defaultPlatform`：默认 `IOS`。

配置示例：

```yaml
store:
  provider: appstoreconnect
  appStoreConnect:
    issuerId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    keyId: 'ABC123DEFG'
    privateKeyEnv: APPSTORE_CONNECT_PRIVATE_KEY
    appId: '1234567890'
    bundleId: com.example.app
    defaultPlatform: IOS
    apiBaseUrl: https://api.appstoreconnect.apple.com/v1
    timeoutMs: 30000
```

## JWT Auth

`createAppStoreConnectJwt` 使用 ES256 签名，header 包含 `kid`，payload 包含 `iss`、`aud: appstoreconnect-v1`、`iat`、`exp`。默认 19 分钟过期；超过 20 分钟会直接报错。

## Client 和 Mapper

- `client.ts`：封装 App Store Connect JSON API 请求、Bearer JWT、query/body、超时和非 2xx 错误。
- `mapper.ts`：负责在 `LocaleMetadata` 和 App Store Connect localization attributes 之间转换，`keywords` 在数组和逗号字符串之间互转。
- `types.ts`：保存 App Store Connect 相关 payload 类型。

## 当前安全边界

`pull` 只读取 editable App Store version 的 localization metadata，默认不会覆盖本地 locale 文件。

`push` 默认 dry-run。真实 push 必须传入 `--no-dry-run --yes`，并通过 strict validation、machine translation gate、近期 dry-run 记录和可选 branch allowlist。真实 push 只 create/update localization metadata，不提交审核。

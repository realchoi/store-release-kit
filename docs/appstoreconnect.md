# App Store Connect 接入说明

第一版只提供 App Store Connect adapter 的类型和骨架，不会真实调用 Apple API，也不会提交 metadata。

## 认证信息

未来接入 App Store Connect API 需要：

- `issuerId`：App Store Connect API issuer ID。
- `keyId`：API key ID。
- `privateKey`：`.p8` 私钥内容，建议通过环境变量读取。

配置示例：

```yaml
store:
  provider: appstoreconnect
  appStoreConnect:
    issuerId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
    keyId: 'ABC123DEFG'
    privateKeyEnv: APPSTORE_CONNECT_PRIVATE_KEY
```

## JWT Auth

`packages/adapters/src/appstoreconnect/jwt.ts` 预留了 `createAppStoreConnectJwt` 接口。后续实现时应使用 ES256 签名，header 包含 `kid`，payload 包含 `iss`、`aud`、`exp`。

## Client 和 Mapper

- `client.ts`：未来封装 App Store Connect API 请求、分页、错误映射和重试策略。
- `mapper.ts`：负责在 `LocaleMetadata` 和 App Store Connect payload 之间转换。
- `types.ts`：保存 App Store Connect 相关 payload 类型。

## 当前安全边界

当前 `AppStoreConnectAdapter` 的 pull/push 会抛出 `NotImplementedError` 或只做 dry-run。真实 push 上线前必须继续使用 `validateRelease({ forPush: true })`，阻止未审核的机器翻译内容发布。

# electron-oauth-vue

Electron + electron-vite + Vue 3 + TypeScript 项目，演示 **GitHub OAuth2** 登录/注册与 **refresh_token 自动续期**。

## 功能

- GitHub OAuth2 授权（弹窗 BrowserWindow）
- 获取 `access_token` / `refresh_token`（GitHub App 启用 token 过期时）
- 过期前 5 分钟自动 refresh_token 续期
- 续期后 UI 实时更新 Token 信息
- refresh_token 失效时自动登出

## GitHub 配置步骤

### 方式 A：GitHub App（推荐，支持 refresh_token）

1. 打开 [GitHub Developer Settings → GitHub Apps](https://github.com/settings/apps)
2. 创建 GitHub App，设置 **Callback URL**：
   ```
   http://127.0.0.1:38473/callback
   ```
3. 在 App 设置中启用 **Expire user authorization tokens**（用户 token 过期）
4. 记录 **Client ID** 和 **Client Secret**
5. 复制 `.env.example` 为 `.env` 并填入凭证：

```bash
cp .env.example .env
```

```env
GITHUB_CLIENT_ID=Iv1.xxxxx
GITHUB_CLIENT_SECRET=xxxxx
GITHUB_REDIRECT_URI=http://127.0.0.1:38473/callback
```

> GitHub App 启用 token 过期后，access_token 8 小时过期，refresh_token 6 个月过期，并支持自动续期。

### 方式 B：OAuth App（简单，但无 refresh_token）

1. 打开 [OAuth Apps](https://github.com/settings/developers) 创建应用
2. Authorization callback URL 同上
3. 填入 `.env` 后可直接使用
4. Token **永不过期**，**无 refresh_token**，自动续期不会触发

## 快速开始

```bash
npm install
cp .env.example .env   # 填入 GitHub 凭证
npm run dev
```

## Token 自动续期机制

主进程 `token-refresh-service.ts` 每分钟检查一次：

- 若 `access_token` 将在 5 分钟内过期且存在 `refresh_token`
- 调用 `POST https://github.com/login/oauth/access_token`（`grant_type=refresh_token`）
- 更新 electron-store 中的 session，并通过 IPC 通知渲染进程

## 项目结构

```
electron/
├── main/
│   ├── auth-service.ts         # OAuth 弹窗 + 授权流程
│   ├── github-oauth-client.ts  # GitHub Token 交换 / 刷新
│   ├── token-refresh-service.ts  # 自动续期调度
│   └── oauth-config.ts         # 从 .env 读取配置
src/
├── App.vue                     # 根组件
└── components/
    ├── AuthPanel.vue           # 登录 / 注册
    └── UserPanel.vue           # 用户信息 + Token 状态
```

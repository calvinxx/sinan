# 司南 · sinan

心有所向，日有所进。一个暖灰色的个人浏览器首页，把常去的网站与接下来要做的事放在一起。

React + TypeScript + Vite，使用 shadcn/ui、Tailwind CSS 和少量 Motion。前端部署到 GitHub Pages，账号与数据由 Supabase 管理。

线上地址：[calvinxx.github.io/sinan](https://calvinxx.github.io/sinan/)。

## 本地运行

运行时版本集中维护在 `mise.toml`，依赖版本由 `package-lock.json` 锁定。

```bash
mise install
npm ci
npm run dev
```

未配置任何 Supabase 变量时，开发服务自动进入演示模式，提供 20 个书签与 10 条待办。演示数据仅在当前页面内存中保存，刷新页面恢复初始内容。页面会明确标识演示模式。

```bash
npm test        # 日期、网址、数据库约束、RLS 和并发更新测试
npm run build  # TypeScript 检查与生产构建
npm run preview
```

生产构建不会自动使用演示数据。需要演示产物时，显式运行 `VITE_DEMO_MODE=true npm run build`。

## 已实现

- 书签新增、编辑、删除、分组、常用置顶、上下排序、重复网址提示。
- 分组新增、重命名、排序；删除分组时保留书签并迁入未分组。
- 待办标题、纯文本详情、待处理 / 进行中 / 已完成、可选截止时间。
- 按逾期、今天、之后、无截止时间分组，时间筛选与完成撤销。
- 全局搜索与 `⌘ / Ctrl + K`；编辑支持 `⌘ / Ctrl + Enter` 保存。
- 暖灰浅色主题、手机模块切换、键盘焦点、减少动态效果适配。
- PIN 登录、会话恢复、加载与离线反馈、写入冲突检测、内存草稿。

日期统一使用北京时间（Asia/Shanghai）。选中截止日期后默认时间为 18:00，可修改；存储使用 UTC。

## 接入 Supabase

### 1. 创建项目与表

创建 Supabase 项目后，在 SQL Editor 执行一次 [初始迁移](supabase/migrations/202611040001_initial.sql)。它会创建三个业务表、约束、索引、更新时间触发器、RLS，以及分组删除和排序的事务函数。

初始迁移面向空项目。后续结构调整应新增迁移文件，不要在已有数据上重复运行初始迁移。

三张业务表均限制为当前登录用户自己的数据。`anon` 没有业务表读写权限；跨账号关联分组由复合外键阻止。

### 2. 创建自己的账号

在 Supabase Authentication 的用户管理中创建一个邮箱用户，确认该用户的邮箱，并将密码设为自己的随机数字 PIN，至少 8 位，推荐更长。该邮箱会作为公开账号标识写入前端，建议使用专用邮箱别名。

前端只展示 PIN 输入框，实际调用 Supabase 标准邮箱密码登录。关闭公开注册与匿名登录，仅保留自己的预建账号。密码策略的最小长度应与所选 PIN 一致；纯数字 PIN 方案需要允许纯数字密码。忘记 PIN 时通过 Supabase 管理端恢复账号，首版没有前端找回入口。

PIN 不写入环境变量、代码或业务表。详见 [Supabase 密码登录](https://supabase.com/docs/guides/auth/passwords)和[密码策略](https://supabase.com/docs/guides/auth/password-security)。

### 3. 配置登录验证

上线前创建 Cloudflare Turnstile 站点，允许实际 Pages 域名；需要本地联调时另加入本地域名。在 Supabase Authentication 的 Bot and Abuse Protection 中开启 CAPTCHA，选择 Turnstile，将其 secret key 填入 Supabase。

前端只填写 Turnstile site key。页面先完成验证，再显示 PIN 输入框；验证码过期后返回验证步骤，保留已填写的 PIN。登录时客户端把验证 token 交给 Supabase；服务端 CAPTCHA 和 Auth 限流负责约束尝试次数。[Supabase CAPTCHA 配置](https://supabase.com/docs/guides/auth/auth-captcha)

### 4. 填写本地配置

复制 `.env.example` 为 `.env.local`，填写：

```dotenv
VITE_DEMO_MODE=false
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_ACCOUNT_EMAIL=your-account@example.com
VITE_TURNSTILE_SITE_KEY=your-public-turnstile-site-key
VITE_BASE_PATH=/
```

Project URL 与 publishable key 可从项目 Connect 面板取得。这里所有 `VITE_*` 值都会进入公开构建产物；不要填入 PIN、数据库密码、Supabase secret / service-role key 或 Turnstile secret key。[Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)

环境变量修改后重启开发服务。Supabase URL、key 和账号邮箱需同时配置；部分配置不会回退为演示模式。尚未配置 CAPTCHA 的本地联调可以暂时留空 site key；正式部署工作流会要求填写。

## GitHub Pages 部署

1. 将项目推送到自己的 `sinan` GitHub 仓库，默认分支使用 `main`。
2. 在仓库 Settings → Pages 中将 Source 设为 **GitHub Actions**。
3. 在 Settings → Secrets and variables → Actions → Variables 添加下列 Repository variables。
4. 推送 `main` 或手动运行 `Deploy Sinan to GitHub Pages`。

| 变量                            | 值                                                 |
| ------------------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase 项目地址                                  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key                                    |
| `VITE_ACCOUNT_EMAIL`            | 预建用户的邮箱                                     |
| `VITE_TURNSTILE_SITE_KEY`       | Turnstile site key                                 |
| `VITE_BASE_PATH`                | 仓库站点默认 `/sinan/`；根域名或自定义域名填写 `/` |
| `VITE_DEMO_MODE`                | 默认 `false`；仅发布演示站时设为 `true`            |

工作流会安装锁定依赖、运行测试、检查类型、构建并发布 `dist`。变量变更后需要重新运行构建。将 Supabase Auth 的 Site URL 设置为实际 Pages URL，并确保 Turnstile 允许对应域名。[Vite Pages 部署说明](https://vite.dev/guide/static-deploy.html#github-pages)

部署后验收：登录 → 新建书签与待办 → 刷新确认数据保留 → 退出确认不能读取私人数据。新 Supabase 项目初始为空工作台，演示数据不会上传到真实项目。

## 实现边界

- 数据切回窗口时刷新，尚未引入 Realtime；并发修改使用 `updated_at` 条件更新，冲突时保留输入并提示重新加载。
- 业务数据与未提交草稿仅在内存中缓存。会话失效后，同一页面重新登录相同账号可恢复草稿；刷新页面不保留草稿。主动退出清理私人缓存。
- localStorage 仅保存模块偏好与 Supabase 管理的 Auth 会话，不持久缓存书签和待办。
- 断网时可以查看已加载内容，暂停写入；没有离线队列和后台提醒。
- 网站 favicon 直接尝试目标网站的 `/favicon.ico`，失败后显示名称首字。
- 数据库自动测试使用 PGlite 加模拟的 `auth.uid()`，覆盖 SQL 权限与事务逻辑；真实 Supabase 联调结果与上线前待办见 [验证记录](docs/verification.md)。

设计依据见 [暖灰版设计与实现方案](docs/workbench-design.md)。

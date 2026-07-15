# 部署到 Cloudflare Pages（后端汇总版）

本项目已改造为「前端静态站点 + Cloudflare Pages Functions + KV」架构，
到访、评论、留言会**真正汇总到云端**，全班同学看到的数据一致。

## 文件结构
```
（项目根目录）
├── site/                 # 前端静态站点（index.html / videos.html / play.html / comments.html / dashboard.html / css / js / videos）
├── functions/api/        # 后端（Cloudflare Pages Functions，自动随站点部署）
│   ├── visits.js
│   ├── comments.js
│   ├── guestbook.js
│   └── stats.js          # 数据看板，服务端校验密码 liulaoshi
└── wrangler.toml         # 部署配置（KV 绑定）
```

## 一键上线步骤

### 1. 安装并登录 Wrangler
```bash
npm install -g wrangler
wrangler login        # 浏览器打开后授权（需你的 Cloudflare 账号）
```

### 2. 创建 KV 存储桶
```bash
wrangler kv namespace create NEWS_KV
```
终端会返回一段 JSON，里面有一个 `id`。把 `wrangler.toml` 里的
`id = "REPLACE_WITH_YOUR_KV_ID"` 替换成这个 id。

> 如果还要部署预览环境，再执行一次带 `--preview` 的并填到 `preview_id`。

### 3. 部署
在**项目根目录**下执行（functions/ 会被自动一起部署）：
```bash
wrangler pages deploy site
```
按提示输入项目名称（如 `class2-news`），等待完成即可获得 `*.pages.dev` 网址。

### 4.（推荐）绑定 Git 自动部署
在 dash.cloudflare.com → Pages → 创建项目 → 连接你的 GitHub/Git 仓库，
设置：
- 构建命令：**留空**
- 构建输出目录：`site`
Functions 目录 `functions/` 会被自动识别，无需额外设置。

之后每次 push 代码即自动更新。

## 关于网址
- Cloudflare 会分配 `xxx.pages.dev` 域名，可在 Pages 设置里**绑定你自己的域名**
  （如 `news.班级名.cn`），比 CloudStudio 随机链接好记，也能做自定义路径。
- 纯静态托管无法自定义 `.../chu/2028/01/02` 这类路径；绑定自有域名后可在
  Cloudflare 的「Rules / 重定向」里把根路径指向任意子路径。

## 本地预览（可选）
```bash
wrangler pages dev site
```
本地也会跑起 Functions + 临时 KV，可用 http://localhost:8788 体验完整功能。

## 密码说明
- 访问密码：20280102（前端门，见 site/js/gate.js）
- 看板密码：liulaoshi（**服务端校验**，见 functions/api/stats.js）
- 主播名字：存于各人设备，登录一次后同设备免重复输入

## 数据迁移
旧版 CloudStudio 上的本地数据不会自动导入 KV。上线后同学们重新访问、
发表评论/留言，数据即从零开始累积在云端。如需导入历史数据，告诉我即可写脚本。

# 部署到 Cloudflare Pages（傻瓜版）

代码已就绪，目标是把网站变成全班可访问、数据汇总到云端的真网站。
你已经有：GitHub 仓库 `class-video-20280102-news` + Cloudflare 账号。

## 一、把代码放进 GitHub（首次做）

**方法 1（最省事，推荐）：双击脚本**
在本项目文件夹里双击 `push-to-github.bat` 即可。脚本会自动找到 git 的安装位置（即使 git 不在命令行 PATH 里也能用），并按提示登录 GitHub 完成推送。若弹出浏览器登录 GitHub，登录一下即可。

**方法 2（完全不用命令行）：网页拖拽**
1. 打开 https://github.com/mrhu-fanren/class-video-20280102-news
2. 点「Add file」→「Upload files」
3. 从电脑把本地的 `site` 文件夹、`functions` 文件夹、以及 `wrangler.toml` 文件拖进网页虚线框
4. 点「Commit changes」

## 二、Cloudflare 连线（一次性，约 1 分钟）

1. 打开 https://dash.cloudflare.com → 左侧「Workers 和 Pages」
2. 点「创建」→ 选「Pages」→「连接到 Git」
3. 点「Authorize Git」授权 GitHub（用建仓库的同一个账号登录）
4. 仓库列表里选 `class-video-20280102-news`
5. 构建设置（很重要）：
   - 框架预设：选「无 / None」
   - 构建命令：**留空**
   - 构建输出目录：填 `site`
6. 点「保存并部署」

## 三、接上云端数据库 KV（让评论/到访真正汇总）

首次部署后网站能打开，但要汇总数据还需这步：

1. Cloudflare 里点你的项目 →「设置」→「变量和机密」
2. 切到「KV 命名空间绑定」
3. 点「添加绑定」：
   - 变量名称(Variable name)：必须填 `NEWS_KV`
   - KV 命名空间：选「创建新的」，名字随便（如 class2-news-kv）
4. 保存 → 回到「部署」标签 → 点最近一次部署的「重试部署 / Redeploy」

## 四、完成

- 你会得到一个 `xxx.pages.dev` 网址，发给全班即可。
- 访问密码：`20280102` ｜ 看板密码：`liulaoshi`
- 想绑自己域名（更好记）可在 Pages 设置里绑定。

## 以后每周更新视频

把新视频发给我，我改好并推送 → Cloudflare 自动重新部署（Git 已连好）。
你基本不用再动手。

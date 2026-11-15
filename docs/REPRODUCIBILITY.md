# 跨电脑运行 / Reproducibility

## 前置条件

- Node.js **24**（`node --version` 应显示 v24）；
- npm（随 Node 安装）；
- 可访问 npm registry 和 DeepSeek API（可选）。

不需要：

- Git LFS；
- PostgreSQL / Docker；
- 本地大模型；
- Python。

## 从 GitHub 第一次运行

```bash
git clone <repository-url>
cd qihuang-state
npm run setup
npm start
```

打开：

```text
http://127.0.0.1:8787/
```

`npm run setup` 会：

1. 如果 `server/.env.local` 不存在，从 `.env.example` 创建；
2. 在 `app/` 执行 `npm ci`；
3. 构建前端；
4. 检查模型资产不是 LFS 指针。

首次启动会自动创建：

```text
server/data/qihuang.sqlite
```

## 可选：设置固定登录密码

```bash
npm run auth:set-password
```

按提示输入两次。密码只写入 `server/.env.local`，不进入浏览器和 Git。

## 可选：接入真实 DeepSeek

编辑：

```text
server/.env.local
```

填入：

```text
DEEPSEEK_API_KEY=你的新Key
```

没有 Key 时，页面仍可运行并保留演示分析；分析按钮会提示未配置。

## 常见命令

```bash
npm run setup       # 安装 + 构建 + 校验资产
npm start           # 启动 8787 单端口服务
npm test            # 服务端测试 + 类型检查 + 资产校验
npm run build       # 只构建前端
npm run db:info     # 查看数据库路径和记录数
npm run verify:assets
```

## Windows

```powershell
git clone <repository-url>
cd qihuang-state
npm run setup
npm start
```

## macOS / Linux

```bash
git clone <repository-url>
cd qihuang-state
npm run setup
npm start
```

## 开发模式

生产式单端口运行不需要 Vite。要热更新时，开两个终端：

```bash
# 终端 1
cd server
npm run dev

# 终端 2
cd app
npm run dev
```

Vite 会把 `/api` 代理到 `127.0.0.1:8787`。

## 数据备份

停止服务后复制整个：

```text
server/data/
```

包括 `qihuang.sqlite`、`-wal`、`-shm`。

## 故障排查

| 问题 | 处理 |
|---|---|
| `node:sqlite` 不存在 | Node 版本低于 24，安装 Node 24 |
| 8787 被占用 | 在 `.env.local` 设置 `PORT=其他端口` |
| 登录页提示无法连接 | 先启动 server |
| 分析提示未配置 Key | 填 `DEEPSEEK_API_KEY`，重启 |
| 模型没加载 | 运行 `npm run verify:assets`，确认不是 LFS 指针 |
| 忘记密码 | 重新运行 `npm run auth:set-password` |

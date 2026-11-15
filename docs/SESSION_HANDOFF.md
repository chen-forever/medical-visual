# 会话交接 / Session Handoff

> 项目：岐黄 · 状态（中医数字人体状态可视化系统）  
> 当前发布线：`release/github-v0.2.0`  
> 更新日期：2026-11-15

## 1. 先读什么

1. `README.md`：从零运行；
2. `docs/PROJECT_SUMMARY.md`：总体规划与项目总结；
3. `docs/REPRODUCIBILITY.md`：跨电脑运行；
4. `docs/GITHUB_PUBLISH.md`：发布步骤；
5. `server/README.md`、`app/README.md`；
6. 需要改动的源码。

## 2. 当前架构

```text
React 19 + Vite + Three.js
        │
        ▼
Node 24 BFF（/api + app/dist 静态托管）
        ├── SQLite（server/data/qihuang.sqlite）
        └── DeepSeek API（deepseek-flash）
```

## 3. 当前已完成

- 十页闭环；
- 3D 数字人体、10 个器官层、默认锁定旋转；
- 模型压缩到约 10.37 MB，单分块，普通 Git 文件（不依赖 LFS）；
- DeepSeek 真实分析、JSON 校验、红旗规则、限流、错误兜底；
- SQLite 病例、分析、药方、报告快照、审计事件；
- 单医生登录、HttpOnly Session、操作审计；
- 病位自动保存与独立 `lesionVersion`；
- 工作台最近病例；
- 生产式单端口运行 + Dockerfile；
- 24 个服务端测试。

## 4. 运行

```bash
npm run setup
npm start
```

打开 `http://127.0.0.1:8787/`。

开发模式：

```bash
cd server
npm run dev
```

```bash
cd app
npm run dev
```

## 5. 数据库与密码

数据库：

```text
server/data/qihuang.sqlite
```

查看：

```bash
npm run db:info
```

登录密码：

```bash
npm run auth:set-password
```

Key 与密码都在 `server/.env.local`，不进入 Git。

## 6. 当前未完成

- 多用户/RBAC；
- 报告分享与撤销；
- 服务端 PDF；
- PostgreSQL/多实例；
- 云端部署、监控、备份策略；
- 中医内容专业审核；
- 正式医疗合规评估。

## 7. 发布注意

- 不提交 `.env.local`、`server/data`、`node_modules`、`app/dist`；
- 当前模型是普通 Git 文件，不要重新加回 LFS；
- 只发布 `main` 和新的 `v0.2.0` tag；
- 旧 `v0.1.0-plan-a` 和旧 `opt/*` 分支包含历史 LFS 指针，不作为下载入口。

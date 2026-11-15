# 发布检查点 / Checkpoint

> 当前发布线：`release/github-v0.2.0`  
> 目标 tag：`v0.2.0`  
> 日期：2026-11-15

## 当前标识

- 开发分支：`release/github-v0.2.0`
- 发布目标：`main` + `v0.2.0`
- 本地数据库：`server/data/qihuang.sqlite`（忽略）
- 前端构建：`app/dist/`（忽略，安装时生成）

## 模型

- Human Atlas / BodyParts3D 4.0，CC BY 4.0；
- `atlas.json`：1,055,997 bytes；
- `body-core.bin.gz`：10,875,562 bytes；
- 几何压缩：约 10.37 MB，单分块；
- 三角形：约 64.7 万；
- **普通 Git 文件，不依赖 Git LFS**；
- 校验：`npm run verify:assets`。

## 后端

- Node 24 内置 `http` + `node:sqlite`；
- 表：`cases`、`analyses`、`formulas`、`reports`、`events`；
- 单医生登录、HttpOnly Session、操作审计；
- 单端口托管前端和 API。

## 历史基线

原始方案 A 基线保留为 tag `v0.1.0-plan-a`。该历史版本使用 33 MB / 15 分块模型和 Git LFS；
只用于历史回滚，不作为 GitHub 下载运行入口。

## 发布前验证

```bash
npm test
npm run setup
npm start
```

并从干净 clone 再执行一次 `npm run setup && npm start`。

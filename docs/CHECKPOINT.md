# 基线检查点 / Checkpoint

> 这是前端优化的回滚锚点。不要移动或删除 tag `v0.1.0-plan-a`。

## 基线标识

- 基线名称：`plan-a-visual-sprint`
- Git 分支：`main`
- Git tag：`v0.1.0-plan-a`
- 代码基线 commit：`0fc95e27c38ae04da68a2a667a86887d396b64ea`
- 元数据 commit：`git rev-parse v0.1.0-plan-a^{commit}`（以 tag 指向的提交为准）
- 日期：2026-11-15
- 工作目录：`C:\Users\陳.陈同学\Desktop\中医可视化`

## 快照

- 目录：`C:\Users\陳.陈同学\Desktop\中医可视化_snapshots\`
- ZIP：`qihuang-state-v0.1.0-plan-a-20261115.zip`
- SHA-256：同目录 `qihuang-state-v0.1.0-plan-a-20261115.sha256`

快照包含：

- `app/` 的源码、`public/` 模型、`package.json`、`package-lock.json`、配置；
- 根目录文档、决策看板、预览图、模型候选；
- `docs/SESSION_HANDOFF.md` 与本文件。

快照排除：

- `app/node_modules/`（约 275 MB）
- `app/dist/`、`app/.vite/`
- `app/tsconfig.tsbuildinfo`
- `%SystemDrive%/`、`.tmp-*`、浏览器临时目录

## 模型基线

- Human Atlas / BodyParts3D 4.0，CC BY 4.0。
- `atlas.json`：1,335,285 字节。
- `body-0.bin.gz` ～ `body-14.bin.gz`：15 个分块，合计约 33 MB。
- Git LFS 追踪 15 个 `.gz` 文件；`git lfs ls-files` 应显示 15 条。
- 许可与修改说明：`app/public/models/human-atlas/ATTRIBUTION.md`。

## 恢复方式

### Git 恢复

```bash
cd "C:\Users\陳.陈同学\Desktop\中医可视化"
git switch --detach v0.1.0-plan-a
```

如果要恢复整个工作区：

```bash
git switch main
git restore --source=v0.1.0-plan-a -- .
```

### ZIP 恢复

1. 解压 ZIP 到新目录；
2. 进入 `app`；
3. `npm ci`；
4. `npm run typecheck`；
5. `npm run build`；
6. `npm run dev`。

不要直接覆盖当前目录；先解压到新目录验证。

## 注意

- 浏览器 `localStorage` 不在此检查点内；需要时清理 `qihuang-case-v1` 或重置演示病例。
- 该检查点是本地 Git + 本地快照，没有远程备份；重要节点请把 ZIP 再复制到 OneDrive/移动硬盘。
- 优化从 tag 创建 `opt/<方向>` 分支，不要直接改 `main`。

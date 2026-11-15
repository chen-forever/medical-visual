# 会话交接 / Session Handoff

> 项目：岐黄 · 状态（中医数字人体状态可视化系统）  
> 基线：方案 A 视觉冲刺  
> 交接日期：2026-11-15

## 1. 先读什么

新会话请按顺序读：

1. 本文件；
2. `docs/CHECKPOINT.md`（tag、commit、快照路径）；
3. `git status`、`git log --oneline -5`、`git tag -l`；
4. `README.md` 与 `app/README.md`；
5. 需要改动的页面源码。

**不要直接在 `main` 上改。** 所有优化从 tag `v0.1.0-plan-a` 创建 `opt/<方向>` 分支。

## 2. 当前基线

- Git 分支：`main`
- 基线 tag：`v0.1.0-plan-a`
- 快照：见 `docs/CHECKPOINT.md`
- 工作目录：`C:\Users\陳.陈同学\Desktop\中医可视化`
- 前端目录：`app/`
- 技术栈：Vite 8 + React 19 + TypeScript + Three.js 0.187 + Zustand
- 3D 模型：Human Atlas / BodyParts3D 4.0，CC BY 4.0，约 33 MB，15 个分块
- 模型许可：`app/public/models/human-atlas/ATTRIBUTION.md`
- 当前开发地址：`http://127.0.0.1:5173/`（需要先 `npm run dev`）

## 3. 当前已经完成

- 十页流程：
  - `#/home` 工作台
  - `#/patient` 患者信息与四诊
  - `#/analysis` 症状分析与证型候选
  - `#/body` 数字人体
  - `#/inside` 人体内部观察
  - `#/lesion` 病位定位
  - `#/state` 当前状态
  - `#/formula` 输入药方
  - `#/timeline` 7 / 14 / 30 天变化
  - `#/report` 患者报告
- 3D 查看器：
  - 半透明体表、骨骼、脏腑、血管、神经图层；
  - 点击脏腑显示归属与经络；
  - **默认锁定旋转，只保留缩放、图层、复位**；
  - 病位标记与器官标签；
  - 气机/湿象粒子示意；
  - 胃壁四层为色带示意，不是真实四层网格。
- 报告：
  - A4 打印样式，浏览器打印/另存 PDF；
  - 含证型、病位、药方、趋势、免责声明、医生签名位。
- 当前为纯前端演示：
  - 分析为 Mock，不调用真实中医大模型；
  - 病例状态保存在浏览器 `localStorage`（Zustand persist，key：`qihuang-case-v1`）；
  - 无账号、无后端、无数据库。

## 4. 运行与验证

```bash
cd app
npm install
npm run dev
```

构建检查：

```bash
npm run typecheck
npm run build
```

验收基线：

- 十页路由均可打开；
- 3D 模型能加载（首次约 33 MB）；
- 鼠标滚轮可缩放，拖动不应旋转；
- 点击脏腑能切换右侧详情；
- 报告页可以打印/另存 PDF；
- 控制台无未处理错误。

## 5. 优化工作方式

### 推荐：同一工作目录、顺序实验

1. 在同一个工作目录开新会话，确保 workspace memory 生效。
2. 先读本文件与 `docs/CHECKPOINT.md`。
3. 从基线建分支：

```bash
git switch -c opt/frontend-<方向> v0.1.0-plan-a
```

4. **一次只做一个方向**，例如：
   - `opt/visual-hierarchy`
   - `opt/3d-performance`
   - `opt/page-motion`
   - `opt/copy-and-flow`
   - `opt/report-polish`
5. 每完成一个可运行版本就提交：

```bash
git add .
git commit -m "feat(ui): ..."
```

6. 满意后合并回 `main` 并打新 tag；不满意直接回 `main`。

### 并行实验（可选）

```bash
git worktree add ../中医可视化-opt -b opt/frontend-<方向> v0.1.0-plan-a
cd ../中医可视化-opt/app
npm ci
npm run dev
```

注意：worktree 是另一个目录，workspace memory 不会自动注入；需要手动读本文件。一个 worktree 只让一个会话写。

## 6. 新会话开场 Prompt

```text
先读 docs/SESSION_HANDOFF.md 和 docs/CHECKPOINT.md，检查 git tag / git status / git log。
基线是 v0.1.0-plan-a，不要直接在 main 上改。
从该 tag 创建 opt/frontend-<方向> 分支，一次只做一个优化方向。
每步运行 npm run typecheck 和 npm run build；不要改模型资产与基线文档。
完成后说明：改了什么、如何验证、如何回滚。
```

## 7. 回滚

### 实验不满意

```bash
git switch main
git branch -D opt/frontend-<方向>
```

### 回到某个文件/整个基线

```bash
git switch --detach v0.1.0-plan-a
# 或
git restore --source=v0.1.0-plan-a -- .
```

### Git 损坏或误删

解压 `docs/CHECKPOINT.md` 中记录的 ZIP 快照到新目录，执行 `npm ci`、`typecheck`、`build`。

### 只靠 memory 不够

MemoryShare 只保存文本指针，不保存代码或模型。不要把 memory 当备份。

## 8. 待优化方向（待填写）

| 方向 | 目标 | 验收 | 分支 |
|---|---|---|---|
| 视觉层级 | 待定 | 待定 | `opt/visual-hierarchy` |
| 3D 性能 | 首屏 8–12 MB，保持器官可读 | 首屏、FPS、加载失败降级 | `opt/3d-performance` |
| 页面动效 | 待定 | 60fps、可关闭 | `opt/page-motion` |
| 文案与流程 | 待定 | 医生 5 分钟可讲完 | `opt/copy-and-flow` |
| 报告 | 待定 | A4 两页内、打印清晰 | `opt/report-polish` |

## 9. 已知限制

- 33 MB 模型首屏偏重，尚未做 LOD/更细粒度懒加载。
- 症状分析是 Mock，不能用于真实诊疗。
- 胃壁四层是示意，不是真实解剖网格。
- 无真实患者数据、无后端、无账号、无审计。
- 报告是浏览器打印，不是服务端 PDF。
- 浏览器 `localStorage` 不随 Git 版本化；回滚代码后如遇状态结构不兼容，可在浏览器执行 `localStorage.removeItem('qihuang-case-v1')` 或重置演示病例。

## 10. 许可与边界

- 代码：项目自有代码；Human Atlas 适配部分遵循其 MIT 许可。
- 解剖数据：BodyParts3D 4.0，CC BY 4.0；应用内保留署名与修改说明。
- 产品边界：沟通/教学示意，不构成诊断、处方或疗效承诺。
- 真实患者数据、医疗合规、商业模型授权需单独评估。

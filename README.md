# 岐黄 · 状态 / 中医数字人体状态可视化系统

方案 A（视觉冲刺）的可运行原型：把四诊、证型、病位、药方与 7/14/30 天变化，转译成医生可解释、患者可理解的人体图层与沟通报告。

## 快速开始

```bash
cd app
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。

真实 DeepSeek 分析需要同时启动本地 BFF：

```bash
cd server
cp .env.example .env.local
# 在 .env.local 填入新的 DEEPSEEK_API_KEY
npm run dev
```

前端 `npm run dev` 会把 `/api` 代理到 `http://127.0.0.1:8787`。没有 Key 时前端保留演示分析，不会把 Key 暴露在浏览器。Key 曾公开暴露时应先撤销/轮换，且不要提交 `.env.local`。

## 生产式本地运行

```bash
cd app
npm run build
cd ..
node server/index.mjs
```

打开 `http://127.0.0.1:8787/`：同一个 Node 进程同时提供前端静态文件和 `/api/analyze`。

Docker 构建和部署选项见 [server/DEPLOYMENT.md](<server/DEPLOYMENT.md>)。

## 当前实现

- 十页闭环：工作台 → 四诊 → 分析 → 数字人体 → 内部观察 → 病位 → 状态 → 药方 → 时间模拟 → 报告。
- 3D 数字人体：公开 Human Atlas / BodyParts3D 4.0 数据（CC BY 4.0），精简为约 10.4 MB、单分块加载。
- **默认不旋转**：OrbitControls 旋转关闭，只保留缩放、图层、器官点选与复位。
- 半透明体表、骨骼/脏腑/血管/神经图层、病位标记、气机/湿象粒子、胃壁四层示意。
- DeepSeek 证型分析（本地 BFF，JSON 校验、红旗规则、限流、失败兜底）。
- 病例、分析运行、药方、报告快照保存到本地 SQLite；工作台有最近病例列表。
- 单医生访问密码 + HttpOnly 会话；病例操作写入审计事件。
- 报告为 A4 打印样式，浏览器打印/另存 PDF。
- **单用户 Backend Lite：没有多用户 RBAC；医生密码在 `server/.env.local`，不要直接公开到公网。**

## 文档

- [项目决策手册](<项目决策手册.md>)
- [模型选型备忘](<模型候选/模型选型.md>)
- [前端说明](<app/README.md>)
- [决策看板](<决策看板.html>)

## 预览

- [工作台](<previews/app-home.png>)
- [数字人体](<previews/app-body.png>)
- [五脏六腑器官布局](<previews/app-body-organ-layout.png>)
- [DeepSeek 分析结果](<previews/app-analysis-deepseek.png>)
- [时间模拟](<previews/app-timeline.png>)
- [患者报告](<previews/app-report.png>)

## 边界

本系统是沟通与教学示意，不构成诊断、处方或疗效承诺。真实患者数据、医疗合规与商业模型授权需单独评估。模型许可见 `app/public/models/human-atlas/ATTRIBUTION.md`。

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

## 当前实现

- 十页闭环：工作台 → 四诊 → 分析 → 数字人体 → 内部观察 → 病位 → 状态 → 药方 → 时间模拟 → 报告。
- 3D 数字人体：公开 Human Atlas / BodyParts3D 4.0 数据（CC BY 4.0），精简为约 10.4 MB、单分块加载。
- **默认不旋转**：OrbitControls 旋转关闭，只保留缩放、图层、器官点选与复位。
- 半透明体表、骨骼/脏腑/血管/神经图层、病位标记、气机/湿象粒子、胃壁四层示意。
- 报告为 A4 打印样式，浏览器打印/另存 PDF。
- 当前为演示数据；分析是 Mock 流程，未接入真实中医大模型。

## 文档

- [项目决策手册](<项目决策手册.md>)
- [模型选型备忘](<模型候选/模型选型.md>)
- [前端说明](<app/README.md>)
- [决策看板](<决策看板.html>)

## 预览

- [工作台](<previews/app-home.png>)
- [数字人体](<previews/app-body.png>)
- [五脏六腑器官布局](<previews/app-body-organ-layout.png>)
- [时间模拟](<previews/app-timeline.png>)
- [患者报告](<previews/app-report.png>)

## 边界

本系统是沟通与教学示意，不构成诊断、处方或疗效承诺。真实患者数据、医疗合规与商业模型授权需单独评估。模型许可见 `app/public/models/human-atlas/ATTRIBUTION.md`。

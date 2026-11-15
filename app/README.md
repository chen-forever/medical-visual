# 岐黄 · 状态 / 中医数字人体

方案 A（视觉冲刺）的可运行前端：十页闭环、公开数字人体、默认不旋转、仅缩放。

## 运行

```bash
cd app
npm install
npm run dev
```

浏览器打开 `http://127.0.0.1:5173/`。

生产构建：

```bash
npm run build
npm run preview
```

## DeepSeek 分析（本地 BFF）

真实 Key 不放在前端。先启动服务端代理：

```bash
cd server
cp .env.example .env.local
# 在 .env.local 填入新的 DEEPSEEK_API_KEY
npm run dev
```

再启动前端：

```bash
cd app
npm run dev
```

Vite 会把 `/api` 代理到 `http://127.0.0.1:8787`。分析页点击「DeepSeek 分析」才会调用 API；没有 Key 或调用失败时保留当前演示分析，并显示可读错误。

生产式本地运行：

```bash
cd app
npm run build
cd ..
node server/index.mjs
```

打开 `http://127.0.0.1:8787/`。Docker 部署见 [DEPLOYMENT.md](<../server/DEPLOYMENT.md>)。

- 服务端：`server/index.mjs`
- 模型：`deepseek-flash`
- 请求方式：JSON Output + 关闭 thinking
- 未配置 Key 时 `/api/health` 返回 `configured: false`
- **不要提交 `.env.local`**；如果 Key 曾在聊天/公开场合出现，应先撤销并重新生成

## 十页路由

| 路由 | 页面 |
|---|---|
| `#/home` | 工作台 |
| `#/patient` | 患者信息与四诊 |
| `#/analysis` | 症状分析与证型候选 |
| `#/body` | 数字人体 |
| `#/inside` | 人体内部观察 |
| `#/lesion` | 病位定位 |
| `#/state` | 当前状态 |
| `#/formula` | 输入药方 |
| `#/timeline` | 7 / 14 / 30 天变化 |
| `#/report` | 患者报告 |

当前实际路由以 `src/App.tsx` 的 `STEPS` 为准。

## 3D 模型

- 数据：**Human Atlas / BodyParts3D 4.0**，成年男性参考解剖，CC BY 4.0。
- 位置：`public/models/human-atlas/`，精简包约 **10.4 MB 几何 / 11.9 MB 目录**，单分块加载。
- 压缩记录：`public/models/human-atlas/COMPRESSION.md`。
- 视角：默认正面，**旋转锁定**，只支持缩放、图层开关和复位。
- 交互：点击脏腑显示名称、中医归属与经络；图层可独立显示/隐藏。
- 器官层：**胃、胆、小肠、大肠、膀胱、心、肺、肝、脾、肾**；体表、骨骼、肌肉为独立基础层。
- 器官位置按五脏六腑参考图做小幅解剖对齐；颜色采用低饱和脏象配色，透明度沿用上个版本。
- 许可与修改说明：`public/models/human-atlas/ATTRIBUTION.md`、`HUMAN_ATLAS_LICENSE.txt`。
- 说明：模型是公开参考解剖，不是患者个体扫描；胃壁四层为示意色带，不是真实四层网格。

## 数据与边界

- 当前为演示数据，所有病例、证型、药方均保存在本机浏览器（Zustand persist）。
- 症状分析为 Mock 流程，未接入真实中医大模型 API。
- 系统不诊断、不自动开方、不承诺疗效；时间轴是示意推演。
- 真实患者姓名、电话、身份证、人脸照片不应录入。

## 目录

```text
app/
├─ public/models/human-atlas/   # 公开解剖模型与许可
├─ src/
│  ├─ anatomy/                   # 模型加载、Three.js 场景
│  ├─ components/                # 共用视觉组件
│  ├─ pages/                     # 十页
│  ├─ data.ts                    # 演示数据
│  ├─ store.ts                   # 病例状态
│  └─ styles.css                 # 设计系统
```

## 下一步

1. 接入真实中医大模型 API（服务端代理，输出结构化 JSON）。
2. 把 Mock 分析替换为规则引擎 + 模型候选，并保留证据编辑。
3. 增加模型首屏分包/减面，目标首屏 8–12 MB。
4. 补真实胃壁四层网格与经络走行审核。
5. 报告导出改为服务端 PDF（可选），当前使用浏览器打印。

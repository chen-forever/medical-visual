# 岐黄 · 状态 / Qihuang State

> 中医数字人体状态可视化与医患沟通工具  
> 十页闭环 · 3D 数字人体 · DeepSeek 证型分析 · 本地 SQLite 后端

![工作台](<previews/app-home.png>)

## 它是什么

把一次四诊转译成医生讲得清、患者看得懂的人体图层与时间模拟：

- 望闻问切采集；
- DeepSeek 生成证型候选、证据与红旗筛查；
- 3D 人体病位、器官状态、粒子与 7 / 14 / 30 天变化；
- 药方记录；
- A4 患者报告；
- 病例、分析、药方、报告快照保存到本地 SQLite。

系统用于沟通与教学示意，**不是诊断工具，不自动开方，不承诺疗效**，所有结论都需要医生确认。

## 30 秒运行

前置条件：**Node.js 24**（`node --version` 显示 v24）。

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

不需要 Git LFS、数据库、Docker 或本地大模型。首次启动会自动创建 `server/data/qihuang.sqlite`。

## 可选配置

### 设置固定登录密码

```bash
npm run auth:set-password
```

密码只写入 `server/.env.local`，不进入浏览器和 Git。重启 server 后生效。

### 接入真实 DeepSeek

编辑 `server/.env.local`：

```text
DEEPSEEK_API_KEY=你的新Key
```

不填 Key 时仍可运行并查看演示分析，页面会提示未配置。不要把 Key 发到聊天或提交到 Git。

### 查看数据库

```bash
npm run db:info
```

默认位置：

```text
server/data/qihuang.sqlite
```

## 页面对应

| 路由 | 页面 |
|---|---|
| `#/home` | 工作台、最近病例 |
| `#/patient` | 患者信息与四诊 |
| `#/analysis` | 症状分析与证型候选 |
| `#/body` | 数字人体 |
| `#/inside` | 内部观察 |
| `#/lesion` | 病位定位与自动保存 |
| `#/state` | 当前状态 |
| `#/formula` | 输入药方 |
| `#/timeline` | 7 / 14 / 30 天变化 |
| `#/report` | 患者报告、审计记录 |

## 技术栈

- Vite 8 + React 19 + TypeScript
- Three.js 0.187 + React Three Fiber
- Zustand
- Node 24 内置 `http` + `node:sqlite`
- DeepSeek `deepseek-flash`

## 3D 模型

- Human Atlas / BodyParts3D 4.0，CC BY 4.0；
- 压缩为约 **10.37 MB** 单分块；
- 约 64.7 万三角形；
- 默认锁定旋转，只保留缩放、图层、复位；
- 器官层：胃、胆、小肠、大肠、膀胱、心、肺、肝、脾、肾；
- 体表、骨骼、肌肉为独立基础层；
- 模型是公开成年男性参考解剖，不是患者个体扫描。

详见 [模型压缩记录](<app/public/models/human-atlas/COMPRESSION.md>)、[署名](<app/public/models/human-atlas/ATTRIBUTION.md>)。

## 验证

```bash
npm test
```

包含：

- 服务端 24 个测试；
- 前端 TypeScript 检查；
- 模型资产校验（防止 Git LFS 指针混入）。

## 文档

- [项目工作总结](<docs/PROJECT_SUMMARY.md>)
- [跨电脑运行](<docs/REPRODUCIBILITY.md>)
- [GitHub 发布](<docs/GITHUB_PUBLISH.md>)
- [资产与许可](<docs/ASSETS.md>)
- [前端说明](<app/README.md>)
- [服务端说明](<server/README.md>)

## 预览

- [工作台](<previews/app-home.png>)
- [数字人体](<previews/app-body.png>)
- [五脏六腑器官布局](<previews/app-body-organ-layout.png>)
- [DeepSeek 分析结果](<previews/app-analysis-deepseek.png>)
- [时间模拟](<previews/app-timeline.png>)
- [患者报告](<previews/app-report.png>)

## 已知限制

- 单医生后端，没有多用户 RBAC；
- 默认只监听 `127.0.0.1`，不要直接公网暴露；
- SQLite 适合单实例；
- 报告 PDF 仍由浏览器打印；
- 中医内容与经络、药方仍需专业审核；
- 7 / 14 / 30 天是示意模拟，不是疗效预测。

## 边界与许可

- 3D 模型许可见 `app/public/models/human-atlas/ATTRIBUTION.md`；
- 第三方带水印参考图默认不提交；
- 代码仓库当前没有单独声明开源许可证；公开前请作者确认。

## 开发模式

```bash
# 终端 1
cd server
npm run dev

# 终端 2
cd app
npm run dev
```

开发地址：`http://127.0.0.1:5173/`；Vite 会把 `/api` 代理到 `8787`。

# 项目工作总结

> 项目：岐黄 · 状态 / Qihuang State  
> 类型：中医数字人体状态可视化与医患沟通工具  
> 当前发布线：`release/github-v0.2.0`，tag `v0.2.0`  
> 更新日期：2026-11-15

## 1. 项目目标

把一个患者的四诊信息、证型候选、病位、药方与 7 / 14 / 30 天变化，
转译成医生讲得清、患者看得懂的人体图层与时间模拟。

系统不是诊断工具，不自动开方，不承诺疗效。所有结果都需要医生确认。

## 2. 已完成能力

### 2.1 十页闭环

| 路由 | 页面 |
|---|---|
| `#/home` | 工作台、最近病例 |
| `#/patient` | 患者信息与望闻问切 |
| `#/analysis` | DeepSeek 证型分析、证据、红旗筛查 |
| `#/body` | 数字人体 |
| `#/inside` | 内部观察 |
| `#/lesion` | 病位标记与自动保存 |
| `#/state` | 当前状态、粒子与气机 |
| `#/formula` | 药方记录 |
| `#/timeline` | 7 / 14 / 30 天人体变化 |
| `#/report` | A4 患者报告、审计记录 |

### 2.2 3D 数字人体

- 公开人体解剖数据：Human Atlas / BodyParts3D 4.0；
- 许可：CC BY 4.0，见 `app/public/models/human-atlas/ATTRIBUTION.md`；
- 压缩后：约 10.37 MB 几何、单分块；
- 约 64.7 万三角形；
- 默认锁定旋转，只保留缩放、图层、复位；
- 体表、骨骼、肌肉基础层；
- 胃、胆、小肠、大肠、膀胱、心、肺、肝、脾、肾 10 个器官层；
- 器官点选、中医归属、经络说明；
- 病位标记、连线、粒子与时间轴动画；
- 胃壁四层为示意色带，不是真实四层网格；
- 不是患者个体扫描，是成年男性参考解剖。

详细压缩记录：`app/public/models/human-atlas/COMPRESSION.md`。

### 2.3 DeepSeek 分析

- 服务端代理，Key 不进入浏览器；
- 模型：`deepseek-flash`；
- JSON Output；
- 关闭 thinking；
- 超时、一次重试、错误映射；
- 红旗规则优先于模型；
- 运行记录写入 SQLite；
- 没有 Key 时保留演示分析，不白屏。

### 2.4 本地后端

技术：

- Node 24 内置 `http`；
- Node 24 内置 `node:sqlite`；
- 无 ORM、无额外运行时依赖；
- 同一进程提供 `/api` 和构建后的前端。

数据表：

- `cases`：病例、四诊、病位、版本；
- `analyses`：每次证型分析；
- `formulas`：药方；
- `reports`：不可变报告快照；
- `events`：病例操作审计。

数据库默认位置：

```text
server/data/qihuang.sqlite
```

可用 `npm run db:info` 查看绝对路径和记录数。

### 2.5 登录、审计、病位自动保存

- 单医生访问密码；
- HMAC 签名 HttpOnly Cookie；
- 12 小时会话；
- 登录限流；
- 病例版本冲突返回 409；
- 病位独立 `lesionVersion`，修改病位不会让证型分析失效；
- 病位修改自动保存；
- 报告页显示本病例操作记录；
- 固定密码设置命令：`npm run auth:set-password`。

## 3. 架构

```text
浏览器
  │  React 19 + Vite 8 + Three.js
  │
  ├── GET /api/cases / reports ... ──┐
  ├── POST /api/auth/login           │
  └── POST /api/cases/:id/analyze    │
                                     ▼
                           Node 24 BFF
                           ├─ 静态 app/dist
                           ├─ SQLite
                           └─ DeepSeek API
```

## 4. 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19、TypeScript、Vite 8 |
| 3D | Three.js 0.187、React Three Fiber、Drei |
| 状态 | Zustand |
| 图标 | lucide-react |
| 后端 | Node 24、内置 http、node:sqlite |
| AI | DeepSeek `deepseek-flash` |
| 测试 | Node test runner、TypeScript、Vite build |

## 5. 已完成验证

- 服务端测试：**24 个通过**；
- 前端 `typecheck`：通过；
- 前端 `build`：通过；
- DeepSeek 真实请求：通过；
- 病例创建、读取、更新、分析、药方、报告快照：通过；
- 登录、错误密码、未登录 401：通过；
- 病位自动保存与审计：通过；
- 服务重启后病例仍存在：通过；
- 生产式单端口运行：通过。

## 6. 已知限制

- 单用户后端，没有多用户角色/RBAC；
- 服务默认只监听 `127.0.0.1`，不建议直接公网暴露；
- SQLite 适合单实例，不适合多实例并发；
- 报告 PDF 仍由浏览器打印；
- 没有报告分享页；
- 没有服务端影像/舌象上传；
- 中医证型、经络、药方仍需专业审核；
- 3D 模型是公开参考解剖，不是患者个体；
- 7 / 14 / 30 天为示意模拟，不是疗效预测；
- 代码仓库没有单独选择开源许可证；模型许可见 `ATTRIBUTION.md`。

## 7. 后续路线

1. 多用户/RBAC 与更完整的审计后台；
2. 报告分享链接、撤销与只读页；
3. 服务端 PDF；
4. PostgreSQL 与备份/监控；
5. 真实中医内容审核与病例随访；
6. 云端部署、HTTPS、域名与合规评估。

## 8. 相关文档

- `README.md`：快速开始
- `docs/REPRODUCIBILITY.md`：跨电脑运行
- `docs/GITHUB_PUBLISH.md`：发布步骤
- `docs/ASSETS.md`：资产与版权
- `docs/requirements/`：原始需求变更
- `server/README.md`：后端 API
- `app/README.md`：前端说明

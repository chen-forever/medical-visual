# 资产与许可 / Assets

## 3D 模型

- 数据：Human Atlas / BodyParts3D 4.0
- 许可：CC BY 4.0
- 位置：`app/public/models/human-atlas/`
- 文件：
  - `atlas.json`
  - `body-core.bin.gz`（约 10.37 MB，普通 Git 文件，不依赖 LFS）
- 许可全文：`app/public/models/human-atlas/HUMAN_ATLAS_LICENSE.txt`
- 署名与修改说明：`app/public/models/human-atlas/ATTRIBUTION.md`
- 压缩记录：`app/public/models/human-atlas/COMPRESSION.md`

模型是公开参考解剖，不是患者个体扫描。

## 参考图

根目录的 `微信图片_20261115181546_84_2.jpg` 带第三方水印，默认不提交。
它只作为内部设计参考；公开或商用前需确认授权。

## Excel 规则表

`docs/reference/证型-视觉映射规则表_完整版.xlsx` 由项目作者提供，
不是运行时依赖。代码只实现了其中一部分映射，临床使用前需中医师审核。

## 截图

`previews/` 中的图片是项目演示截图，使用演示病例，不含真实患者信息。

## 代码许可证

当前仓库没有单独声明代码开源许可证。
如果改为公开仓库，需要作者先决定许可证，并复核第三方资源。

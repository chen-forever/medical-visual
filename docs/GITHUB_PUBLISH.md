# GitHub 发布 / Publishing

## 仓库建议

- 名称：`qihuang-state`
- 可见性：先 Private
- 不要初始化 README、.gitignore 或 License
- 默认分支：`main`

## 前置检查

```bash
git status
git lfs ls-files
git cat-file -s HEAD:app/public/models/human-atlas/body-core.bin.gz
```

期望：

- `.env.local`、`server/data`、`app/node_modules` 不出现；
- `git lfs ls-files` 为空；
- 模型大小约 10,875,562 bytes。

## 合并与标签

```bash
git checkout main
git merge --ff-only release/github-v0.2.0
git tag -a v0.2.0 -m "Qihuang State v0.2.0"
```

## 添加 remote

```bash
git remote add origin https://github.com/<用户名>/qihuang-state.git
git push -u origin main
git push origin v0.2.0
```

第一次 push 会打开 Git Credential Manager 浏览器登录。不要使用带 Token 的 URL。

只推送 `main` 和 `v0.2.0`，不要推送旧 `opt/*` 分支与 `v0.1.0-plan-a` 标签，避免把旧 LFS 依赖带入下载体验。

## 推送后验证

1. GitHub 网页确认 `app/public/models/human-atlas/body-core.bin.gz` 约 10.37 MB；
2. Actions 为绿色；
3. 从 GitHub 重新 clone；
4. 不安装 Git LFS，运行 `npm run setup && npm start`；
5. 打开 `http://127.0.0.1:8787/`；
6. 打开 3D 人体确认模型加载；
7. 下载 Code → Download ZIP，解压后确认模型存在。

## Release

可以在 GitHub 网页基于 `v0.2.0` 创建 Release：

- 标题：`v0.2.0 — 本地后端与可复现发布`
- 说明：链接 `README.md`、`docs/PROJECT_SUMMARY.md`、`docs/REPRODUCIBILITY.md`
- 不需要额外上传二进制；源码 ZIP 已包含模型。

## 注意

- 不提交 `.env.local`、数据库、API Key、登录密码、Session Secret；
- 参考图 `微信图片_20261115181546_84_2.jpg` 因第三方水印默认不提交；
- 如果仓库改为 Public，先复核医学表述、第三方资源与代码许可证。

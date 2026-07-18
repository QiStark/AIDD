# 部署速查

## 本地预览（实时热更新）

```bash
pnpm dev
# 访问 http://localhost:3000/MyBlog
# Ctrl+C 停止
```

## 部署上线

提交并推送，触发 GitHub Actions 自动构建发布：

```bash
git add -A && git commit -m "post: 你的提交信息" && git push origin main
```

## 一键流程（写完笔记后）

```bash
pnpm dev                                                       # 本地预览确认
# Ctrl+C 停止后：
git add -A && git commit -m "post: 新增/更新内容" && git push origin main
```

## 常见坑

- `public/` 里的静态资源在代码中引用时要手动加 `/MyBlog` 前缀（如 `metadata.icons`、`<img src>`）。
  `next/link` 会自动加 basePath，但 metadata 与原始 HTML 标签不会。
- favicon 路径例：`icon: '/MyBlog/icon.svg'`，写成 `/icon.svg` 会在静态导出后 404。
- **`src/app/favicon.*` / `src/app/icon.*` 文件约定在 `output: 'export'` 下可能不被复制到 `out/`，导致线上 404。**
  推荐做法：把图标放 `public/<name>.<ext>`，在 `metadata.icons` 里手动写 `/MyBlog/<name>.<ext>`。

## 查看部署状态

- Actions 构建进度：https://github.com/QiStark/MyBlog/actions
- 线上站点：https://qistark.github.io/MyBlog/
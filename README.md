# 💕 情侣待办

和你爱的人一起管理待办事项，实时同步。

## 功能

- 📝 创建/编辑/删除待办事项
- ✅ 勾选标记完成
- 🔄 **实时同步** — 你添加/勾选/删除，对方立刻看到
- 🔗 6位数字房间号，创建或加入房间即可共享

## 技术栈

- **前端**: 原生 HTML/CSS/JS（单页应用，手机端优化）
- **后端**: Node.js + Express + WebSocket
- **数据库**: SQLite

## 本地运行

```bash
# 安装依赖
npm install

# 启动（后端 + 前端）同时提供
npm run dev
```

打开 `http://localhost:3001` 即可使用。

## 部署

### Render

1. 在 [render.com](https://render.com) 创建 Web Service
2. 连接 GitHub 仓库
3. 设置：
   - Root Directory: 留空
   - Build Command: `npm install`
   - Start Command: `node server/index.js`
   - 免费套餐即可

### 注意事项

- SQLite 数据库会随部署重启而清空（Render 免费 tier 不持久化磁盘）
- 如果需要持久化，可升级到 Render 付费套餐，或改用 [Neon](https://neon.tech) PostgreSQL

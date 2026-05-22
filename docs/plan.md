# 🧑‍🤝‍🧑 情侣待办 App 实现计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 构建一个情侣共用的待办清单 app——两人各自用自己的手机登录同一份清单，勾选/新增/删除实时同步给对方。

**Architecture:**
- **前端**: 网页版 SPA (简单 HTML + 原生 JS，用 CDN 加载的 Vue 或直接原生)
- **后端**: Node.js + Express + WebSocket + SQLite (better-sqlite3)
- **实时同步**: WebSocket 长连接，服务端广播变更事件
- **认证**: 6位数字房间码——创建房间或加入房间

**Tech Stack:**
- 后端: Node.js, Express, ws, better-sqlite3, 6位随机数字码
- 前端: 原生 HTML/CSS/JS（单页应用，纯静态，可部署到 Vercel/Netlify）
- 部署: Render (后端) + Vercel (前端)

---

### Task 1: 搭建后端项目骨架

**Objective:** 创建 Node.js 后端项目，建立基础结构

**Files:**
- Create: `server/package.json`
- Create: `server/index.js` (入口)
- Create: `server/db.js` (数据库初始化)

**Step 1: 创建项目目录和 package.json**

```json
{
  "name": "couple-todo-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0",
    "better-sqlite3": "^9.4.3",
    "uuid": "^9.0.0",
    "cors": "^2.8.5"
  }
}
```

**Step 2: 创建 db.js**
- 创建 SQLite 数据库文件，初始化两张表：
  - `rooms`: id (TEXT PK), created_at (DATETIME)
  - `todos`: id (TEXT PK), room_id (TEXT FK), text (TEXT), done (INTEGER 0/1), created_at (DATETIME)

**Step 3: 创建 index.js**
- Express 服务器监听 3001 端口
- 挂载 WebSocket 服务器
- CORS 允许所有来源
- JSON body parser

**Step 4: 验证**
Run: `cd server && npm install && node index.js`
Expected: 服务启动，无报错，可通过 curl 访问

---

### Task 2: 实现房间 API

**Objective:** 提供「创建房间」和「加入房间」接口

**Files:**
- Modify: `server/index.js`
- Modify: `server/db.js`

**Step 1: 创建房间 API**

```
POST /api/rooms
Body: {}  (无参数)
Response: { roomId: "xxx-xxx" }
```

- 生成一个 uuid 作为 roomId
- 插入 rooms 表
- 返回 roomId

**Step 2: 验证房间存在 API**

```
GET /api/rooms/:roomId
Response: { exists: true/false }
```

**Step 3: 验证**
- `curl -X POST http://localhost:3001/api/rooms` → 返回 roomId
- `curl http://localhost:3001/api/rooms/<id>` → `{ exists: true }`

---

### Task 3: 实现待办 CRUD API

**Objective:** 提供待办事项的增删改查 REST API

**Files:**
- Modify: `server/index.js`

**Step 1: 获取房间所有待办**

```
GET /api/rooms/:roomId/todos
Response: [{ id, text, done, created_at }, ...]
```

**Step 2: 新增待办**

```
POST /api/rooms/:roomId/todos
Body: { text: "买菜" }
Response: { id, text, done: false, created_at }
```

**Step 3: 切换完成状态**

```
PATCH /api/rooms/:roomId/todos/:todoId
Body: { done: true/false }
Response: { id, text, done, created_at }
```

**Step 4: 删除待办**

```
DELETE /api/rooms/:roomId/todos/:todoId
Response: { success: true }
```

**Step 5: 编辑待办文本**

```
PUT /api/rooms/:roomId/todos/:todoId
Body: { text: "新文本" }
Response: { id, text, done, created_at }
```

**Step 6: 验证**
- 增删改查全部用 curl 测试一遍

---

### Task 4: 实现 WebSocket 实时推送

**Objective:** 当一个人操作待办时，服务端通过 WebSocket 通知另一个人

**Files:**
- Create: `server/websocket.js`
- Modify: `server/index.js`

**设计思路：**
- 客户端连接 WS 时发送 `{ type: "join", roomId: "xxx" }`
- 服务端维护一个 roomId → Set<WebSocket> 的映射
- 每次 CRUD 操作后，向房间内其他客户端广播事件
- 广播事件类型：`todo:created` / `todo:updated` / `todo:deleted`

**事件格式：**
```json
// 服务端 → 客户端
{ "type": "todo:created", "todo": { ... } }
{ "type": "todo:updated", "todo": { ... } }
{ "type": "todo:deleted", "todoId": "..." }
```

**验证：**
- 开两个 WebSocket 客户端连接同一个 roomId
- 一个客户端增删改，另一个应收到实时推送

---

### Task 5: 初始化 React Native (Expo) 项目

**Objective:** 创建 Expo 项目骨架，安装依赖

**Files:**
- Create: `mobile/` (Expo 项目)

**步骤：**
1. `npx create-expo-app@latest mobile --template blank`
2. `cd mobile && npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context`
3. 安装 socket.io 客户端: `npm install socket.io-client`
4. 简单测试：`npx expo start` 确认能跑

**注意：** 这里用 socket.io-client 而非原生 ws 库，因为 RN 对 WebSocket 支持良好但 socket.io 更方便处理重连。

---

### Task 6: 实现登录/加入房间页面

**Objective:** 第一个页面——创建房间或输入房间号加入

**Files:**
- Create: `mobile/screens/HomeScreen.js`

**功能：**
- 两个输入框模式：
  1. 「创建房间」按钮 → 调用 POST /api/rooms → 进入清单页
  2. 「加入房间」输入框 + 按钮 → 输入房间号 → 调用 GET /api/rooms/:roomId 验证 → 进入清单页
- 输入框不允许为空
- 房间号显示为简短易读的格式（截取 uuid 前 8 位，或者在创建时生成 6 位数字码）

**改进建议：** 改为生成 6 位数字房间码（纯数字，方便输入），而不是 uuid。

**Step: 修改后端**
- POST /api/rooms 返回 `{ roomId: "123456" }`（生成 6 位随机数字）
- GET /api/rooms/:roomId 验证存在

**路由设计：**
- 使用 React Navigation Stack
- HomeScreen → TodoScreen

---

### Task 7: 实现待办清单主界面

**Objective:** 核心功能——显示、新增、勾选、删除、编辑待办

**Files:**
- Create: `mobile/screens/TodoScreen.js`
- Create: `mobile/hooks/useTodoSocket.js`

**功能清单：**
1. 顶部显示「情侣待办清单」标题 + 房间号
2. 输入框 + 添加按钮 ↕️ 底部固定
3. 列表显示所有待办，每条包含：
   - 勾选框（点击切换 done）
   - 文本（点击可编辑）
   - 删除按钮（叉号或滑动删除）
   - 已完成的项目显示删除线 / 灰色
4. 下拉刷新（获取最新列表）
5. WebSocket 实时接收变更

**useTodoSocket Hook：**
- 连接 `ws://<server-url>`
- join 房间
- 监听 todo:created / todo:updated / todo:deleted
- 暴露 todos state + addTodo / toggleTodo / deleteTodo / updateTodo 函数
- 函数内部先调用 REST API，服务端再广播给另一方

**UI 设计建议（情侣感）：**
- 粉色/暖色主题
- app 名字加 ❤️
- 空状态显示「写下你们的第一个小目标吧～」

---

### Task 8: 部署后端到免费平台

**Objective:** 部署后端到 Railway 或 Render

**选择：** Render 免费 tier 更稳定（Web Service + 免费 512MB RAM）

**步骤：**
1. 在 `server/` 下创建 `Dockerfile` 或使用 Render 原生 Node.js 部署
2. 数据库用 SQLite 文件存于 `/data/` 或使用临时文件（Render 免费 tier 不持久化磁盘，重启会丢数据——可以做提醒或换用更好的方案）
3. 或者改用 PostgreSQL + Neon 免费 tier（持久化），前端代码只需改一个连接地址

**替代方案：** 使用 Vercel Serverless Functions + Vercel KV (Redis) 做实时同步… 但 WebSocket 在 Serverless 上较复杂。建议保持 Express + WebSocket 部署到 Render。

---

### Task 9: 最终验证 + 使用文档

**Objective:** 端到端测试，写 README

**步骤：**
1. 两台手机（或模拟器）分别连接同一房间
2. 测试全流程：创建 → 新增待办 → 勾选 → 编辑 → 删除
3. 确认实时同步在两台设备上生效
4. 写 README 包含：
   - 项目介绍
   - 启动方式（后端 + 前端）
   - 打包 APK/IPA 发布指引

---

## 总结

| 任务 | 内容 | 预计复杂度 |
|------|------|-----------|
| 1 | 后端项目骨架 | ⭐ |
| 2 | 房间 API | ⭐ |
| 3 | 待办 CRUD API | ⭐⭐ |
| 4 | WebSocket 实时推送 | ⭐⭐ |
| 5 | Expo 项目初始化 | ⭐ |
| 6 | 登录/加入房间页面 | ⭐⭐ |
| 7 | 待办清单主界面 + 实时同步 | ⭐⭐⭐ |
| 8 | 部署后端 | ⭐⭐ |
| 9 | 验证 + 文档 | ⭐ |


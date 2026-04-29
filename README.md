# AI 工单系统

一站式 AI 知识教程 + 工单管理平台 —— 教程中心、FAQ、工单系统、VIP 会员

> **"未来将是无人工"**

---

## 关于本系统

<details>
<summary>🇬🇧 Click for English</summary>

This system was born from a very real pain point — **after-sales support overload**.

In daily operations, repetitive questions drain support teams: "How do I use this?" "Where do I configure that?" "Why is it broken?" Behind every question is a confused user, and behind every answer is a support agent's precious time.

So I built this system.

The core idea is simple: **turn common questions into tutorials, transform repetitive answers into self-service.** Users search the tutorial center first, browse the FAQ, or submit structured tickets with context — no more vague "help me check this" requests.

Future plans include AI integration: auto-answering, smart tutorial recommendations, automated ticket classification... Let the system absorb 80% of repetitive inquiries, so support teams focus only on what truly needs human intervention.

> **Less support anxiety, more product time.**

</details>

这套系统源于一个很现实的痛点——**售后压力**。

在公司日常运营中，大量重复的咨询问题占据了售后团队大部分精力："这个怎么用？""那里怎么配置？""为什么出错了？" 每一个问题背后都是一个真实用户的困惑，也是一次售后人员的时间消耗。

所以我做了这个系统。

核心思路很简单：**把常见问题变成教程，把重复解答变成自助查找。** 用户遇到问题先来教程中心搜一搜，FAQ 翻一翻，工单提交也带着上下文信息，售后团队收到的不再是"帮我看看"这种模糊请求，而是有类型、有描述、有附件的结构化工单。

未来计划接入 AI 能力：自动问答、智能推荐教程、工单自动分类……让系统能自主消化掉 80% 的重复咨询，让售后人员真正只处理那些需要人工介入的问题。

> 做这个系统的本心就一句话：**少一点售后焦虑，多一点产品时间。**

### 🤖 AI 路线图

最终目标是让 AI 吃掉整个知识库，变成一个真正的智能售后助手：

- 🧠 **知识库投喂** — 将教程、FAQ、工单记录全部结构化，作为 AI 的训练语料
- 💬 **智能问答** — 用户直接提问，AI 从知识库中检索答案，无需人工介入
- 📌 **教程推荐** — 根据用户提问，自动推荐相关教程
- 🎫 **工单自动分类** — AI 自动识别工单类型、紧急程度，分配合适的售后人员
- 📊 **知识库自愈** — 发现知识库缺失的内容，自动生成草稿供管理员审核

---

## 功能概览

### 前台（用户端）

| 页面 | 说明 |
|------|------|
| 🏠 **首页** | 搜索教程、分类导航、最新教程、FAQ |
| 📚 **教程中心** | 分类筛选、搜索、卡片列表 (支持 VIP 专属内容) |
| ❓ **FAQ** | 搜索、分类筛选、手风琴动画展开 |
| 🎫 **工单提交** | 工单类型选择、附件上传(图片/视频/文件)、工单记录 |
| 🔐 **登录/注册** | 手机号 + 密码注册登录 (独立前台用户体系) |

### 后台（管理端）— `/admin-login`

| 页面 | 说明 |
|------|------|
| 📊 **仪表盘** | 统计数据 (教程/FAQ/用户数) |
| 📝 **教程管理** | 增删改查 + 富文本编辑器 (WangEditor)、VIP 专属开关 |
| ❓ **FAQ 管理** | 增删改查 + 弹窗编辑 |
| 👥 **用户管理** | 前台用户列表、VIP 状态管理 |
| ⭐ **VIP 会员** | 设置/取消 VIP、时长管理 |
| 🔐 **管理员管理** | 创建/删除管理员账号 (独立 admin 表) |
| ⚙️ **系统设置** | 网站信息、短信平台、微信登录、飞书集成 |

### 预置内容

- **8 篇教程**：抖音/快手/小红书/微信养号攻略（每篇千字真实内容）
- **6 条 FAQ**：常见问题
- **管理员账号**：`admin` / `admin123`
- **测试用户**：`13800000000` / `user123`

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | 双 JWT (前后台独立密钥) |
| 编辑器 | WangEditor (@wangeditor/editor-for-react) 全中文富文本 |
| 短信 | 预留接口（阿里云/腾讯云） |
| 第三方 | 微信扫码登录（预留）、飞书多维表格集成 (工单同步) |
| 存储 | 本地文件系统 / 阿里云 OSS (预留) |

---

## 快速启动

### 前置要求

- Node.js >= 18
- npm

### 1. 启动后端

```bash
cd backend
npm install
node server.js
# 后端运行在 http://localhost:37888
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
```

---

## 登录方式

### 管理员登录

访问 `http://localhost:3000/admin-login`

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

> 管理员和前台用户使用**完全独立的用户表**和 JWT 密钥，登录状态互不影响。

### 前台用户登录

访问 `http://localhost:3000/login`

| 手机号 | 密码 |
|--------|------|
| `13800000000` | `user123` |

---

## API 概览

| 类型 | 端点 | 说明 |
|------|------|------|
| **公开** | `GET /api/tutorials` | 教程列表 |
| | `GET /api/tutorials/:id` | 教程详情 (含 VIP 检查) |
| | `POST /api/tutorials/:id/view` | 增加阅读数 |
| | `GET /api/faqs` | FAQ 列表 |
| | `GET /api/categories` | 分类列表 |
| | `POST /api/ai/ask` | AI 问答 |
| **用户** | `POST /api/auth/register` | 注册 |
| | `POST /api/auth/login` | 登录 |
| | `GET /api/auth/me` | 获取用户信息 |
| | `POST /api/tickets` | 提交工单 (含飞书同步) |
| | `GET /api/user/tickets` | 我的工单 |
| **管理** | `POST /api/admin/auth/login` | 管理员登录 (独立表) |
| | `GET/POST/PUT/DELETE /api/admin/tutorials` | 教程 CRUD |
| | `GET/POST/PUT/DELETE /api/admin/faqs` | FAQ CRUD |
| | `GET/PUT /api/admin/settings` | 系统设置 |
| | `GET /api/admin/stats` | 统计 |
| | `GET/POST /api/admin/users` | 前台用户管理 |
| | `PUT /api/admin/users/:id/vip` | VIP 管理 |
| | `GET/POST/DELETE /api/admin/admins` | 管理员账号管理 |
| | `POST /api/upload/file` | 文件上传 |

---

## 项目结构

```
imai-website/
├── backend/
│   ├── server.js              # Express 主入口
│   ├── database/
│   │   └── schema.js          # SQLite 建表 + seed 数据
│   ├── middleware/
│   │   └── auth.js            # 双 JWT 验证 (前台/后台)
│   └── services/
│       └── feishu.js          # 飞书多维表格 API
├── frontend/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # 首页
│   │   ├── tutorials/         # 教程中心
│   │   ├── faq/               # FAQ
│   │   ├── ticket/            # 工单提交
│   │   ├── login/             # 用户登录
│   │   ├── register/          # 用户注册
│   │   ├── admin-login/       # 管理员登录 (独立入口)
│   │   └── admin/             # 管理后台
│   ├── components/
│   │   ├── layout/            # Header, Footer, AdminSidebar
│   │   └── ui/                # Toast, VIPBadge, SettingsModal, RichEditor
│   └── lib/
│       └── api.ts             # API 封装 (前台/后台双 token)
└── scripts/
    └── light-theme.js         # 主题转换脚本
```

---

## 数据库

采用 SQLite，数据库文件在 `backend/data.db`（已在 .gitignore 中排除）。

### 核心表

| 表 | 说明 |
|----|------|
| `users` | 前台用户 (phone, password, nickname, vip) |
| `admins` | 后台管理员 (username, password, nickname, role) |
| `tutorials` | 教程 (title, category, content, vip_only) |
| `faqs` | FAQ (question, answer, category) |
| `tickets` | 工单 (title, description, attachments, user_id) |
| `categories` | 分类 (name, icon) |
| `settings` | 系统设置 (key-value) |
| `knowledge_base` | 知识库 (预留) |

首次启动自动建表并写入 seed 数据。

---

## Docker 部署

### 前置要求

- Docker & Docker Compose

### 一键启动

```bash
docker-compose up -d --build
# 后端 http://localhost:37888
# 前端 http://localhost:3000
```

### 环境变量

可以在 `docker-compose.yml` 中配置以下环境变量：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | 前台用户 JWT 密钥 | `imai-work-dev-key-2024` |
| `ADMIN_JWT_SECRET` | 管理员 JWT 密钥 | `imai-admin-secret-key-2024` |
| `CORS_ORIGIN` | 允许的跨域来源 | `http://localhost:3000` |

数据持久化：
- 数据库文件保存在 Docker volume `backend-data` 中
- 上传文件保存在 Docker volume `backend-uploads` 中

### 手动构建

```bash
# 后端
docker build -t ai-ticket-backend ./backend
docker run -d -p 37888:37888 -v backend-data:/app/data -v backend-uploads:/app/uploads ai-ticket-backend

# 前端
docker build -t ai-ticket-frontend ./frontend
docker run -d -p 3000:3000 ai-ticket-frontend
```

---

## License

MIT

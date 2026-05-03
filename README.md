# AI 工单系统

一站式 AI 知识教程 + 智能客服 + 工单管理平台 —— 教程中心、FAQ、AI 客服、工单系统、VIP 会员

> **"未来将是无人工"**

---

## 关于本系统

<details>
<summary>🇬🇧 Click for English</summary>

This system was born from a very real pain point — **after-sales support overload**.

In daily operations, repetitive questions drain support teams: "How do I use this?" "Where do I configure that?" "Why is it broken?" Behind every question is a confused user, and behind every answer is a support agent's precious time.

So I built this system.

The core idea: **turn common questions into tutorials, transform repetitive answers into AI-powered self-service.** Users first chat with the AI assistant (imai小助手), which answers from a structured knowledge base. If the AI can't solve it, the conversation auto-converts into a structured ticket with full context.

Future plans include RAG-powered knowledge retrieval, multi-modal understanding (images/videos), and auto-generated content.

> **Less support anxiety, more product time.**

</details>

这套系统源于一个很现实的痛点——**售后压力**。

在公司日常运营中，大量重复的咨询问题占据了售后团队大部分精力："这个怎么用？""那里怎么配置？""为什么出错了？" 每一个问题背后都是一个真实用户的困惑，也是一次售后人员的时间消耗。

所以我做了这个系统。

核心思路：**把常见问题变成教程，把重复解答交给 AI。** 用户遇到问题先问 imai小助手，AI 从知识库中检索答案；如果 AI 解决不了，一键转人工，对话记录自动带入工单，工程师直接看到完整上下文。

> 做这个系统的本心就一句话：**少一点售后焦虑，多一点产品时间。**

---

## ✨ 核心功能

### 🤖 AI 智能客服（imai小助手）

| 功能 | 说明 |
|------|------|
| 💬 **AI 对话** | 打字机效果、图片上传/拖拽、Enter 发送 |
| 📚 **RAG 知识库** | BM25 + 向量混合检索、同义词扩展、自动索引 |
| 📄 **文档导入** | 支持 Word 文档批量导入知识库 |
| 👍👎 **答案评分** | 用户对 AI 回答打分，持续优化 |
| 🔄 **转人工** | 确认弹窗 + 智能标题 + 对话预览，一键转工单 |
| 📜 **历史对话** | 侧边栏查看过往对话记录 |
| ⚙️ **可配置** | 后台设置 AI 服务商、模型、人设、知识库 |

### 🎫 工单系统

| 功能 | 说明 |
|------|------|
| 📋 **看板模式** | 用户端先看工单列表，再提交新工单 |
| 🔍 **后台管理** | 状态筛选、导出 CSV、处理人追踪 |
| 💬 **管理员回复** | 回复内容用户端实时可见 |
| 🏷️ **售后群名** | 关联企业微信群，方便定位客户 |
| 🔔 **通知推送** | 新工单自动推送飞书/企业微信群 |
| 📎 **附件上传** | 支持图片、视频、PDF、文档 |

### 📚 教程 & FAQ

| 功能 | 说明 |
|------|------|
| 📖 **教程中心** | 分类筛选、搜索、VIP 专属内容 |
| ❓ **FAQ** | 手风琴动画、分类筛选、动态分类 |
| ✏️ **富文本编辑** | WangEditor 全中文编辑器 |
| 👑 **VIP 体系** | 教程 VIP 锁定、会员管理 |

### 👥 用户 & 管理

| 功能 | 说明 |
|------|------|
| 🔐 **双用户体系** | 前台用户 + 后台管理员，独立表独立 JWT |
| 📊 **数据仪表盘** | 教程/FAQ/用户/工单 统计 |
| ⚙️ **系统设置** | 分区导航：网站信息、短信、微信、飞书、工单通知、AI 客服、素材生成 |
| 🏷️ **客户分类** | 客户身份标签管理 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| AI | DeepSeek API + BM25/向量混合检索 (RAG) |
| 认证 | 双 JWT (前后台独立密钥) |
| 编辑器 | WangEditor 全中文富文本 |
| 通知 | 飞书/企业微信 Webhook |
| 第三方 | 飞书多维表格集成、微信登录（预留） |

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

## 页面路由

### 前台（用户端）

| 路由 | 说明 |
|------|------|
| `/` | 首页 |
| `/tutorials` | 教程中心 |
| `/faq` | FAQ |
| `/support` | 🤖 imai小助手（AI 客服） |
| `/ticket` | 我的工单（看板模式） |
| `/ticket/:id` | 工单详情 |
| `/login` | 用户登录 |
| `/register` | 用户注册 |

### 后台（管理端）— `/admin-login`

| 路由 | 说明 |
|------|------|
| `/admin` | 仪表盘（含工单统计） |
| `/admin/tutorials` | 教程管理 |
| `/admin/faq` | FAQ 管理 |
| `/admin/users` | 用户管理 |
| `/admin/admins` | 管理员管理 |
| `/admin/levels` | 客户分类 |
| `/admin/tickets` | 🎫 工单管理 |
| `/admin/ai` | 📚 AI 知识库 |
| `/admin/ai/conversations` | 💬 AI 对话记录 |
| `/admin/settings` | ⚙️ 系统设置 |

---

## 登录方式

### 管理员登录

访问 `http://localhost:3000/admin-login`

| 用户名 | 密码 |
|--------|------|
| `admin` | `admin123` |

> 管理员和前台用户使用**完全独立的用户表**和 JWT 密钥。

### 前台用户登录

访问 `http://localhost:3000/login`

| 手机号 | 密码 |
|--------|------|
| `13800000000` | `user123` |

---

## API 概览

### 公开接口

| 端点 | 说明 |
|------|------|
| `GET /api/tutorials` | 教程列表 |
| `GET /api/tutorials/:id` | 教程详情 |
| `GET /api/faqs` | FAQ 列表 |
| `GET /api/categories` | 分类列表 |

### 用户接口

| 端点 | 说明 |
|------|------|
| `POST /api/auth/register` | 注册 |
| `POST /api/auth/login` | 登录 |
| `GET /api/auth/me` | 用户信息 |
| `POST /api/tickets` | 提交工单 |
| `GET /api/user/tickets` | 我的工单 |
| `GET /api/tickets/:id` | 工单详情 |
| `POST /api/ai/conversations` | 创建 AI 对话 |
| `POST /api/ai/chat` | 发送消息 |
| `GET /api/ai/conversations` | 对话历史 |
| `POST /api/ai/messages/:id/rate` | 答案评分 |
| `POST /api/ai/conversations/:id/transfer` | 转人工 |

### 管理接口

| 端点 | 说明 |
|------|------|
| `POST /api/admin/auth/login` | 管理员登录 |
| `GET /api/admin/stats` | 统计数据 |
| `GET/POST/PUT/DELETE /api/admin/tutorials` | 教程 CRUD |
| `GET/POST/PUT/DELETE /api/admin/faqs` | FAQ CRUD |
| `GET/POST /api/admin/users` | 用户管理 |
| `GET/PUT /api/admin/tickets` | 工单管理 |
| `PUT /api/admin/tickets/:id` | 更新工单（状态+回复） |
| `GET/POST/PUT/DELETE /api/admin/ai/knowledge` | 知识库 CRUD |
| `GET /api/admin/ai/conversations` | AI 对话记录 |
| `POST /api/admin/ai/rebuild-index` | 重建 RAG 索引 |
| `GET/PUT /api/admin/settings` | 系统设置 |
| `POST /api/upload/file` | 文件上传 |

---

## 数据库

采用 SQLite，数据库文件在 `backend/data.db`（已在 .gitignore 中排除）。

### 核心表

| 表 | 说明 |
|----|------|
| `users` | 前台用户 |
| `admins` | 后台管理员 |
| `tutorials` | 教程 |
| `faqs` | FAQ |
| `tickets` | 工单（含 reply、processed_by、group_name） |
| `ai_conversations` | AI 对话 |
| `ai_messages` | AI 消息（含评分） |
| `ai_knowledge` | AI 知识库 |
| `settings` | 系统设置 |
| `customer_levels` | 客户分类 |

首次启动自动建表并写入 seed 数据。

---

## 项目结构

```
imai-website/
├── backend/
│   ├── server.js              # Express 主入口（所有路由）
│   ├── database/
│   │   └── schema.js          # SQLite 建表 + 迁移 + seed
│   ├── middleware/
│   │   └── auth.js            # 双 JWT 验证
│   ├── services/
│   │   ├── ai.js              # AI 客服（LLM 调用）
│   │   ├── rag.js             # RAG 检索（BM25 + 向量）
│   │   ├── feishu.js          # 飞书多维表格
│   │   └── notify.js          # 工单通知（Webhook）
│   ├── .env.example           # 环境变量示例
│   └── uploads/               # 上传文件（gitignore）
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # 首页
│   │   ├── tutorials/         # 教程中心
│   │   ├── faq/               # FAQ
│   │   ├── support/           # 🤖 imai小助手
│   │   ├── ticket/            # 工单（看板 + 详情）
│   │   ├── login/             # 登录
│   │   ├── register/          # 注册
│   │   ├── admin-login/       # 管理员登录
│   │   └── admin/
│   │       ├── page.tsx       # 仪表盘
│   │       ├── tutorials/     # 教程管理
│   │       ├── faq/           # FAQ 管理
│   │       ├── users/         # 用户管理
│   │       ├── admins/        # 管理员管理
│   │       ├── levels/        # 客户分类
│   │       ├── tickets/       # 🎫 工单管理
│   │       ├── ai/            # 📚 AI 知识库 + 对话记录
│   │       └── settings/      # ⚙️ 系统设置
│   ├── components/
│   │   ├── layout/            # Header, Footer, AdminSidebar
│   │   └── ui/                # Toast, VIPBadge, SettingsModal
│   └── lib/
│       └── api.ts             # API 封装（前台+后台+AI）
└── docker-compose.yml
```

---

## Docker 部署

```bash
docker-compose up -d --build
# 后端 http://localhost:37888
# 前端 http://localhost:3000
```

---

## 配置说明

### AI 客服配置

在后台 → 设置 → AI 客服中配置：

| 配置项 | 说明 |
|--------|------|
| AI 服务商 | DeepSeek / OpenAI / 通义千问 |
| API Key | 对应平台的密钥 |
| 模型 | 如 `deepseek-chat` |
| AI 人设 | System Prompt，定义 AI 的角色和回答风格 |
| 知识库 | 在 `/admin/ai` 中管理知识条目 |

### 工单通知配置

在后台 → 设置 → 工单通知中配置：

| 配置项 | 说明 |
|--------|------|
| 通知渠道 | 飞书机器人 / 企业微信机器人 |
| Webhook 地址 | 群机器人的 Webhook URL |

---

## License

MIT

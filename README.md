# AI 工单系统

一站式 AI 知识教程 + 工单管理平台 —— 教程中心、FAQ、工单系统、VIP 会员

> **"未来将是无人工"**

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

## License

MIT

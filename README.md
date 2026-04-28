# imai.work 官网

AI 知识教程平台 —— 教程中心 + FAQ + 工单系统 + 用户管理

> **"未来将是无人工"**

## 功能概览

### 前台（用户端）

| 页面 | 说明 |
|------|------|
| 🏠 **首页** | 搜索教程、快捷分类、最新教程、FAQ 手风琴 |
| 📚 **教程中心** | 分类筛选、搜索、卡片列表、Markdown 详情页 |
| ❓ **FAQ** | 搜索、分类筛选、手风琴展开 |
| 🔐 **登录/注册** | 手机号 + 密码注册登录 |

### 后台（管理端）— `/admin`

| 页面 | 说明 |
|------|------|
| 📊 **仪表盘** | 统计数据、最近教程 |
| 📝 **教程管理** | 增删改查 + 富文本 Markdown 编辑器 |
| ❓ **FAQ 管理** | 增删改查 + 弹窗编辑 |
| ⚙️ **系统设置** | 短信平台、微信登录、飞书集成、网站信息 |

### 预置内容

- **8 篇教程**：抖音/快手/小红书/微信养号攻略（每篇千字真实内容）
- **6 条 FAQ**：常见问题
- **管理员账号**：`13800000000` / `admin123`

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT (jsonwebtoken) |
| 编辑器 | @uiw/react-md-editor |
| 短信 | 预留接口（阿里云/腾讯云/七牛云） |
| 第三方 | 微信扫码登录（预留）、飞书集成（预留） |

---

## 快速启动

### 前置要求

- Node.js >= 18（推荐 Node 20+）
- npm >= 9

### 1. 启动后端

```bash
cd backend
npm install
npm start
```

后端运行在 **http://localhost:37888**

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 **http://localhost:3000**

> 前端开发服务器已配置代理，`/api/*` 请求自动转发到后端 37888 端口。

### 3. 访问

- 前台首页：http://localhost:3000
- 后台管理：http://localhost:3000/admin
- 管理员账号：`13800000000` / `admin123`

---

## 项目结构

```
imai-website/
├── backend/                  # Node.js 后端
│   ├── server.js            # Express 主入口（所有路由）
│   ├── database/
│   │   └── schema.js        # SQLite 建表 + seed 数据
│   └── middleware/
│       └── auth.js          # JWT 验证 + 管理员中间件
│
├── frontend/                 # Next.js 前端
│   ├── app/
│   │   ├── page.tsx         # 首页
│   │   ├── tutorials/       # 教程列表/详情
│   │   ├── faq/             # FAQ
│   │   ├── login/           # 登录
│   │   ├── register/        # 注册
│   │   └── admin/           # 后台管理
│   ├── components/
│   │   ├── ui/              # 通用组件（Toast）
│   │   └── layout/          # Header/Footer/AdminSidebar
│   └── lib/
│       └── api.ts           # API 调用封装
│
├── scripts/                  # 工具脚本
│   └── light-theme.js       # 颜色主题替换
│
└── SPEC.md                  # 项目规格文档
```

---

## API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册（phone, password） |
| POST | `/api/auth/login` | 登录（phone, password）→ token |
| GET | `/api/auth/me` | 获取当前用户（需 token） |

### 教程（公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tutorials` | 教程列表（?category=&search=） |
| GET | `/api/tutorials/:id` | 教程详情 |

### FAQ（公开）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/faqs` | FAQ 列表（?category=&search=） |

### 管理（需 admin）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST/PUT/DELETE | `/api/admin/tutorials` | 教程 CRUD |
| POST/PUT/DELETE | `/api/admin/faqs` | FAQ CRUD |
| GET/PUT | `/api/admin/settings` | 系统设置 |

---

## 部署

### 宝塔面板部署

1. 在宝塔「网站」中添加 Node.js 项目
2. 项目目录选 `imai-website/backend/`
3. 启动命令填 `node server.js`
4. 前端用 Nginx 反代到 Next.js（或先 `npm run build` 后跑 `npm start`）
5. 配置 SSL（Let's Encrypt）

### 环境变量

```bash
# 后端配置（可覆盖默认值）
export PORT=37888
export HOST=0.0.0.0
export JWT_SECRET=你的密钥
```

---

## 安全说明

- 数据库文件 (`data.db`) 已在 `.gitignore` 中排除
- `.env` 文件不在版本控制中
- API 密钥、应用凭证建议使用环境变量或后台设置界面配置
- JWT 密钥请在部署时修改

---

## License

MIT

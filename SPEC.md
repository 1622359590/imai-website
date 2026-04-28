# imai.work 官网项目 - 实现规范

## 项目定位
官方网站 + 教程中心（抖音/快手/小红书/微信养号教程）+ FAQ + 工单系统
核心理念："I'm ai work, 未来将是无人工"

## 技术栈
- 后端：Express + better-sqlite3 + jsonwebtoken + bcryptjs + cors
- 前端：Next.js 14 (App Router) + Tailwind CSS + TypeScript

## 目录结构

```
/Users/mahao/imai-website/
├── backend/
│   ├── package.json
│   ├── server.js              # Express 主入口，所有路由在此定义
│   ├── database/
│   │   └── schema.js          # SQLite 建表 + seed 数据
│   └── middleware/
│       └── auth.js            # JWT + admin 中间件
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── app/
│   │   ├── globals.css        # 全局样式 + CSS 变量（科技深色主题）
│   │   ├── layout.tsx         # 根布局（含 Header/Footer）
│   │   ├── page.tsx           # 首页（教程+FAQ 展示）
│   │   ├── tutorials/
│   │   │   ├── page.tsx       # 教程列表
│   │   │   └── [id]/page.tsx  # 教程详情
│   │   ├── faq/page.tsx       # FAQ 列表（手风琴）
│   │   ├── login/page.tsx     # 登录
│   │   ├── register/page.tsx  # 注册
│   │   └── admin/
│   │       ├── layout.tsx     # 管理后台布局（含侧边栏）
│   │       ├── page.tsx       # 仪表盘
│   │       ├── tutorials/
│   │       │   ├── page.tsx   # 教程管理列表
│   │       │   ├── new/page.tsx    # 新建教程（富文本编辑器）
│   │       │   └── [id]/page.tsx   # 编辑教程
│   │       ├── faq/
│   │       │   └── page.tsx   # FAQ 管理
│   │       └── settings/
│   │           └── page.tsx   # 系统设置
│   ├── components/
│   │   ├── ui/
│   │   │   └── Toast.tsx      # Toast 通知组件
│   │   └── layout/
│   │       ├── Header.tsx     # 顶部导航
│   │       ├── Footer.tsx     # 底部
│   │       └── AdminSidebar.tsx # 后台侧边栏
│   └── lib/
│       └── api.ts             # API 封装
```

## 数据库表结构

### users 表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK(role IN ('user','admin')),
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### tutorials 表
```sql
CREATE TABLE tutorials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  summary TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft','published')),
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### faqs 表
```sql
CREATE TABLE faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT '通用',
  sort_order INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','hidden')),
  created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### settings 表
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);
```

## API 设计

### 认证
- POST /api/auth/register - 注册（phone, password）
- POST /api/auth/login - 登录（phone, password）→ 返回 token
- GET /api/auth/me - 获取当前用户信息（需 token）

### 教程（公开）
- GET /api/tutorials - 教程列表（支持 ?category=xxx, ?search=xxx）
- GET /api/tutorials/:id - 教程详情（访问+1）

### 教程管理（需 admin）
- POST /api/admin/tutorials - 新建
- PUT /api/admin/tutorials/:id - 编辑
- DELETE /api/admin/tutorials/:id - 删除

### FAQ（公开）
- GET /api/faqs - FAQ 列表（支持 ?category=xxx, ?search=xxx）

### FAQ 管理（需 admin）
- POST /api/admin/faqs - 新建
- PUT /api/admin/faqs/:id - 编辑
- DELETE /api/admin/faqs/:id - 删除

### 系统设置（需 admin）
- GET /api/admin/settings - 获取所有设置
- PUT /api/admin/settings - 批量保存设置

## 设计规范

### CSS 变量（科技深色主题）
```css
--accent: #00d4ff;
--accent-dim: #0099bb;
--accent-glow: rgba(0,212,255,0.2);
--accent2: #a855f7;
--bg-primary: #050508;
--bg-secondary: #0d0d15;
--bg-card: #111827;
--bg-input: #0a0f1a;
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-muted: #475569;
--border: #1e293b;
--border-bright: #334155;
--success: #10b981;
--error: #ef4444;
```

### Tailwind 配置
- content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}']
- extend colors with above CSS variables
- 自定义动画：fadeInUp, glow-pulse
- 字体：Inter + system-ui

### 后台管理样式
- 侧栏深色（#0d0d15），内容区浅色灰底（#f1f5f9）+ 深色字
- 操作按钮科技蓝
- 表格清清爽爽
- 编辑用弹窗/抽屉
- Toast 即时反馈

### 前台样式
- 全深色，延续 ticket-form 风格
- 卡片 hover 上移发光
- 教程卡片 3 列网格
- FAQ 手风琴
- 动效：fadeInUp + glow-pulse

## Seed 数据

### 管理员账号
- phone: 13800000000, password: admin123, role: admin

### 初始教程数据（预置 8 篇）

1. 抖音养号完整攻略
2. 抖音流量池机制详解
3. 快手养号全攻略
4. 快手直播带货新手必看
5. 小红书账号定位三步法
6. 小红书封面设计教程
7. 微信个人号养号防封攻略
8. 微信朋友圈发圈技巧

### 初始 FAQ 数据（预置 6 条）
各种常见问题，按分类

## 注意事项
1. 所有教程内容请填写真实有用的 Markdown 内容，不要只写占位符
2. JWT 密钥使用默认值 'imai-work-secret-key-2024'
3. 前端在开发时使用 proxy 转发到 localhost:37888
4. 后端监听 37888 端口
5. 确保前后端都能正常启动

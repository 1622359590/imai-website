const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');

const { initSchema, seedData } = require('./database/schema');
const { verifyToken } = require('./middleware/auth');

const app = express();
const PORT = 37888;

// ===== 初始化数据库 =====
initSchema();
seedData();

// ===== 中间件 =====
const corsOptions = {
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:37888'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// 全局限流
app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
}));

// AI 接口单独限流
app.use('/api/ai/chat', rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'AI 对话请求过于频繁，请稍后再试' },
}));

// 全局禁用 API 缓存
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 根路径跳转
app.get('/', (req, res) => { res.redirect('http://localhost:3000'); });

// ===== 文件上传（通用） =====
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, require('crypto').randomBytes(16).toString('hex') + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|mp4|pdf|doc|docx|zip/;
    cb(null, allowedTypes.test(path.extname(file.originalname).toLowerCase()) || allowedTypes.test(file.mimetype));
  },
});

app.post('/api/upload', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname });
});

// 文件上传（带 OSS 检测）
app.post('/api/upload/file', verifyToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请选择文件' });
  res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.originalname, size: req.file.size, storage: 'local' });
});

// 管理员登录（前端调用 /api/admin/auth/login）
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { getDb } = require('./database/schema');
    const { ADMIN_JWT_SECRET } = require('./middleware/auth');
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入管理员账号和密码' });
    const db = getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: '管理员账号或密码错误' });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: '管理员账号或密码错误' });
    const token = jwt.sign({ id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role }, ADMIN_JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '登录失败' });
  }
});

// 路由挂载
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/public'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/user/tickets', require('./routes/user-tickets'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin')); // admin 路由内部已有 verifyAdminToken

// ===== 全局错误处理 =====
app.use((req, res) => { res.status(404).json({ error: '接口不存在' }); });

app.use((err, req, res, next) => {
  console.error('未捕获错误:', err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: '请求体过大' });
  res.status(500).json({ error: '服务器内部错误' });
});

process.on('unhandledRejection', (reason) => { console.error('未处理的 Promise 异常:', reason); });

// ===== 启动服务 =====
const { rebuildIndex: rebuildRagIndex, cleanupLearned } = require('./services/rag');

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   imai.work Backend Server      ║
  ║   Port: ${PORT}                      ║
  ║   Env: development              ║
  ╚══════════════════════════════════╝
  `);

  // 启动时异步重建 RAG 索引
  rebuildRagIndex().catch(e => console.warn('启动时 RAG 索引重建失败:', e.message));

  // 每 5 分钟自动关闭超时对话
  const { getDb } = require('./database/schema');
  setInterval(() => {
    try {
      const result = getDb().prepare(
        "UPDATE ai_conversations SET status = 'closed', updated_at = datetime('now','localtime') WHERE status = 'active' AND updated_at < datetime('now','localtime','-30 minutes')"
      ).run();
      if (result.changes > 0) console.log('🧹 自动关闭 ' + result.changes + ' 个超时对话');
    } catch (e) { console.warn('自动关闭对话失败:', e.message); }
  }, 5 * 60 * 1000);

  // 每天凌晨 3 点清理自动学习知识库（只执行一次）
  let lastCleanupDate = '';
  setInterval(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getHours() === 3 && lastCleanupDate !== today) {
      lastCleanupDate = today;
      try {
        const result = cleanupLearned(200);
        if (result.merged > 0 || result.removed > 0) {
          console.log('🧠 自动学习清理: 合并 ' + result.merged + ' 条, 淘汰 ' + result.removed + ' 条');
        }
      } catch (e) { console.warn('自动学习清理失败:', e.message); }
    }
  }, 60 * 1000);
});

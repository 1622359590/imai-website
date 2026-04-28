const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const { getDb, initSchema, seedData } = require('./database/schema');
const { verifyToken, requireAdmin, JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = 37888;

// ===== 初始化数据库 =====
initSchema();
seedData();

// ===== 中间件 =====
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== 文件上传配置 =====
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|mp4/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 单个文件上传
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择文件' });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.originalname });
});

// ============================================================
//  认证路由 /api/auth
// ============================================================

// 注册
app.post('/api/auth/register', (req, res) => {
  try {
    const { phone, password, nickname } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    if (!/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    const db = getDb();

    // 检查手机号是否已注册
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(409).json({ error: '该手机号已注册' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (phone, password, nickname) VALUES (?, ?, ?)'
    ).run(phone, hashedPassword, nickname || phone);

    const userId = result.lastInsertRowid;
    const token = jwt.sign({ id: userId, phone, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: '注册成功',
      token,
      user: { id: userId, phone, nickname: nickname || phone, role: 'user' }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: '手机号和密码不能为空' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

    if (!user) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, phone, nickname, avatar, role, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// ============================================================
//  公开教程路由 /api/tutorials
// ============================================================

// 教程列表
app.get('/api/tutorials', (req, res) => {
  try {
    const { category, search } = req.query;
    const db = getDb();

    let sql = 'SELECT id, title, category, summary, cover, tags, views, created_at FROM tutorials WHERE status = ?';
    const params = ['published'];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const tutorials = db.prepare(sql).all(...params);
    res.json({ tutorials });
  } catch (err) {
    console.error('获取教程列表失败:', err);
    res.status(500).json({ error: '获取教程列表失败' });
  }
});

// 教程详情
app.get('/api/tutorials/:id', (req, res) => {
  try {
    const db = getDb();
    const tutorial = db.prepare(
      'SELECT * FROM tutorials WHERE id = ? AND status = ?'
    ).get(req.params.id, 'published');

    if (!tutorial) {
      return res.status(404).json({ error: '教程不存在' });
    }

    // 增加浏览量
    db.prepare('UPDATE tutorials SET views = views + 1 WHERE id = ?').run(req.params.id);
    tutorial.views += 1;

    res.json({ tutorial });
  } catch (err) {
    console.error('获取教程详情失败:', err);
    res.status(500).json({ error: '获取教程详情失败' });
  }
});

// ============================================================
//  公开 FAQ 路由 /api/faqs
// ============================================================

app.get('/api/faqs', (req, res) => {
  try {
    const { category, search } = req.query;
    const db = getDb();

    let sql = 'SELECT * FROM faqs WHERE status = ?';
    const params = ['active'];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (question LIKE ? OR answer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY pinned DESC, sort_order ASC, created_at DESC';

    const faqs = db.prepare(sql).all(...params);
    res.json({ faqs });
  } catch (err) {
    console.error('获取 FAQ 列表失败:', err);
    res.status(500).json({ error: '获取 FAQ 列表失败' });
  }
});

// ============================================================
//  管理教程路由 /api/admin/tutorials  (需 admin)
// ============================================================

// 管理端教程列表（包含所有状态）
app.get('/api/admin/tutorials', verifyToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { category, search, status } = req.query;

    let sql = 'SELECT * FROM tutorials WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const tutorials = db.prepare(sql).all(...params);
    res.json({ tutorials });
  } catch (err) {
    console.error('获取教程列表失败:', err);
    res.status(500).json({ error: '获取教程列表失败' });
  }
});

// 管理端获取单个教程（包含所有状态）
app.get('/api/admin/tutorials/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);

    if (!tutorial) {
      return res.status(404).json({ error: '教程不存在' });
    }

    res.json({ tutorial });
  } catch (err) {
    console.error('获取教程详情失败:', err);
    res.status(500).json({ error: '获取教程详情失败' });
  }
});

// 新建教程
app.post('/api/admin/tutorials', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, category, content, summary, cover, tags, status } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: '标题和分类不能为空' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO tutorials (title, category, content, summary, cover, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      category,
      content || '',
      summary || '',
      cover || '',
      tags || '[]',
      status || 'draft'
    );

    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: '创建成功', tutorial });
  } catch (err) {
    console.error('创建教程失败:', err);
    res.status(500).json({ error: '创建教程失败' });
  }
});

// 编辑教程
app.put('/api/admin/tutorials/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const { title, category, content, summary, cover, tags, status } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM tutorials WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '教程不存在' });
    }

    db.prepare(`
      UPDATE tutorials SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        content = COALESCE(?, content),
        summary = COALESCE(?, summary),
        cover = COALESCE(?, cover),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(
      title || null,
      category || null,
      content ?? null,
      summary ?? null,
      cover ?? null,
      tags || null,
      status || null,
      req.params.id
    );

    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
    res.json({ message: '更新成功', tutorial });
  } catch (err) {
    console.error('更新教程失败:', err);
    res.status(500).json({ error: '更新教程失败' });
  }
});

// 删除教程
app.delete('/api/admin/tutorials/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const existing = db.prepare('SELECT id FROM tutorials WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '教程不存在' });
    }

    db.prepare('DELETE FROM tutorials WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除教程失败:', err);
    res.status(500).json({ error: '删除教程失败' });
  }
});

// ============================================================
//  管理 FAQ 路由 /api/admin/faqs  (需 admin)
// ============================================================

// 管理端 FAQ 列表
app.get('/api/admin/faqs', verifyToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { category, search } = req.query;

    let sql = 'SELECT * FROM faqs WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (question LIKE ? OR answer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY sort_order ASC, created_at DESC';

    const faqs = db.prepare(sql).all(...params);
    res.json({ faqs });
  } catch (err) {
    console.error('获取 FAQ 列表失败:', err);
    res.status(500).json({ error: '获取 FAQ 列表失败' });
  }
});

// 新建 FAQ
app.post('/api/admin/faqs', verifyToken, requireAdmin, (req, res) => {
  try {
    const { question, answer, category, sort_order, pinned, status } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: '问题和答案不能为空' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO faqs (question, answer, category, sort_order, pinned, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      question,
      answer,
      category || '通用',
      sort_order || 0,
      pinned || 0,
      status || 'active'
    );

    const faq = db.prepare('SELECT * FROM faqs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: '创建成功', faq });
  } catch (err) {
    console.error('创建 FAQ 失败:', err);
    res.status(500).json({ error: '创建 FAQ 失败' });
  }
});

// 编辑 FAQ
app.put('/api/admin/faqs/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const { question, answer, category, sort_order, pinned, status } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'FAQ 不存在' });
    }

    db.prepare(`
      UPDATE faqs SET
        question = COALESCE(?, question),
        answer = COALESCE(?, answer),
        category = COALESCE(?, category),
        sort_order = COALESCE(?, sort_order),
        pinned = COALESCE(?, pinned),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      question || null,
      answer ?? null,
      category || null,
      sort_order ?? null,
      pinned ?? null,
      status || null,
      req.params.id
    );

    const faq = db.prepare('SELECT * FROM faqs WHERE id = ?').get(req.params.id);
    res.json({ message: '更新成功', faq });
  } catch (err) {
    console.error('更新 FAQ 失败:', err);
    res.status(500).json({ error: '更新 FAQ 失败' });
  }
});

// 删除 FAQ
app.delete('/api/admin/faqs/:id', verifyToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();

    const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'FAQ 不存在' });
    }

    db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除 FAQ 失败:', err);
    res.status(500).json({ error: '删除 FAQ 失败' });
  }
});

// ============================================================
//  管理设置路由 /api/admin/settings  (需 admin)
// ============================================================

// 获取所有设置
app.get('/api/admin/settings', verifyToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();

    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ settings });
  } catch (err) {
    console.error('获取设置失败:', err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 批量保存设置
app.put('/api/admin/settings', verifyToken, requireAdmin, (req, res) => {
  try {
    const data = req.body;
    const db = getDb();

    const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);

    const updateMany = db.transaction((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        upsert.run(key, String(value ?? ''));
      }
    });

    updateMany(data);

    // 返回更新后的完整设置
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ message: '保存成功', settings });
  } catch (err) {
    console.error('保存设置失败:', err);
    res.status(500).json({ error: '保存设置失败' });
  }
});

// ============================================================
//  健康检查
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
//  启动服务
// ============================================================

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   imai.work Backend Server      ║
  ║   Port: ${PORT}                      ║
  ║   Env: development              ║
  ╚══════════════════════════════════╝
  `);
});

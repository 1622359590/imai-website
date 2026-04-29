const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const { getDb, initSchema, seedData } = require('./database/schema');
const { verifyToken, verifyAdminToken, requireAdmin, JWT_SECRET, ADMIN_JWT_SECRET } = require('./middleware/auth');
const { createRecord: feishuCreateRecord } = require('./services/feishu');

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
app.use(express.json());

// ===== 全局禁用 API 缓存（防止浏览器 304 导致前端解析失败）=====
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== 文件上传配置 =====
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const name = require('crypto').randomBytes(16).toString('hex');
    cb(null, name + ext);
  }
});

const upload = multer({
  storage,
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

// 管理员登录（用户名+密码，使用独立 admins 表）
app.post('/api/admin/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '请输入管理员账号和密码' });
    const db = getDb();
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
    if (!admin) return res.status(401).json({ error: '管理员账号或密码错误' });
    const isMatch = require('bcryptjs').compareSync(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: '管理员账号或密码错误' });
    const token = jwt.sign({ id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role }, ADMIN_JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role } });
  } catch(err) { console.error(err); res.status(500).json({ error:'登录失败' }); }
});

// 获取当前用户信息
app.get('/api/auth/me', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, phone, nickname, avatar, vip, vip_expires_at, created_at FROM users WHERE id = ?').get(req.user.id);

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

    let sql = 'SELECT id, title, category, summary, cover, tags, views, created_at, vip_only FROM tutorials WHERE status = ?';
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

    // VIP 权限检查
    if (tutorial.vip_only === 1) {
      var userVip = 0;
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
          const user = db.prepare('SELECT vip FROM users WHERE id = ?').get(decoded.id);
          if (user) userVip = user.vip;
        }
      } catch(e) { /* 未登录或 token 无效 */ }

      if (userVip !== 1) {
        return res.json({ tutorial: { ...tutorial, content: '', vip_locked: true, message: '此教程仅限 VIP 会员查看' } });
      }
    }

    res.json({ tutorial });
  } catch (err) {
    console.error('获取教程详情失败:', err);
    res.status(500).json({ error: '获取教程详情失败' });
  }
});

// 增加教程阅读数（客户端触发，防预取）
app.post('/api/tutorials/:id/view', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('UPDATE tutorials SET views = views + 1 WHERE id = ? AND status = ?').run(req.params.id, 'published');
    if (result.changes === 0) {
      return res.status(404).json({ error: '教程不存在' });
    }
    const tutorial = db.prepare('SELECT views FROM tutorials WHERE id = ?').get(req.params.id);
    res.json({ views: tutorial.views });
  } catch (err) {
    console.error('增加阅读数失败:', err);
    res.status(500).json({ error: '增加阅读数失败' });
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
app.get('/api/admin/tutorials', verifyAdminToken, requireAdmin, (req, res) => {
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
app.get('/api/admin/tutorials/:id', verifyAdminToken, requireAdmin, (req, res) => {
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
app.post('/api/admin/tutorials', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { title, category, content, summary, cover, tags, status, vip_only } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: '标题和分类不能为空' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO tutorials (title, category, content, summary, cover, tags, status, vip_only)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      category,
      content || '',
      summary || '',
      cover || '',
      tags || '[]',
      status || 'draft',
      req.body.vip_only ? 1 : 0
    );

    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: '创建成功', tutorial });
  } catch (err) {
    console.error('创建教程失败:', err);
    res.status(500).json({ error: '创建教程失败' });
  }
});

// 编辑教程
app.put('/api/admin/tutorials/:id', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { title, category, content, summary, cover, tags, status, vip_only } = req.body;
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
        vip_only = COALESCE(?, vip_only),
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
      vip_only !== undefined ? (vip_only ? 1 : 0) : null,
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
app.delete('/api/admin/tutorials/:id', verifyAdminToken, requireAdmin, (req, res) => {
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
app.get('/api/admin/faqs', verifyAdminToken, requireAdmin, (req, res) => {
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
app.post('/api/admin/faqs', verifyAdminToken, requireAdmin, (req, res) => {
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
app.put('/api/admin/faqs/:id', verifyAdminToken, requireAdmin, (req, res) => {
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
app.delete('/api/admin/faqs/:id', verifyAdminToken, requireAdmin, (req, res) => {
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
//  工单路由 /api/tickets
// ============================================================

// 提交工单（需登录）
app.post('/api/tickets', verifyToken, async (req, res) => {
  try {
    const { title, description, name, contact, type, group_name, attachments } = req.body;

    if (!title) {
      return res.status(400).json({ error: '请输入工单标题' });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO tickets (title, description, name, contact, type, group_name, attachments, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || '',
      name || '',
      contact || '',
      type || 'consult',
      group_name || '',
      JSON.stringify(attachments || []),
      req.user.id
    );

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);

    // 同步写入飞书多维表格（如已配置）
    try {
      // 自动获取用户 VIP 等级
      const userInfo = db.prepare('SELECT vip, nickname, phone FROM users WHERE id = ?').get(req.user.id);
      const vipLevel = userInfo && userInfo.vip === 1 ? 'VIP 会员' : '普通用户';
      const attachmentLinks = (attachments || []).map(function(a) { return a.url || a.filename; }).join('\n');
      await feishuCreateRecord({
        '工单标题': title,
        '工单描述': description || '',
        '提交人': name || userInfo?.nickname || '用户' + req.user.id,
        '联系方式': contact || userInfo?.phone || '',
        '会员等级': vipLevel,
        '工单类型': type || 'consult',
        '状态': '待处理',
        '售后群聊': group_name || '',
        '附件链接': attachmentLinks,
        '创建时间': Date.now(),
      });
    } catch (feishuErr) {
      console.warn('飞书写入失败（不影响本地存储）:', feishuErr.message);
    }

    res.status(201).json({ message: '工单提交成功', ticket });
  } catch (err) {
    console.error('提交工单失败:', err);
    res.status(500).json({ error: '提交工单失败' });
  }
});

// 获取我的工单列表（需登录）
app.get('/api/user/tickets', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const tickets = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ tickets });
  } catch (err) {
    console.error('获取工单列表失败:', err);
    res.status(500).json({ error: '获取工单列表失败' });
  }
});

// 管理员获取所有工单
app.get('/api/admin/tickets', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    let sql = 'SELECT t.*, u.nickname, u.phone FROM tickets t LEFT JOIN users u ON t.user_id = u.id';
    const params = [];

    if (status) {
      sql += ' WHERE t.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY t.created_at DESC';
    const tickets = db.prepare(sql).all(...params);
    res.json({ tickets });
  } catch (err) {
    console.error('获取工单列表失败:', err);
    res.status(500).json({ error: '获取工单列表失败' });
  }
});

// 管理员更新工单状态
app.put('/api/admin/tickets/:id', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { status, note } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM tickets WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: '工单不存在' });
    }

    db.prepare(`UPDATE tickets SET status = COALESCE(?, status), updated_at = datetime('now','localtime') WHERE id = ?`).run(status || null, req.params.id);

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    res.json({ message: '更新成功', ticket });
  } catch (err) {
    console.error('更新工单失败:', err);
    res.status(500).json({ error: '更新工单失败' });
  }
});

// ============================================================
//  管理设置路由 /api/admin/settings  (需 admin)
// ============================================================

// 获取所有设置
app.get('/api/admin/settings', verifyAdminToken, requireAdmin, (req, res) => {
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
app.put('/api/admin/settings', verifyAdminToken, requireAdmin, (req, res) => {
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
//  用户管理路由 /api/admin/users  (需 admin)
// ============================================================

app.get('/api/admin/users', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare('SELECT id, phone, nickname, avatar, vip, vip_expires_at, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// ============================================================
//  VIP 管理（需 admin）
// ============================================================

app.put('/api/admin/users/:id/vip', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { vip, vip_expires_at } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    db.prepare('UPDATE users SET vip = ?, vip_expires_at = ? WHERE id = ?')
      .run(vip ? 1 : 0, vip_expires_at || '', req.params.id);

    const updated = db.prepare('SELECT id, phone, nickname, vip, vip_expires_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ message: 'VIP 状态已更新', user: updated });
  } catch (err) {
    console.error('更新 VIP 失败:', err);
    res.status(500).json({ error: '更新 VIP 失败' });
  }
});

// ============================================================
//  管理统计 /api/admin/stats  (需 admin)
// ============================================================

app.get('/api/admin/stats', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const tutorialCount = db.prepare("SELECT COUNT(*) as count FROM tutorials").get().count;
    const faqCount = db.prepare("SELECT COUNT(*) as count FROM faqs").get().count;
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const publishedTutorials = db.prepare("SELECT COUNT(*) as count FROM tutorials WHERE status = 'published'").get().count;
    const todayViews = db.prepare("SELECT COALESCE(SUM(views),0) as count FROM tutorials WHERE DATE(created_at) = DATE('now','localtime')").get().count;
    res.json({ stats: { tutorials: tutorialCount, published: publishedTutorials, faqs: faqCount, users: userCount, todayViews } });
  } catch (err) {
    console.error('获取统计失败:', err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ============================================================
//  健康检查
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================================
//  分类管理 /api/admin/categories  (需 admin)
// ============================================================

app.get('/api/admin/categories', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json({ categories: cats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

app.post('/api/admin/categories', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: '分类名不能为空' });
    const db = getDb();
    const r = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)').run(name, icon || '', sort_order || 0);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json({ category: cat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建分类失败' });
  }
});

app.put('/api/admin/categories/:id', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    const db = getDb();
    db.prepare('UPDATE categories SET name=COALESCE(?,name), icon=COALESCE(?,icon), sort_order=COALESCE(?,sort_order) WHERE id=?')
      .run(name||null, icon??null, sort_order??null, req.params.id);
    const cat = db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id);
    res.json({ category: cat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新分类失败' });
  }
});

app.delete('/api/admin/categories/:id', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// ============================================================
//  公开分类路由
// ============================================================

app.get('/api/categories', (req, res) => {
  try {
    const db = getDb();
    const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json({ categories: cats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ============================================================
//  知识库管理 /api/admin/knowledge  (需 admin)
// ============================================================

app.get('/api/admin/knowledge', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare('SELECT * FROM knowledge_base ORDER BY created_at DESC').all();
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取知识库失败' });
  }
});

app.post('/api/admin/knowledge', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { title, content, tags, category } = req.body;
    if (!title) return res.status(400).json({ error: '标题不能为空' });
    const db = getDb();
    const r = db.prepare('INSERT INTO knowledge_base (title, content, tags, category) VALUES (?,?,?,?)')
      .run(title, content||'', JSON.stringify(tags||[]), category||'');
    const item = db.prepare('SELECT * FROM knowledge_base WHERE id=?').get(r.lastInsertRowid);
    res.status(201).json({ item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建失败' });
  }
});

app.delete('/api/admin/knowledge/:id', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM knowledge_base WHERE id=?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ============================================================
//  AI 问答接口（预留，对接外部 AI API）
// ============================================================

app.post('/api/ai/ask', (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: '请输入问题' });

    const db = getDb();
    // 简单的关键词匹配（后续对接 AI API）
    const items = db.prepare('SELECT title, content FROM knowledge_base WHERE status = ? AND (title LIKE ? OR content LIKE ?)').all('active', '%' + question + '%', '%' + question + '%');

    if (items.length > 0) {
      res.json({ answer: items[0].content, source: items[0].title, matched: true });
    } else {
      res.json({ answer: '暂无匹配的答案，建议提交工单让技术团队帮您处理。', matched: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '查询失败' });
  }
});

// ============================================================
//  前台用户管理（管理员）
// ============================================================

app.post('/api/admin/users', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { phone, password, nickname } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '手机号和密码不能为空' });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE phone=?').get(phone);
    if (existing) return res.status(409).json({ error: '手机号已存在' });
    const hash = require('bcryptjs').hashSync(password, 10);
    const r = db.prepare('INSERT INTO users (phone,password,nickname) VALUES (?,?,?)').run(phone, hash, nickname||'');
    const user = db.prepare('SELECT id,phone,nickname,created_at FROM users WHERE id=?').get(r.lastInsertRowid);
    res.status(201).json({ message: '创建成功', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// ============================================================
//  管理员账号管理（超级管理员）
// ============================================================

app.get('/api/admin/admins', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const admins = db.prepare('SELECT id, username, nickname, role, created_at FROM admins ORDER BY created_at DESC').all();
    res.json({ admins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取管理员列表失败' });
  }
});

app.post('/api/admin/admins', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const { username, password, nickname, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM admins WHERE username=?').get(username);
    if (existing) return res.status(409).json({ error: '用户名已存在' });
    const hash = require('bcryptjs').hashSync(password, 10);
    const r = db.prepare('INSERT INTO admins (username,password,nickname,role) VALUES (?,?,?,?)').run(username, hash, nickname||'', role||'editor');
    const admin = db.prepare('SELECT id,username,nickname,role,created_at FROM admins WHERE id=?').get(r.lastInsertRowid);
    res.status(201).json({ message: '创建成功', admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建管理员失败' });
  }
});

app.delete('/api/admin/admins/:id', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const admin = db.prepare('SELECT id FROM admins WHERE id=?').get(req.params.id);
    if (!admin) return res.status(404).json({ error: '管理员不存在' });
    // 防止删除最后一个超级管理员
    const count = db.prepare("SELECT COUNT(*) as count FROM admins WHERE role='admin'").get().count;
    if (count <= 1 && req.params.id == req.admin.id) {
      return res.status(400).json({ error: '不能删除最后一个超级管理员' });
    }
    db.prepare('DELETE FROM admins WHERE id=?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除失败' });
  }
});

// ============================================================
//  文件上传（带 OSS 支持）
// ============================================================

app.post('/api/upload/file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请选择文件' });
  }
  try {
    const config = getDb().prepare('SELECT key, value FROM settings WHERE key LIKE ? OR key LIKE ?').all('oss_%', 'storage_%');
    const settings = {};
    for (const row of config) settings[row.key] = row.value;

    if (settings.storage_type === 'oss' && settings.oss_bucket) {
      // OSS 上传（预留）
      res.json({ url: '/uploads/' + req.file.filename, filename: req.file.originalname, storage: 'local' });
    } else {
      const url = '/uploads/' + req.file.filename;
      res.json({ url, filename: req.file.originalname, size: req.file.size, storage: 'local' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '上传失败' });
  }
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

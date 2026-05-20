/**
 * 管理后台路由 — 教程、FAQ、设置、用户、统计、分类、知识库、管理员、上传、客户分类、AI 知识库
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database/schema');
const { verifyAdminToken, requireAdmin } = require('../middleware/auth');
const { rebuildIndex: rebuildRagIndex } = require('../services/rag');
const { parseDocument } = require('../services/doc-parser');

const router = express.Router();

// RAG 索引重建防抖
let ragRebuildTimer = null;
function rebuildRagAsync(force = true) {
  if (ragRebuildTimer) clearTimeout(ragRebuildTimer);
  ragRebuildTimer = setTimeout(() => {
    rebuildRagIndex(force).catch(e => console.warn('RAG 重建失败:', e.message));
  }, 3000);
}

// ===== 文件上传配置 =====
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const name = require('crypto').randomBytes(16).toString('hex');
    cb(null, name + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|mp4|pdf|doc|docx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    cb(null, extname || mimetype);
  },
});
const csvStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => { cb(null, 'import_' + Date.now() + '.csv'); },
});
const uploadCSV = multer({
  storage: csvStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ext === '.csv' || file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel');
  },
});
const docStorage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => { cb(null, 'doc_' + Date.now() + path.extname(file.originalname)); },
});
const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.docx', '.csv', '.txt', '.md'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// 所有路由都需要管理员权限
router.use(verifyAdminToken, requireAdmin);

// ============================================================
//  教程管理
// ============================================================

router.get('/tutorials', (req, res) => {
  try {
    const db = getDb();
    const { category, search, status } = req.query;
    let sql = 'SELECT * FROM tutorials WHERE 1=1';
    const params = [];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) { sql += ' AND title LIKE ?'; params.push(`%${search}%`); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    res.json({ tutorials: db.prepare(sql).all(...params) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取教程列表失败' });
  }
});

router.get('/tutorials/:id', (req, res) => {
  try {
    const db = getDb();
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
    if (!tutorial) return res.status(404).json({ error: '教程不存在' });
    res.json({ tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取教程详情失败' });
  }
});

router.post('/tutorials', (req, res) => {
  try {
    const { title, category, content, summary, cover, tags, status, vip_only } = req.body;
    if (!title || !category) return res.status(400).json({ error: '标题和分类必填' });
    const db = getDb();
    const result = db.prepare(`INSERT INTO tutorials (title, category, content, summary, cover, tags, status, vip_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(title, category, content || '', summary || '', cover || '', typeof tags === 'string' ? tags : JSON.stringify(tags || []), status || 'draft', vip_only ? 1 : 0);
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(result.lastInsertRowid);
    rebuildRagAsync();
    res.status(201).json({ message: '创建成功', tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建教程失败' });
  }
});

router.put('/tutorials/:id', (req, res) => {
  try {
    const { title, category, content, summary, cover, tags, status, vip_only } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tutorials WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '教程不存在' });

    const fields = [];
    const params = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (content !== undefined) { fields.push('content = ?'); params.push(content); }
    if (summary !== undefined) { fields.push('summary = ?'); params.push(summary); }
    if (cover !== undefined) { fields.push('cover = ?'); params.push(cover); }
    if (tags !== undefined) { fields.push('tags = ?'); params.push(typeof tags === 'string' ? tags : JSON.stringify(tags)); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (vip_only !== undefined) { fields.push('vip_only = ?'); params.push(vip_only ? 1 : 0); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now','localtime')");
      params.push(req.params.id);
      db.prepare(`UPDATE tutorials SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    rebuildRagAsync();
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ?').get(req.params.id);
    res.json({ message: '更新成功', tutorial });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新教程失败' });
  }
});

router.delete('/tutorials/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tutorials WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '教程不存在' });
    db.prepare('DELETE FROM tutorials WHERE id = ?').run(req.params.id);
    rebuildRagAsync();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除教程失败' });
  }
});

// ============================================================
//  FAQ 管理
// ============================================================

router.get('/faqs', (req, res) => {
  try {
    const db = getDb();
    res.json({ faqs: db.prepare('SELECT * FROM faqs ORDER BY pinned DESC, sort_order ASC, created_at DESC').all() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取 FAQ 失败' });
  }
});

router.post('/faqs', (req, res) => {
  try {
    const { question, answer, category, sort_order, pinned, status } = req.body;
    if (!question || !answer) return res.status(400).json({ error: '问题和答案必填' });
    const db = getDb();
    const result = db.prepare('INSERT INTO faqs (question, answer, category, sort_order, pinned, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(question, answer, category || '通用', sort_order || 0, pinned ? 1 : 0, status || 'active');
    rebuildRagAsync();
    const faq = db.prepare('SELECT * FROM faqs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: '创建成功', faq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建 FAQ 失败' });
  }
});

router.put('/faqs/:id', (req, res) => {
  try {
    const { question, answer, category, sort_order, pinned, status } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'FAQ 不存在' });

    const fields = [];
    const params = [];
    if (question !== undefined) { fields.push('question = ?'); params.push(question); }
    if (answer !== undefined) { fields.push('answer = ?'); params.push(answer); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
    if (pinned !== undefined) { fields.push('pinned = ?'); params.push(pinned ? 1 : 0); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }

    if (fields.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE faqs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    rebuildRagAsync();
    const faq = db.prepare('SELECT * FROM faqs WHERE id = ?').get(req.params.id);
    res.json({ message: '更新成功', faq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新 FAQ 失败' });
  }
});

router.delete('/faqs/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
    rebuildRagAsync();
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除 FAQ 失败' });
  }
});

// ============================================================
//  设置
// ============================================================

router.get('/settings', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

router.put('/settings', (req, res) => {
  try {
    const db = getDb();
    const upsert = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now','localtime')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
    const updateMany = db.transaction((entries) => {
      for (const [key, value] of Object.entries(entries)) upsert.run(key, String(value ?? ''));
    });
    updateMany(req.body);
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ message: '保存成功', settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '保存设置失败' });
  }
});

// ============================================================
//  用户管理
// ============================================================

router.get('/users', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`SELECT u.id, u.phone, u.nickname, u.avatar, u.vip, u.vip_expires_at, u.customer_level_id, u.company, u.company_role, u.industry, u.created_at, cl.name as customer_level_name FROM users u LEFT JOIN customer_levels cl ON u.customer_level_id = cl.id ORDER BY u.created_at DESC`).all();
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.post('/users', (req, res) => {
  try {
    const { phone, password, nickname } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '手机号和密码不能为空' });
    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE phone=?').get(phone)) return res.status(409).json({ error: '手机号已存在' });
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare('INSERT INTO users (phone,password,nickname) VALUES (?,?,?)').run(phone, hash, nickname || '');
    const user = db.prepare('SELECT id,phone,nickname,created_at FROM users WHERE id=?').get(r.lastInsertRowid);
    res.status(201).json({ message: '创建成功', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建用户失败' });
  }
});

router.put('/users/:id/vip', (req, res) => {
  try {
    const { vip, vip_expires_at } = req.body;
    const db = getDb();
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: '用户不存在' });
    db.prepare('UPDATE users SET vip = ?, vip_expires_at = ? WHERE id = ?').run(vip ? 1 : 0, vip_expires_at || '', req.params.id);
    const updated = db.prepare('SELECT id, phone, nickname, vip, vip_expires_at FROM users WHERE id = ?').get(req.params.id);
    res.json({ message: 'VIP 状态已更新', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新 VIP 失败' });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { nickname, vip, vip_expires_at, customer_level_id, company, company_role, industry } = req.body;
    const db = getDb();
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: '用户不存在' });

    const updates = [];
    const params = [];
    if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
    if (vip !== undefined) { updates.push('vip = ?'); params.push(vip ? 1 : 0); }
    if (vip_expires_at !== undefined) { updates.push('vip_expires_at = ?'); params.push(vip_expires_at || ''); }
    if (customer_level_id !== undefined) { updates.push('customer_level_id = ?'); params.push(customer_level_id || 0); }
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (company_role !== undefined) { updates.push('company_role = ?'); params.push(company_role); }
    if (industry !== undefined) { updates.push('industry = ?'); params.push(industry); }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    const updated = db.prepare(`SELECT u.id, u.phone, u.nickname, u.vip, u.vip_expires_at, u.customer_level_id, u.company, u.company_role, u.industry, cl.name as customer_level_name FROM users u LEFT JOIN customer_levels cl ON u.customer_level_id = cl.id WHERE u.id = ?`).get(req.params.id);
    res.json({ message: '用户信息已更新', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新用户失败' });
  }
});

router.get('/users/export', (req, res) => {
  try {
    const db = getDb();
    const users = db.prepare(`SELECT u.id, u.phone, u.nickname, u.vip, u.customer_level_id, cl.name as customer_level_name, u.created_at FROM users u LEFT JOIN customer_levels cl ON u.customer_level_id = cl.id ORDER BY u.id ASC`).all();
    const headers = ['ID', '手机号', '昵称', 'VIP', '客户身份ID', '客户身份', '注册时间'];
    const rows = users.map(u => [u.id, u.phone, (u.nickname || '').replace(/,/g, '，'), u.vip ? '是' : '否', u.customer_level_id || 0, u.customer_level_name || '', u.created_at]);
    let csv = '\uFEFF' + headers.join(',') + '\n';
    for (const row of rows) csv += row.join(',') + '\n';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=users_' + new Date().toISOString().slice(0, 10) + '.csv');
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导出用户失败' });
  }
});

router.post('/users/import', uploadCSV.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传 CSV 文件' });
    const content = fs.readFileSync(req.file.path, 'utf8').replace(/^\uFEFF/, '');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'CSV 文件为空或缺少数据行' }); }

    const headerLine = lines[0].toLowerCase().replace(/"/g, '');
    const headers = headerLine.split(',').map(h => h.trim());
    const phoneIdx = headers.findIndex(h => h.includes('手机') || h === 'phone');
    const nickIdx = headers.findIndex(h => h.includes('昵称') || h === 'nickname');
    const pwdIdx = headers.findIndex(h => h.includes('密码') || h === 'password');
    const vipIdx = headers.findIndex(h => h.includes('vip') || h.includes('会员'));
    const levelIdx = headers.findIndex(h => h.includes('客户身份ID') || h.includes('level_id') || h.includes('客户身份'));

    if (phoneIdx === -1) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'CSV 中没有找到手机号列' }); }

    const db = getDb();
    const levels = db.prepare('SELECT id, name FROM customer_levels').all();
    const levelMap = {};
    for (const l of levels) levelMap[l.name] = l.id;

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const phone = vals[phoneIdx];
      if (!phone) { skipped++; continue; }
      if (!/^1\d{10}$/.test(phone)) { errors.push(`第${i + 1}行: 手机号格式不正确`); continue; }

      try {
        const nickname = nickIdx >= 0 ? vals[nickIdx] || '' : '';
        const vip = vipIdx >= 0 ? (vals[vipIdx] === '是' || vals[vipIdx] === '1' ? 1 : 0) : 0;
        let levelId = 0;
        if (levelIdx >= 0) {
          const levelVal = vals[levelIdx];
          if (/^\d+$/.test(levelVal)) levelId = parseInt(levelVal);
          else if (levelMap[levelVal]) levelId = levelMap[levelVal];
        }

        const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
        if (existing) {
          db.prepare('UPDATE users SET nickname = ?, vip = ?, customer_level_id = ? WHERE id = ?').run(nickname, vip, levelId, existing.id);
        } else {
          const password = pwdIdx >= 0 ? vals[pwdIdx] : phone.slice(-6);
          const hashed = await bcrypt.hash(password, 10);
          db.prepare('INSERT INTO users (phone, password, nickname, vip, customer_level_id) VALUES (?, ?, ?, ?, ?)').run(phone, hashed, nickname, vip, levelId);
        }
        imported++;
      } catch (rowErr) {
        errors.push(`第 ${i + 1} 行: ${rowErr.message}`);
      }
    }

    fs.unlinkSync(req.file.path);
    res.json({ message: `导入完成：成功 ${imported} 条，跳过 ${skipped} 条`, imported, skipped, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '导入用户失败: ' + err.message });
  }
});

// ============================================================
//  统计
// ============================================================

router.get('/stats', (req, res) => {
  try {
    const db = getDb();
    res.json({
      stats: {
        tutorials: db.prepare("SELECT COUNT(*) as c FROM tutorials").get().c,
        published: db.prepare("SELECT COUNT(*) as c FROM tutorials WHERE status = 'published'").get().c,
        faqs: db.prepare("SELECT COUNT(*) as c FROM faqs").get().c,
        users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
        todayViews: db.prepare("SELECT COALESCE(SUM(views),0) as c FROM tutorials WHERE DATE(created_at) = DATE('now','localtime')").get().c,
        tickets: db.prepare("SELECT COUNT(*) as c FROM tickets").get().c,
        ticketsPending: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'pending'").get().c,
        ticketsProcessing: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'processing'").get().c,
        ticketsResolved: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'resolved'").get().c,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ============================================================
//  管理员工单
// ============================================================

router.get('/tickets', (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    let sql = 'SELECT t.*, u.nickname, u.phone, a.username as processor_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN admins a ON t.processed_by = a.id';
    const params = [];
    if (status) { sql += ' WHERE t.status = ?'; params.push(status); }
    sql += ' ORDER BY t.created_at DESC';
    res.json({ tickets: db.prepare(sql).all(...params) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取工单列表失败' });
  }
});

router.put('/tickets/:id', (req, res) => {
  try {
    const { status, reply } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tickets WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: '工单不存在' });
    db.prepare(`UPDATE tickets SET status = COALESCE(?, status), reply = COALESCE(?, reply), processed_by = ?, reply_read = CASE WHEN ? IS NOT NULL AND ? != '' THEN 0 ELSE reply_read END, updated_at = datetime('now','localtime') WHERE id = ?`)
      .run(status || null, reply ?? null, req.admin.id, reply ?? null, reply ?? null, req.params.id);
    const ticket = db.prepare(`SELECT t.*, u.nickname, u.phone, a.username as processor_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN admins a ON t.processed_by = a.id WHERE t.id = ?`).get(req.params.id);
    res.json({ message: '更新成功', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新工单失败' });
  }
});

// ============================================================
//  分类管理
// ============================================================

router.get('/categories', (req, res) => {
  try {
    res.json({ categories: getDb().prepare('SELECT * FROM categories ORDER BY sort_order ASC').all() });
  } catch (err) { res.status(500).json({ error: '获取分类失败' }); }
});

router.post('/categories', (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: '分类名不能为空' });
    const db = getDb();
    const r = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)').run(name, icon || '', sort_order || 0);
    res.status(201).json({ category: db.prepare('SELECT * FROM categories WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: '创建分类失败' }); }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { name, icon, sort_order } = req.body;
    if (name !== undefined && !name.trim()) return res.status(400).json({ error: '分类名不能为空' });
    const db = getDb();
    db.prepare('UPDATE categories SET name=COALESCE(?,name), icon=COALESCE(?,icon), sort_order=COALESCE(?,sort_order) WHERE id=?').run(name || null, icon ?? null, sort_order ?? null, req.params.id);
    res.json({ category: db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id) });
  } catch (err) { res.status(500).json({ error: '更新分类失败' }); }
});

router.delete('/categories/:id', (req, res) => {
  try {
    getDb().prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { res.status(500).json({ error: '删除分类失败' }); }
});

// ============================================================
//  知识库管理
// ============================================================

router.get('/knowledge', (req, res) => {
  try {
    res.json({ items: getDb().prepare('SELECT * FROM knowledge_base ORDER BY created_at DESC').all() });
  } catch (err) { res.status(500).json({ error: '获取知识库失败' }); }
});

router.post('/knowledge', (req, res) => {
  try {
    const { title, content, tags, category } = req.body;
    if (!title) return res.status(400).json({ error: '标题不能为空' });
    const db = getDb();
    const r = db.prepare('INSERT INTO knowledge_base (title, content, tags, category) VALUES (?,?,?,?)').run(title, content || '', JSON.stringify(tags || []), category || '');
    rebuildRagAsync();
    res.status(201).json({ item: db.prepare('SELECT * FROM knowledge_base WHERE id=?').get(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: '创建失败' }); }
});

router.delete('/knowledge/:id', (req, res) => {
  try {
    getDb().prepare('DELETE FROM knowledge_base WHERE id=?').run(req.params.id);
    rebuildRagAsync();
    res.json({ message: '删除成功' });
  } catch (err) { res.status(500).json({ error: '删除失败' }); }
});

// ============================================================
//  管理员账号管理
// ============================================================

router.get('/admins', (req, res) => {
  try {
    res.json({ admins: getDb().prepare('SELECT id, username, nickname, role, created_at FROM admins ORDER BY created_at DESC').all() });
  } catch (err) { res.status(500).json({ error: '获取管理员列表失败' }); }
});

router.post('/admins', (req, res) => {
  try {
    const { username, password, nickname, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    const db = getDb();
    if (db.prepare('SELECT id FROM admins WHERE username=?').get(username)) return res.status(409).json({ error: '用户名已存在' });
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare('INSERT INTO admins (username,password,nickname,role) VALUES (?,?,?,?)').run(username, hash, nickname || '', role || 'editor');
    res.status(201).json({ message: '创建成功', admin: db.prepare('SELECT id,username,nickname,role,created_at FROM admins WHERE id=?').get(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: '创建管理员失败' }); }
});

router.delete('/admins/:id', (req, res) => {
  try {
    const db = getDb();
    if (!db.prepare('SELECT id FROM admins WHERE id=?').get(req.params.id)) return res.status(404).json({ error: '管理员不存在' });
    const count = db.prepare("SELECT COUNT(*) as c FROM admins WHERE role='admin'").get().c;
    if (count <= 1 && req.params.id == req.admin.id) return res.status(400).json({ error: '不能删除最后一个超级管理员' });
    db.prepare('DELETE FROM admins WHERE id=?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { res.status(500).json({ error: '删除失败' }); }
});

// ============================================================
//  文件上传
// ============================================================

router.post('/upload/images', upload.array('files', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: '请选择文件' });
    const results = req.files.map(f => ({ url: '/uploads/' + f.filename, filename: f.originalname, size: f.size }));
    res.json({ message: `成功上传 ${results.length} 张图片`, files: results });
  } catch (err) { res.status(500).json({ error: '上传失败' }); }
});

router.delete('/upload/images/:filename', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'uploads', req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '文件不存在' });
    if (!filePath.startsWith(path.join(__dirname, '..', 'uploads'))) return res.status(400).json({ error: '非法路径' });
    fs.unlinkSync(filePath);
    res.json({ message: '删除成功' });
  } catch (err) { res.status(500).json({ error: '删除失败' }); }
});

router.get('/upload/images', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) return res.json({ images: [] });
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const files = fs.readdirSync(uploadsDir)
      .filter(f => imageExts.includes(path.extname(f).toLowerCase()))
      .map(f => { const stat = fs.statSync(path.join(uploadsDir, f)); return { url: '/uploads/' + f, filename: f, size: stat.size }; });
    res.json({ images: files, count: files.length });
  } catch (err) { res.status(500).json({ error: '获取图片列表失败' }); }
});

// ============================================================
//  客户身份分类
// ============================================================

router.get('/customer-levels', (req, res) => {
  try {
    res.json({ levels: getDb().prepare('SELECT * FROM customer_levels ORDER BY sort_order ASC').all() });
  } catch (err) { res.status(500).json({ error: '获取客户分类失败' }); }
});

router.post('/customer-levels', (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '分类名称不能为空' });
    const db = getDb();
    const r = db.prepare('INSERT INTO customer_levels (name, description, sort_order) VALUES (?, ?, ?)').run(name.trim(), (description || '').trim(), sort_order || 0);
    res.status(201).json({ level: db.prepare('SELECT * FROM customer_levels WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: '该分类名称已存在' });
    res.status(500).json({ error: '创建客户分类失败' });
  }
});

router.put('/customer-levels/:id', (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    const db = getDb();
    if (!db.prepare('SELECT id FROM customer_levels WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: '客户分类不存在' });
    if (name !== undefined && (!name || !name.trim())) return res.status(400).json({ error: '分类名称不能为空' });
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description.trim()); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (updates.length > 0) { params.push(req.params.id); db.prepare(`UPDATE customer_levels SET ${updates.join(', ')} WHERE id = ?`).run(...params); }
    res.json({ level: db.prepare('SELECT * FROM customer_levels WHERE id = ?').get(req.params.id) });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: '该分类名称已存在' });
    res.status(500).json({ error: '更新客户分类失败' });
  }
});

router.delete('/customer-levels/:id', (req, res) => {
  try {
    const db = getDb();
    if (!db.prepare('SELECT id FROM customer_levels WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: '客户分类不存在' });
    db.prepare('UPDATE users SET customer_level_id = 0 WHERE customer_level_id = ?').run(req.params.id);
    db.prepare('DELETE FROM customer_levels WHERE id = ?').run(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { res.status(500).json({ error: '删除客户分类失败' }); }
});

// ============================================================
//  AI 知识库管理
// ============================================================

router.get('/ai/conversations', (req, res) => {
  try {
    const db = getDb();
    const conversations = db.prepare(`
      SELECT c.*, u.nickname, u.phone,
        (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM ai_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) as last_message
      FROM ai_conversations c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.updated_at DESC LIMIT 100
    `).all();
    res.json({ conversations });
  } catch (err) { res.status(500).json({ error: '获取对话列表失败' }); }
});

router.get('/ai/knowledge', (req, res) => {
  try {
    const db = getDb();
    const { status, category } = req.query;
    let sql = 'SELECT * FROM ai_knowledge WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY category, id DESC';
    res.json({ items: db.prepare(sql).all(...params) });
  } catch (err) { res.status(500).json({ error: '获取知识库失败' }); }
});

router.post('/ai/knowledge/:id/approve', (req, res) => {
  try {
    const db = getDb();
    if (!db.prepare('SELECT id FROM ai_knowledge WHERE id = ?').get(req.params.id)) return res.status(404).json({ error: '条目不存在' });
    db.prepare("UPDATE ai_knowledge SET status = 'active', updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
    rebuildRagAsync();
    res.json({ ok: true, message: '已通过审核' });
  } catch (err) { res.status(500).json({ error: '审核失败' }); }
});

router.post('/ai/knowledge', (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    if (!title || !content) return res.status(400).json({ error: '标题和内容必填' });
    const db = getDb();
    if (db.prepare('SELECT id FROM ai_knowledge WHERE title = ?').get(title)) return res.status(409).json({ error: '已存在同名知识：' + title });
    const r = db.prepare('INSERT INTO ai_knowledge (title, content, category, tags) VALUES (?, ?, ?, ?)').run(title, content, category || '', JSON.stringify(tags || []));
    rebuildRagAsync();
    res.status(201).json({ item: db.prepare('SELECT * FROM ai_knowledge WHERE id = ?').get(r.lastInsertRowid) });
  } catch (err) { res.status(500).json({ error: '创建知识库条目失败' }); }
});

router.put('/ai/knowledge/:id', (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    const db = getDb();
    db.prepare("UPDATE ai_knowledge SET title = COALESCE(?, title), content = COALESCE(?, content), category = COALESCE(?, category), tags = COALESCE(?, tags), status = COALESCE(?, status), updated_at = datetime('now','localtime') WHERE id = ?")
      .run(title || null, content || null, category || null, tags ? JSON.stringify(tags) : null, status || null, req.params.id);
    rebuildRagAsync();
    res.json({ item: db.prepare('SELECT * FROM ai_knowledge WHERE id = ?').get(req.params.id) });
  } catch (err) { res.status(500).json({ error: '更新知识库条目失败' }); }
});

router.delete('/ai/knowledge/:id', (req, res) => {
  try {
    getDb().prepare('DELETE FROM ai_knowledge WHERE id = ?').run(req.params.id);
    rebuildRagAsync();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: '删除知识库条目失败' }); }
});

router.post('/ai/knowledge/preview', uploadDoc.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传文件' });
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const items = await parseDocument(req.file.path, uploadsDir, '/uploads');
    try { fs.unlinkSync(req.file.path); } catch {}
    res.json({ items, count: items.length });
  } catch (err) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(400).json({ error: err.message || '解析失败' });
  }
});

router.get('/ai/knowledge/template', (req, res) => {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const data = [
    ['标题', '内容', '分类'],
    ['抖音养号第一步：完善资料', '注册后先完善个人资料：\n1. 上传清晰头像\n2. 昵称简洁好记\n3. 简介说明你是做什么的\n4. 绑定手机号', '养号技巧'],
    ['抖音流量池机制', '抖音采用层级递进的流量池：\n- 初始池：200-500播放\n- 完播率>30%进入下一级\n- 逐级递增至百万级', '短视频运营'],
    ['产品定价方案', '（在此填写您的产品定价信息）', '收费相关'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 60 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws, '知识库模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="AI_knowledge_template.xlsx"');
  res.send(buf);
});

router.post('/ai/knowledge/import', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '没有要导入的数据' });
    const db = getDb();
    const existingTitles = new Set(db.prepare('SELECT title FROM ai_knowledge').all().map(r => r.title));
    const insert = db.prepare('INSERT INTO ai_knowledge (title, content, category) VALUES (?, ?, ?)');
    let imported = 0;
    let skipped = 0;
    for (const item of items) {
      if (!item.title && !item.content) continue;
      const title = item.title || '未命名';
      if (existingTitles.has(title)) { skipped++; continue; }
      insert.run(title, item.content || '', item.category || '');
      existingTitles.add(title);
      imported++;
    }
    rebuildRagAsync();
    res.json({ message: `成功导入 ${imported} 条知识`, count: imported, skipped });
  } catch (err) { res.status(500).json({ error: err.message || '导入失败' }); }
});

router.post('/ai/rebuild-index', async (req, res) => {
  try {
    const count = await rebuildRagIndex(true);
    res.json({ ok: true, count, message: `索引已重建，共 ${count} 条知识` });
  } catch (err) { res.status(500).json({ error: '重建索引失败: ' + err.message }); }
});

router.get('/ai/rag-chunks', (req, res) => {
  try {
    const db = getDb();
    const knowledge = db.prepare("SELECT 'k:' || id || ':0' as chunkId, id, title, content, category, 'knowledge' as source FROM ai_knowledge WHERE status = 'active'").all();
    const tutorials = db.prepare("SELECT 't:' || id || ':0' as chunkId, id, title, content, category, 'tutorial' as source FROM tutorials WHERE status = 'published'").all();
    const faqs = db.prepare("SELECT 'f:' || id || ':0' as chunkId, id, question as title, answer as content, category, 'faq' as source FROM faqs WHERE status = 'active'").all();
    const all = [...knowledge, ...tutorials, ...faqs];
    res.json({ chunks: all, total: all.length });
  } catch (err) { res.status(500).json({ error: '获取向量块失败' }); }
});

router.post('/ai/rag-search', async (req, res) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) return res.status(400).json({ error: '请输入查询内容' });
    const { retrieve: ragRetrieve } = require('../services/rag');
    const results = await ragRetrieve(query, topK);
    res.json({ results, query });
  } catch (err) { res.status(500).json({ error: '检索失败: ' + err.message }); }
});

// ============================================================
//  用户画像记忆管理
// ============================================================

router.get('/users/:id/memory', (req, res) => {
  try {
    const db = getDb();
    const memories = db.prepare(
      'SELECT * FROM user_memory WHERE user_id = ? ORDER BY confidence DESC, updated_at DESC'
    ).all(req.params.id);
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: '获取用户画像失败' });
  }
});

router.post('/users/:id/memory', (req, res) => {
  try {
    const { category, content } = req.body;
    if (!content) return res.status(400).json({ error: '内容不能为空' });
    const db = getDb();
    db.prepare(
      "INSERT INTO user_memory (user_id, category, content) VALUES (?, ?, ?) ON CONFLICT(user_id, content) DO UPDATE SET confidence = confidence + 0.2, updated_at = datetime('now','localtime')"
    ).run(req.params.id, category || 'general', content);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '添加画像失败' });
  }
});

router.delete('/users/memory/:id', (req, res) => {
  try {
    getDb().prepare('DELETE FROM user_memory WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '删除画像失败' });
  }
});

module.exports = router;

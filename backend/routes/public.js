/**
 * 公开路由 — 教程、FAQ、分类、健康检查
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/schema');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ========== 教程 ==========

// 教程列表
router.get('/tutorials', (req, res) => {
  try {
    const { category, search } = req.query;
    const db = getDb();
    let sql = 'SELECT id, title, category, summary, cover, tags, views, created_at, vip_only FROM tutorials WHERE status = ?';
    const params = ['published'];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) { sql += ' AND title LIKE ?'; params.push(`%${search}%`); }
    sql += ' ORDER BY created_at DESC';
    res.json({ tutorials: db.prepare(sql).all(...params) });
  } catch (err) {
    console.error('获取教程列表失败:', err);
    res.status(500).json({ error: '获取教程列表失败' });
  }
});

// 教程详情
router.get('/tutorials/:id', (req, res) => {
  try {
    const db = getDb();
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ? AND status = ?').get(req.params.id, 'published');
    if (!tutorial) return res.status(404).json({ error: '教程不存在' });

    // VIP 权限检查
    if (tutorial.vip_only === 1) {
      let userVip = 0;
      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
          const user = db.prepare('SELECT vip FROM users WHERE id = ?').get(decoded.id);
          if (user) userVip = user.vip;
        }
      } catch {}
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

// 增加教程阅读数
router.post('/tutorials/:id/view', (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('UPDATE tutorials SET views = views + 1 WHERE id = ? AND status = ?').run(req.params.id, 'published');
    if (result.changes === 0) return res.status(404).json({ error: '教程不存在' });
    const tutorial = db.prepare('SELECT views FROM tutorials WHERE id = ?').get(req.params.id);
    res.json({ views: tutorial.views });
  } catch (err) {
    console.error('增加阅读数失败:', err);
    res.status(500).json({ error: '增加阅读数失败' });
  }
});

// ========== FAQ ==========

router.get('/faqs', (req, res) => {
  try {
    const { category, search } = req.query;
    const db = getDb();
    let sql = 'SELECT * FROM faqs WHERE status = ?';
    const params = ['active'];
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (search) { sql += ' AND (question LIKE ? OR answer LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY pinned DESC, sort_order ASC, created_at DESC';
    res.json({ faqs: db.prepare(sql).all(...params) });
  } catch (err) {
    console.error('获取 FAQ 列表失败:', err);
    res.status(500).json({ error: '获取 FAQ 列表失败' });
  }
});

// ========== 分类 ==========

router.get('/categories', (req, res) => {
  try {
    const db = getDb();
    res.json({ categories: db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// ========== 健康检查 ==========

router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

module.exports = router;

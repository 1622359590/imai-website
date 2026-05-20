/**
 * 用户工单路由 — 我的工单列表、未读回复
 */
const express = require('express');
const { getDb } = require('../database/schema');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// 未读回复数 (GET /api/tickets/unread-count)
router.get('/unread-count', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(
      "SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND reply_read = 0 AND reply != '' AND reply IS NOT NULL"
    ).get(req.user.id);
    res.json({ count: result.count });
  } catch (err) {
    console.error('获取未读回复数失败:', err);
    res.status(500).json({ error: '获取未读回复数失败' });
  }
});

// 标记工单回复已读 (POST /api/tickets/:id/mark-read)
router.post('/:id/mark-read', verifyToken, (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE tickets SET reply_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '标记已读失败' });
  }
});

// 我的工单列表 (GET /api/user/tickets)
router.get('/', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const { status, search, page = 1, pageSize = 10 } = req.query;
    const limit = Math.min(Number(pageSize) || 10, 50);
    const offset = ((Number(page) || 1) - 1) * limit;

    let where = 'WHERE user_id = ?';
    const params = [req.user.id];
    if (status && status !== 'all') { where += ' AND status = ?'; params.push(status); }
    if (search) { where += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM tickets ${where}`).get(...params).cnt;
    const tickets = db.prepare(`SELECT * FROM tickets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    res.json({ tickets, total, page: Number(page) || 1, pageSize: limit });
  } catch (err) {
    console.error('获取工单列表失败:', err);
    res.status(500).json({ error: '获取工单列表失败' });
  }
});

module.exports = router;

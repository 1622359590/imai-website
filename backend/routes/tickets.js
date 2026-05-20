/**
 * 工单路由 — 提交工单、工单详情、管理员管理工单
 */
const express = require('express');
const { getDb } = require('../database/schema');
const { verifyToken, verifyAdminToken, requireAdmin } = require('../middleware/auth');
const { createRecord: feishuCreateRecord } = require('../services/feishu');
const { sendTicketNotification } = require('../services/notify');

const router = express.Router();

// 提交工单
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, name, contact, type, group_name, attachments } = req.body;
    if (!title) return res.status(400).json({ error: '请输入工单标题' });

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO tickets (title, description, name, contact, type, group_name, attachments, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || '', name || '', contact || '', type || 'consult', group_name || '', JSON.stringify(attachments || []), req.user.id);

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);

    // 飞书同步
    try {
      const userInfo = db.prepare('SELECT u.*, cl.name as customer_level_name FROM users u LEFT JOIN customer_levels cl ON u.customer_level_id = cl.id WHERE u.id = ?').get(req.user.id);
      const attachmentLinks = (attachments || []).map(a => a.url || a.filename).join('\n');
      await feishuCreateRecord({
        '工单标题': title, '工单描述': description || '',
        '提交人': name || userInfo?.nickname || '用户' + req.user.id,
        '联系方式': contact || userInfo?.phone || '',
        '客户身份分类': userInfo?.customer_level_name || '',
        '工单类型': type || 'consult', '状态': '待处理',
        '售后群聊': group_name || '', '附件链接': attachmentLinks,
        '创建时间': Date.now(),
      });
    } catch (feishuErr) {
      console.warn('飞书写入失败（不影响本地存储）:', feishuErr.message);
    }

    // 通知
    try {
      await sendTicketNotification({ ...ticket, name: name || '', contact: contact || '', group_name: group_name || '' });
    } catch (notifyErr) {
      console.warn('工单通知发送失败:', notifyErr.message);
    }

    res.status(201).json({ message: '工单提交成功', ticket });
  } catch (err) {
    console.error('提交工单失败:', err);
    res.status(500).json({ error: '提交工单失败' });
  }
});

// 工单详情（用户只能看自己的）
router.get('/:id', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    // 标记回复已读
    if (ticket.reply_read === 0 && ticket.reply) {
      db.prepare('UPDATE tickets SET reply_read = 1 WHERE id = ?').run(req.params.id);
    }
    res.json({ ticket });
  } catch (err) {
    console.error('获取工单详情失败:', err);
    res.status(500).json({ error: '获取工单详情失败' });
  }
});

// ========== 管理员工单 ==========

// 管理员获取所有工单
router.get('/admin/all', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    let sql = 'SELECT t.*, u.nickname, u.phone, a.username as processor_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN admins a ON t.processed_by = a.id';
    const params = [];
    if (status) { sql += ' WHERE t.status = ?'; params.push(status); }
    sql += ' ORDER BY t.created_at DESC';
    res.json({ tickets: db.prepare(sql).all(...params) });
  } catch (err) {
    console.error('获取工单列表失败:', err);
    res.status(500).json({ error: '获取工单列表失败' });
  }
});

// 管理员工单统计
router.get('/admin/stats', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'pending'").get().count;
    const processing = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'processing'").get().count;
    const resolved = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved'").get().count;
    res.json({ stats: { total, pending, processing, resolved } });
  } catch (err) {
    console.error('获取工单统计失败:', err);
    res.status(500).json({ error: '获取工单统计失败' });
  }
});

// 管理员更新工单
router.put('/admin/:id', verifyAdminToken, requireAdmin, (req, res) => {
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
    console.error('更新工单失败:', err);
    res.status(500).json({ error: '更新工单失败' });
  }
});

module.exports = router;

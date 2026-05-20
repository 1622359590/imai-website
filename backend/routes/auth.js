/**
 * 认证路由 — 注册、登录、管理员登录、获取当前用户
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/schema');
const { verifyToken, JWT_SECRET, ADMIN_JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { phone, password, nickname, company, company_role, industry } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '手机号和密码不能为空' });
    if (!/^1\d{10}$/.test(phone)) return res.status(400).json({ error: '手机号格式不正确' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) return res.status(409).json({ error: '该手机号已注册' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (phone, password, nickname, company, company_role, industry) VALUES (?, ?, ?, ?, ?, ?)').run(phone, hashedPassword, nickname || phone, company || '', company_role || '', industry || '');

    const userId = result.lastInsertRowid;
    const token = jwt.sign({ id: userId, phone, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: '注册成功', token,
      user: { id: userId, phone, nickname: nickname || phone, role: 'user' },
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: '手机号和密码不能为空' });

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) return res.status(401).json({ error: '手机号或密码错误' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: '手机号或密码错误' });

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: '登录成功', token,
      user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar: user.avatar, role: user.role },
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 管理员登录
router.post('/admin/login', async (req, res) => {
  try {
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

// 获取当前用户信息
router.get('/me', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT u.id, u.phone, u.nickname, u.avatar, u.vip, u.vip_expires_at, u.customer_level_id, u.company, u.company_role, u.industry, u.created_at, cl.name as customer_level_name FROM users u LEFT JOIN customer_levels cl ON u.customer_level_id = cl.id WHERE u.id = ?'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ user });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

module.exports = router;

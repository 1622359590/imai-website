/**
 * AI 客服路由 — 对话、消息、评分、转人工
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/schema');
const { verifyToken, verifyAdminToken, requireAdmin, JWT_SECRET, ADMIN_JWT_SECRET } = require('../middleware/auth');
const { chat: aiChat, generateSummary, extractUserMemory } = require('../services/ai');
const { aiQueue } = require('../services/queue');
const { findSimilarLearnedRaw, rebuildIndex: rebuildRagIndex } = require('../services/rag');

const router = express.Router();

// RAG 索引重建防抖
let ragRebuildTimer = null;
function rebuildRagAsync(force = true) {
  if (ragRebuildTimer) clearTimeout(ragRebuildTimer);
  ragRebuildTimer = setTimeout(() => {
    rebuildRagIndex(force).catch(e => console.warn('RAG 重建失败:', e.message));
  }, 3000);
}

// 创建对话（需登录）
router.post('/conversations', (req, res) => {
  try {
    const db = getDb();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录后再提问' });
    }
    let userId = null;
    try {
      userId = jwt.verify(authHeader.split(' ')[1], JWT_SECRET).id;
    } catch {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }

    const guestName = req.body?.guest_name || '';
    const result = db.prepare('INSERT INTO ai_conversations (user_id, guest_name) VALUES (?, ?)').run(userId, guestName);
    const conv = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ conversation: conv });
  } catch (err) {
    console.error('创建对话失败:', err);
    res.status(500).json({ error: '创建对话失败' });
  }
});

// 发送消息 & 获取 AI 回复（需登录）
router.post('/chat', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '请先登录后再提问' });
    }
    try {
      jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }

    const { conversation_id, message, image_url } = req.body;
    if (!conversation_id || !message) return res.status(400).json({ error: '缺少 conversation_id 或 message' });

    const db = getDb();
    const conv = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(conversation_id);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    // 保存用户消息
    db.prepare('INSERT INTO ai_messages (conversation_id, role, content, image_url) VALUES (?, ?, ?, ?)').run(conversation_id, 'user', message, image_url || '');

    // 获取对话历史
    const history = db.prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id').all(conversation_id);
    const queuePosition = aiQueue.getStatus().queued;

    const { result: reply, waitMs, processMs } = await aiQueue.enqueue(
      () => aiChat(history.slice(0, -1), message, image_url, { userId: conv.user_id, conversationId: conversation_id }),
      { priority: conv.user_id ? 5 : 10 },
    );

    const replyResult = db.prepare('INSERT INTO ai_messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conversation_id, 'assistant', reply);
    db.prepare("UPDATE ai_conversations SET updated_at = datetime('now','localtime') WHERE id = ?").run(conversation_id);

    res.json({ reply, message_id: replyResult.lastInsertRowid, _queue: { waitMs, processMs, position: queuePosition } });
  } catch (err) {
    console.error('AI 对话失败:', err);
    const statusCode = err.message.includes('超时') || err.message.includes('繁忙') ? 503 : 500;
    res.status(statusCode).json({ error: err.message || 'AI 回复失败' });
  }
});

// 获取对话列表
router.get('/conversations', (req, res) => {
  try {
    const db = getDb();
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    if (token) { try { userId = jwt.verify(token, JWT_SECRET).id; } catch {} }

    if (!userId) return res.json({ conversations: [] });

    const conversations = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM ai_messages WHERE conversation_id = c.id) as message_count,
        (SELECT content FROM ai_messages WHERE conversation_id = c.id AND role = 'user' ORDER BY id LIMIT 1) as first_message
      FROM ai_conversations c WHERE c.user_id = ? ORDER BY c.updated_at DESC LIMIT 20
    `).all(userId);
    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ error: '获取对话列表失败' });
  }
});

// 获取消息列表
router.get('/conversations/:id/messages', (req, res) => {
  try {
    const db = getDb();
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: '未登录' });

    const token = authHeader.split(' ')[1];
    let isAdmin = false;
    let userId = null;

    try {
      jwt.verify(token, ADMIN_JWT_SECRET);
      isAdmin = true;
    } catch {
      try { userId = jwt.verify(token, JWT_SECRET).id; } catch { return res.status(401).json({ error: '令牌无效' }); }
    }

    if (!isAdmin) {
      const conv = db.prepare('SELECT user_id FROM ai_conversations WHERE id = ?').get(req.params.id);
      if (!conv || (conv.user_id && conv.user_id !== userId)) return res.status(403).json({ error: '无权访问此对话' });
    }

    const messages = db.prepare('SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY id').all(req.params.id);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: '获取消息失败' });
  }
});

// 消息评分 + 自学习
router.post('/messages/:id/rate', verifyToken, (req, res) => {
  try {
    const { rating } = req.body;
    if (rating !== 1 && rating !== -1 && rating !== 0) return res.status(400).json({ error: 'rating 必须是 1, -1 或 0' });

    const db = getDb();
    const msg = db.prepare(
      'SELECT m.id, m.conversation_id, m.role, m.content FROM ai_messages m JOIN ai_conversations c ON m.conversation_id = c.id WHERE m.id = ? AND c.user_id = ?'
    ).get(req.params.id, req.user.id);
    if (!msg) return res.status(404).json({ error: '消息不存在或无权操作' });

    db.prepare('UPDATE ai_messages SET rating = ? WHERE id = ?').run(rating, req.params.id);

    // 👍 好评 → 异步自学习
    if (rating === 1) {
      (async () => {
        try {
          if (msg.role === 'assistant' && msg.content) {
            const userMsg = db.prepare(
              'SELECT content FROM ai_messages WHERE conversation_id = ? AND role = ? AND id < ? ORDER BY id DESC LIMIT 1'
            ).get(msg.conversation_id, 'user', msg.id);

            const question = userMsg?.content?.trim() || '';
            const answer = msg.content.trim();

            if (question && answer && answer.length > 10) {
              const title = question.slice(0, 80);
              const similar = await findSimilarLearnedRaw(question);

              if (similar) {
                if (!similar.content.includes(answer.slice(0, 50))) {
                  db.prepare("UPDATE ai_knowledge SET content = content || ?, updated_at = datetime('now','localtime') WHERE id = ?")
                    .run('\n\n补充回答：' + answer, similar.id);
                  rebuildRagAsync();
                  console.log('🧠 AI自学习: 追加回答到相似条目 "' + similar.title + '"');
                }
              } else {
                db.prepare('INSERT INTO ai_knowledge (title, content, category, tags, status) VALUES (?, ?, ?, ?, ?)')
                  .run(title, '用户问题：' + question + '\n\n参考回答：' + answer, '自动学习', JSON.stringify(['auto_learned', '用户好评']), 'hidden');
                rebuildRagAsync();
                console.log('🧠 AI自学习: 保存优秀回答 "' + title + '"');
              }
            }
          }
        } catch (e) { console.warn('AI自学习保存失败:', e.message); }
      })();
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: '评分失败' });
  }
});

// 转人工
router.post('/conversations/:id/transfer', verifyToken, (req, res) => {
  try {
    const db = getDb();
    const conv = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    const messages = db.prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id').all(req.params.id);
    let description = '【AI 对话记录】\n\n';
    for (const msg of messages) description += `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}\n\n`;

    const { title, type, group_name } = req.body;
    const userInfo = db.prepare('SELECT nickname, phone FROM users WHERE id = ?').get(req.user.id);

    const result = db.prepare(`INSERT INTO tickets (title, description, name, contact, type, group_name, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(title || 'AI 无法解答的问题', description, userInfo?.nickname || '', userInfo?.phone || '', type || 'consult', group_name || '', req.user.id);

    db.prepare("UPDATE ai_conversations SET status = 'transferred' WHERE id = ?").run(req.params.id);

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: '已转人工客服', ticket });
  } catch (err) {
    console.error('转人工失败:', err);
    res.status(500).json({ error: '转人工失败' });
  }
});

// 管理员关闭对话
router.post('/conversations/:id/close', verifyAdminToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const conv = db.prepare('SELECT id FROM ai_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: '对话不存在' });
    db.prepare("UPDATE ai_conversations SET status = 'closed', updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
    res.json({ message: '对话已关闭' });
  } catch (err) {
    res.status(500).json({ error: '关闭失败' });
  }
});

// 用户结束对话
router.post('/conversations/:id/end', async (req, res) => {
  try {
    const db = getDb();
    const conv = db.prepare('SELECT id, status FROM ai_conversations WHERE id = ?').get(req.params.id);
    if (!conv) return res.status(404).json({ error: '对话不存在' });
    if (conv.status !== 'closed') {
      db.prepare("UPDATE ai_conversations SET status = 'closed', updated_at = datetime('now','localtime') WHERE id = ?").run(req.params.id);
      // 异步生成对话摘要 + 提取用户画像（不阻塞响应）
      try {
        const messages = db.prepare('SELECT role, content FROM ai_messages WHERE conversation_id = ? ORDER BY id').all(req.params.id);
        if (messages.length >= 2) {
          generateSummary(messages).then(summary => {
            if (summary) db.prepare('UPDATE ai_conversations SET summary = ? WHERE id = ?').run(summary, req.params.id);
          }).catch(() => {});

          const conv = db.prepare('SELECT user_id FROM ai_conversations WHERE id = ?').get(req.params.id);
          if (conv && conv.user_id) {
            extractUserMemory(conv.user_id, parseInt(req.params.id), messages);
          }
        }
      } catch {}
    }
    res.json({ message: '对话已结束' });
  } catch (err) {
    res.status(500).json({ error: '结束失败' });
  }
});

// 队列状态
router.get('/queue/status', verifyAdminToken, requireAdmin, (req, res) => {
  res.json(aiQueue.getStatus());
});

module.exports = router;

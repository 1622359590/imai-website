/**
 * AI 客服服务 — 调用 LLM API 回答用户问题
 */
const https = require('https');
const { getDb } = require('../database/schema');
const { retrieve: ragRetrieve, rebuildIndex } = require('./rag');

/**
 * 从 settings 获取 AI 配置
 */
function getAIConfig() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('ai_provider','ai_api_key','ai_model','ai_system_prompt','ai_base_url')").all();
  const config = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

/**
 * RAG 检索：根据用户问题检索相关知识（支持图片）
 */
async function getKnowledgeContext(query) {
  if (!query) return '';
  try {
    const results = await ragRetrieve(query, 5);
    if (results.length === 0) return '';
    let context = '以下是与用户问题最相关的知识库内容，请基于这些信息回答：\n\n';
    for (const item of results) {
      context += `【${item.category || '未分类'}】${item.title}\n${item.content}\n`;
      // 附带来源链接（教程/FAQ）
      if (item.source === 'tutorial' && item.parentId) {
        context += `📖 查看教程详情：[点击这里](/tutorials/${item.parentId})\n`;
      } else if (item.source === 'faq') {
        context += `❓ 更多常见问题：[查看FAQ](/faq)\n`;
      }
      // 提取内容中的外部链接
      const urls = (item.content || '').match(/https?:\/\/[^\s"'<>)\]]+/g) || [];
      const uniqueUrls = [...new Set(urls)];
      if (uniqueUrls.length > 0) {
        context += `🔗 相关链接：${uniqueUrls.map(u => `[${u}](${u})`).join('、')}\n`;
      }
      // 附带相关图片
      if (item.images && item.images.length > 0) {
        context += `相关图片：${item.images.join(', ')}\n`;
      }
      context += '\n';
    }
    return context;
  } catch (e) {
    console.warn('RAG 检索失败:', e.message);
    return '';
  }
}

/**
 * 调用 OpenAI 兼容 API
 */
function callOpenAICompat(baseUrl, apiKey, model, messages) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(baseUrl);
    const body = JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    });
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname.replace(/\/$/, '') + '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message || JSON.stringify(json.error)));
          const content = json.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          reject(new Error('AI 响应解析失败: ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 获取 provider 的 baseUrl
 */
function getProviderBaseUrl(provider) {
  const urls = {
    deepseek: 'https://api.deepseek.com',
    openai: 'https://api.openai.com/v1',
    qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  };
  return urls[provider] || '';
}

/**
 * AI 对话主函数（三层记忆：用户画像 + 历史对话 + 全局知识库）
 */
async function chat(history, userMessage, imageUrl = '', options = {}) {
  const config = getAIConfig();
  if (!config.ai_provider || !config.ai_api_key) throw new Error('AI 客服未配置，请在后台设置中配置 AI 服务商和 API Key');
  const baseUrl = config.ai_base_url || getProviderBaseUrl(config.ai_provider);
  if (!baseUrl) throw new Error('未知的 AI 服务商: ' + config.ai_provider);
  const model = config.ai_model || 'deepseek-chat';

  let systemPrompt = config.ai_system_prompt || '你是 imai.work 的智能客服助手，专门解答关于养号、获客、短视频运营的问题。请用中文回答，语气友好专业。如果不确定答案，请诚实说明并建议用户联系人工客服。';

  // 记忆 1：用户画像（静态+动态）
  systemPrompt += getUserProfile(options.userId);

  // 记忆 2：历史对话记忆
  systemPrompt += getConversationMemory(options.userId);

  // 记忆 3：RAG 知识库检索
  const knowledge = await getKnowledgeContext(userMessage);
  if (knowledge) systemPrompt += '\n\n' + knowledge;

  systemPrompt += '\n\n【回复规则】\n1. 如果知识库中有相关图片，请在回答中用 markdown 图片语法展示。\n2. 如果知识库内容中带有 📖 教程链接、🔗 外部链接 或 ❓ FAQ链接，你必须在回答末尾原样附上这些链接，不要修改链接地址。\n3. 回答要简洁实用，避免过多废话。';

  const messages = [{ role: 'system', content: systemPrompt }];
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) messages.push({ role: msg.role, content: msg.content });

  if (imageUrl) {
    messages.push({ role: 'user', content: [{ type: 'text', text: userMessage || '请分析这张图片' }, { type: 'image_url', image_url: { url: imageUrl } }] });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  return callOpenAICompat(baseUrl, config.ai_api_key, model, messages);
}

/**
 * 获取历史对话记忆（最近 5 条对话的摘要）
 */
function getConversationMemory(userId) {
  if (!userId) return '';
  try {
    const db = getDb();
    const convs = db.prepare(
      "SELECT summary FROM ai_conversations WHERE user_id = ? AND status = 'closed' AND summary != '' ORDER BY updated_at DESC LIMIT 5"
    ).all(userId);
    if (convs.length === 0) return '';
    let memory = '\n\n【历史记忆】用户之前的对话摘要：\n';
    for (const c of convs) memory += '- ' + c.summary + '\n';
    memory += '请参考这些历史信息，避免重复回答已解决的问题。';
    return memory;
  } catch { return ''; }
}

/**
 * 获取用户画像记忆（静态 + 动态）
 */
function getUserProfile(userId) {
  if (!userId) return '';
  try {
    const db = getDb();
    const parts = [];

    // 静态信息：注册时填写的
    const user = db.prepare('SELECT nickname, company, company_role, industry FROM users WHERE id = ?').get(userId);
    if (user) {
      if (user.company) parts.push('公司：' + user.company);
      if (user.company_role) parts.push('职位：' + user.company_role);
      if (user.industry) parts.push('行业：' + user.industry);
    }

    // 动态记忆：从对话中学习的
    const memories = db.prepare(
      "SELECT category, content FROM user_memory WHERE user_id = ? ORDER BY confidence DESC, updated_at DESC LIMIT 15"
    ).all(userId);
    if (memories.length > 0) {
      const catNames = { interest: '兴趣需求', behavior: '行为特征', context: '业务背景', preference: '偏好习惯', general: '其他' };
      const byCategory = {};
      for (const m of memories) {
        const cat = catNames[m.category] || '其他';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(m.content);
      }
      for (const [cat, items] of Object.entries(byCategory)) {
        parts.push(cat + '：' + items.join('、'));
      }
    }

    if (parts.length === 0) return '';
    return '\n\n【用户画像】' + parts.join('；') + '。请根据用户的具体情况给出针对性回答，不要复述这些信息。';
  } catch { return ''; }
}

/**
 * 从对话中提取用户特征并保存
 */
async function extractUserMemory(userId, conversationId, history) {
  if (!userId || history.length < 2) return;
  const config = getAIConfig();
  if (!config.ai_provider || !config.ai_api_key) return;
  const baseUrl = config.ai_base_url || getProviderBaseUrl(config.ai_provider);
  if (!baseUrl) return;
  const model = config.ai_model || 'deepseek-chat';

  const conversationText = history.map(m => (m.role === 'user' ? '用户' : 'AI') + '：' + m.content).join('\n');

  try {
    const result = await callOpenAICompat(baseUrl, config.ai_api_key, model, [
      { role: 'system', content: '你是一个用户画像分析器。从对话中提取用户的特征信息，输出 JSON 数组。\n\n每个条目格式：{"category": "分类", "content": "特征描述"}\n分类包括：\n- interest: 用户的兴趣需求（如"对抖音养号感兴趣"）\n- behavior: 用户的行为特征（如"有多个账号需要管理"）\n- context: 用户的业务背景（如"做餐饮行业"、"是个体经营者"）\n- preference: 用户的偏好习惯（如"喜欢简洁的回答"）\n\n规则：\n1. 只提取明确的信息，不要猜测\n2. 每条不超过30字\n3. 最多提取5条\n4. 如果没有值得记录的特征，输出空数组 []\n5. 只输出 JSON，不要其他内容' },
      { role: 'user', content: conversationText.slice(-3000) },
    ]);

    const jsonMatch = result.match(/\[.*\]/s);
    if (!jsonMatch) return;
    const traits = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(traits) || traits.length === 0) return;

    const db = getDb();
    const upsert = db.prepare(
      "INSERT INTO user_memory (user_id, category, content, source_conversation_id) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, content) DO UPDATE SET confidence = confidence + 0.2, updated_at = datetime('now','localtime')"
    );

    let saved = 0;
    for (const trait of traits) {
      if (!trait.content || trait.content.length > 50) continue;
      const validCategories = ['interest', 'behavior', 'context', 'preference', 'general'];
      const cat = validCategories.includes(trait.category) ? trait.category : 'general';
      try { upsert.run(userId, cat, trait.content, conversationId); saved++; } catch {}
    }
    if (saved > 0) console.log('🧠 用户画像更新: 用户' + userId + ' 新增' + saved + '条特征');
  } catch (e) {
    console.warn('用户画像提取失败:', e.message);
  }
}

/**
 * 生成对话摘要
 */
async function generateSummary(history) {
  const config = getAIConfig();
  if (!config.ai_provider || !config.ai_api_key) return '';
  const baseUrl = config.ai_base_url || getProviderBaseUrl(config.ai_provider);
  if (!baseUrl) return '';
  const model = config.ai_model || 'deepseek-chat';

  const conversationText = history.map(m => (m.role === 'user' ? '用户' : 'AI') + '：' + m.content).join('\n');

  try {
    const summary = await callOpenAICompat(baseUrl, config.ai_api_key, model, [
      { role: 'system', content: '请用一句话（不超过50字）概括这段对话的核心内容，用于记忆存档。只输出摘要，不要其他内容。' },
      { role: 'user', content: conversationText.slice(-2000) },
    ]);
    return summary.trim().slice(0, 200);
  } catch {
    return '';
  }
}

module.exports = { chat, getAIConfig, generateSummary, extractUserMemory };

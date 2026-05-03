/**
 * RAG 检索服务 — 混合检索（BM25 + 向量）+ Re-ranking
 */
const { getDb } = require('../database/schema');
let sqliteVecLoaded = false;
function ensureVec(db) {
  if (sqliteVecLoaded) return;
  try {
    const sqliteVec = require('sqlite-vec');
    sqliteVec.load(db);
    sqliteVecLoaded = true;
  } catch (e) {
    console.warn('sqlite-vec 加载失败:', e.message);
  }
}

// BM25 参数
const BM25_K1 = 1.5;
const BM25_B = 0.75;

// 常用同义词扩展
const SYNONYMS = {
  '收费': ['价格', '多少钱', '费用', '售价', '报价'],
  '价格': ['收费', '多少钱', '费用', '售价'],
  '多少钱': ['价格', '收费', '费用'],
  '购买': ['买', '下单', '订购'],
  '登录': ['登陆', '登入', '进入后台'],
  '系统': ['平台', '后台', '软件'],
  '手机': ['设备', 'AI手机'],
  '更新': ['升级', '版本更新'],
  '问题': ['故障', 'bug', '报错', '出错'],
};

// 中文分词（bigram + 同义词扩展）
function tokenize(text) {
  if (!text) return [];
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').toLowerCase();
  const tokens = [];
  // 英文单词
  const englishWords = cleaned.match(/[a-z0-9]+/g) || [];
  tokens.push(...englishWords);
  // 中文：bigram + trigram
  const chinese = cleaned.replace(/[^\u4e00-\u9fa5]/g, '');
  for (let i = 0; i < chinese.length - 1; i++) {
    tokens.push(chinese.slice(i, i + 2));
  }
  for (let i = 0; i < chinese.length - 2; i++) {
    tokens.push(chinese.slice(i, i + 3));
  }
  // 单字
  for (const char of chinese) {
    tokens.push(char);
  }
  // 同义词扩展
  const expanded = [];
  for (const token of tokens) {
    expanded.push(token);
    if (SYNONYMS[token]) {
      expanded.push(...SYNONYMS[token]);
    }
  }
  return expanded.filter(t => t.length > 0);
}

// BM25 索引
class BM25Index {
  constructor() {
    this.docs = []; // {id, tokens, length}
    this.df = {};   // document frequency
    this.totalDocs = 0;
    this.avgDocLen = 0;
  }

  build(items) {
    this.docs = [];
    this.df = {};
    this.totalDocs = items.length;
    let totalLen = 0;

    for (const item of items) {
      const tokens = tokenize(item.title + ' ' + item.content);
      this.docs.push({ id: item.id, tokens, length: tokens.length });
      totalLen += tokens.length;

      const uniqueTokens = new Set(tokens);
      for (const t of uniqueTokens) {
        this.df[t] = (this.df[t] || 0) + 1;
      }
    }
    this.avgDocLen = this.docs.reduce((sum, d) => sum + d.length, 0) / this.totalDocs;
  }

  search(query, topK = 5) {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scores = this.docs.map(doc => {
      let score = 0;
      const tf = {};
      for (const t of doc.tokens) tf[t] = (tf[t] || 0) + 1;

      for (const qt of queryTokens) {
        if (!tf[qt]) continue;
        const termFreq = tf[qt];
        const docFreq = this.df[qt] || 0;
        const idf = Math.log((this.totalDocs - docFreq + 0.5) / (docFreq + 0.5) + 1);
        const tfNorm = (termFreq * (BM25_K1 + 1)) / (termFreq + BM25_K1 * (1 - BM25_B + BM25_B * doc.length / this.avgDocLen));
        score += idf * tfNorm;
      }
      return { id: doc.id, score };
    });

    return scores.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

// 向量索引（使用 sqlite-vec）
class VectorIndex {
  constructor() {
    this.dimension = 128; // 特征哈希维度
  }

  /**
   * 简单特征哈希：将文本转为固定维度向量
   * 用 SimHash 思想，对中文和英文都有效
   */
  textToVector(text) {
    const tokens = tokenize(text);
    const vector = new Float32Array(this.dimension);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // 简单哈希
      let hash = 0;
      for (let j = 0; j < token.length; j++) {
        hash = ((hash << 5) - hash + token.charCodeAt(j)) | 0;
      }
      const idx = Math.abs(hash) % this.dimension;
      // 使用 +/-1 投影（特征哈希）
      vector[idx] += (hash > 0 ? 1 : -1);
    }
    // L2 归一化
    let norm = 0;
    for (let i = 0; i < this.dimension; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < this.dimension; i++) vector[i] /= norm;
    return vector;
  }

  initTable(db) {
    ensureVec(db);
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_vec USING vec0(
        id INTEGER PRIMARY KEY,
        embedding float[${this.dimension}]
      );
    `);
  }

  upsert(db, id, text) {
    const vector = this.textToVector(text);
    const intId = Number(id);
    if (isNaN(intId)) return;
    // 先删除旧的
    try { db.prepare('DELETE FROM knowledge_vec WHERE id = ?').run(intId); } catch {}
    // 插入新的
    db.prepare('INSERT INTO knowledge_vec (id, embedding) VALUES (?, ?)').run(intId, Buffer.from(vector.buffer));
  }

  search(db, queryText, topK = 5) {
    ensureVec(db);
    const queryVector = this.textToVector(queryText);
    try {
      const results = db.prepare(`
        SELECT id, distance FROM knowledge_vec WHERE embedding MATCH ? ORDER BY distance LIMIT ?
      `).all(Buffer.from(queryVector.buffer), topK);
      return results.map(r => ({ id: r.id, score: 1 - r.distance })); // distance -> similarity
    } catch (e) {
      // 如果向量表还没建好，返回空
      return [];
    }
  }
}

// 全局实例
let bm25Index = null;
const vectorIndex = new VectorIndex();

/**
 * 重建索引
 */
function rebuildIndex() {
  const db = getDb();
  const items = db.prepare("SELECT id, title, content FROM ai_knowledge WHERE status = 'active'").all();

  // 重建 BM25
  bm25Index = new BM25Index();
  bm25Index.build(items);

  // 重建向量
  try {
    vectorIndex.initTable(db);
    // 清空旧数据
    try { db.prepare('DELETE FROM knowledge_vec').run(); } catch {}
    for (const item of items) {
      vectorIndex.upsert(db, item.id, item.title + ' ' + item.content);
    }
  } catch (e) {
    console.warn('向量索引初始化失败（不影响 BM25 检索）:', e.message);
  }

  console.log(`RAG 索引已重建: ${items.length} 条知识`);
  return items.length;
}

/**
 * 混合检索：BM25 + 向量，加权合并
 * @param {string} query - 用户问题
 * @param {number} topK - 返回条数
 * @returns {Array} [{id, title, content, score}]
 */
function retrieve(query, topK = 5) {
  const db = getDb();

  // 确保索引已建
  if (!bm25Index) rebuildIndex();

  // BM25 检索
  const bm25Results = bm25Index.search(query, topK * 2);

  // 向量检索
  let vecResults = [];
  try {
    vecResults = vectorIndex.search(db, query, topK * 2);
  } catch {}

  // 合并分数（加权：BM25 0.6 + 向量 0.4）
  const scoreMap = {};
  for (const r of bm25Results) {
    scoreMap[r.id] = (scoreMap[r.id] || 0) + r.score * 0.6;
  }
  for (const r of vecResults) {
    scoreMap[r.id] = (scoreMap[r.id] || 0) + r.score * 0.4;
  }

  // 排序取 Top-K
  const sorted = Object.entries(scoreMap)
    .map(([id, score]) => ({ id: Number(id), score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 获取知识条目详情
  if (sorted.length === 0) return [];
  const placeholders = sorted.map(() => '?').join(',');
  const items = db.prepare(`SELECT id, title, content, category FROM ai_knowledge WHERE id IN (${placeholders}) AND status = 'active'`)
    .all(...sorted.map(s => s.id));

  // 按分数排序
  const itemMap = {};
  for (const item of items) itemMap[item.id] = item;
  return sorted
    .filter(s => itemMap[s.id])
    .map(s => ({ ...itemMap[s.id], score: s.score }));
}

module.exports = { retrieve, rebuildIndex, tokenize };

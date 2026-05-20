#!/usr/bin/env node
/**
 * imai.work 数据导出/导入工具
 * 
 * 用法：
 *   node data-tool.js export    — 导出全部数据到 ~/教程/imai-data-backup.json
 *   node data-tool.js import <文件路径>  — 从备份文件导入
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const BACKUP_DEFAULT = path.join(process.env.HOME, '教程', 'imai-data-backup.json');

const action = process.argv[2];
const importFile = process.argv[3];

if (!action || !['export', 'import'].includes(action)) {
  console.log(`
╔══════════════════════════════════════╗
║   imai.work 数据导出/导入工具        ║
╚══════════════════════════════════════╝

用法:
  node data-tool.js export              导出到默认路径
  node data-tool.js export <路径>       导出到指定路径
  node data-tool.js import <文件路径>   从备份导入

导出内容:
  ✅ 教程 (tutorials)
  ✅ FAQ (faqs)
  ✅ AI 知识库 (ai_knowledge)
  ✅ 分类 (categories)
  ✅ 客户分类 (customer_levels)
  ✅ 系统设置 (settings)
  ✅ 管理员账号 (admins，密码加密)
  ✅ 上传文件列表 (uploads/)

不导出:
  ❌ 用户数据 (users) — 隐私
  ❌ 工单数据 (tickets) — 业务数据
  ❌ AI 对话记录 — 隐私
`);
  process.exit(0);
}

// ===== 导出 =====
if (action === 'export') {
  const outPath = importFile || BACKUP_DEFAULT;
  
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ 数据库不存在:', DB_PATH);
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });
  
  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    source: 'imai.work data-tool',
    
    tutorials: db.prepare('SELECT * FROM tutorials').all(),
    faqs: db.prepare('SELECT * FROM faqs').all(),
    ai_knowledge: db.prepare('SELECT * FROM ai_knowledge').all(),
    knowledge_base: db.prepare('SELECT * FROM knowledge_base').all(),
    categories: db.prepare('SELECT * FROM categories').all(),
    customer_levels: db.prepare('SELECT * FROM customer_levels').all(),
    settings: db.prepare('SELECT * FROM settings').all(),
    admins: db.prepare('SELECT id, username, nickname, role, created_at FROM admins').all(),
  };

  // 收集上传文件列表
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    data.upload_files = fs.readdirSync(uploadsDir).filter(f => !f.startsWith('.'));
  }

  db.close();

  // 确保输出目录存在
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

  const stats = {
    '教程': data.tutorials.length,
    'FAQ': data.faqs.length,
    'AI知识库': data.ai_knowledge.length,
    '知识库': data.knowledge_base.length,
    '分类': data.categories.length,
    '客户分类': data.customer_levels.length,
    '设置': data.settings.length,
    '管理员': data.admins.length,
    '上传文件': (data.upload_files || []).length,
  };

  console.log('\n✅ 导出完成:', outPath);
  console.log('\n📊 导出统计:');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k}: ${v} 条`);
  }
  console.log('\n💡 将此文件和 uploads/ 文件夹一起复制到新电脑即可导入');
}

// ===== 导入 =====
if (action === 'import') {
  if (!importFile) {
    console.error('❌ 请指定备份文件路径: node data-tool.js import <文件路径>');
    process.exit(1);
  }

  if (!fs.existsSync(importFile)) {
    console.error('❌ 文件不存在:', importFile);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(importFile, 'utf8'));
  
  if (!data.version || !data.exported_at) {
    console.error('❌ 无效的备份文件格式');
    process.exit(1);
  }

  console.log(`\n📦 备份文件: ${importFile}`);
  console.log(`📅 导出时间: ${data.exported_at}`);
  console.log('');

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ 数据库不存在，请先启动一次后端初始化数据库');
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  
  let imported = 0;
  let skipped = 0;

  // 导入教程
  if (data.tutorials?.length) {
    const existing = new Set(db.prepare('SELECT title FROM tutorials').all().map(r => r.title));
    const ins = db.prepare('INSERT OR IGNORE INTO tutorials (title, category, content, summary, cover, tags, views, status, vip_only) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const t of data.tutorials) {
      if (existing.has(t.title)) { skipped++; continue; }
      ins.run(t.title, t.category, t.content, t.summary, t.cover, t.tags, t.views, t.status, t.vip_only);
      imported++;
    }
    console.log(`✅ 教程: ${imported} 条导入, ${skipped} 条跳过`);
    imported = 0; skipped = 0;
  }

  // 导入 FAQ
  if (data.faqs?.length) {
    const existing = new Set(db.prepare('SELECT question FROM faqs').all().map(r => r.question));
    const ins = db.prepare('INSERT OR IGNORE INTO faqs (question, answer, category, sort_order, pinned, status) VALUES (?, ?, ?, ?, ?, ?)');
    for (const f of data.faqs) {
      if (existing.has(f.question)) { skipped++; continue; }
      ins.run(f.question, f.answer, f.category, f.sort_order, f.pinned, f.status);
      imported++;
    }
    console.log(`✅ FAQ: ${imported} 条导入, ${skipped} 条跳过`);
    imported = 0; skipped = 0;
  }

  // 导入 AI 知识库
  if (data.ai_knowledge?.length) {
    const existing = new Set(db.prepare('SELECT title FROM ai_knowledge').all().map(r => r.title));
    const ins = db.prepare('INSERT OR IGNORE INTO ai_knowledge (title, content, category, tags, status) VALUES (?, ?, ?, ?, ?)');
    for (const k of data.ai_knowledge) {
      if (existing.has(k.title)) { skipped++; continue; }
      ins.run(k.title, k.content, k.category, k.tags, k.status);
      imported++;
    }
    console.log(`✅ AI知识库: ${imported} 条导入, ${skipped} 条跳过`);
    imported = 0; skipped = 0;
  }

  // 导入知识库
  if (data.knowledge_base?.length) {
    const existing = new Set(db.prepare('SELECT title FROM knowledge_base').all().map(r => r.title));
    const ins = db.prepare('INSERT OR IGNORE INTO knowledge_base (title, content, tags, category, status) VALUES (?, ?, ?, ?, ?)');
    for (const k of data.knowledge_base) {
      if (existing.has(k.title)) { skipped++; continue; }
      ins.run(k.title, k.content, k.tags, k.category, k.status);
      imported++;
    }
    console.log(`✅ 知识库: ${imported} 条导入, ${skipped} 条跳过`);
    imported = 0; skipped = 0;
  }

  // 导入分类
  if (data.categories?.length) {
    const existing = new Set(db.prepare('SELECT name FROM categories').all().map(r => r.name));
    const ins = db.prepare('INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
    for (const c of data.categories) {
      if (existing.has(c.name)) { skipped++; continue; }
      ins.run(c.name, c.icon, c.sort_order);
      imported++;
    }
    console.log(`✅ 分类: ${imported} 条导入, ${skipped} 条跳过`);
    imported = 0; skipped = 0;
  }

  // 导入客户分类
  if (data.customer_levels?.length) {
    const existing = new Set(db.prepare('SELECT name FROM customer_levels').all().map(r => r.name));
    const ins = db.prepare('INSERT OR IGNORE INTO customer_levels (name, description, sort_order) VALUES (?, ?, ?)');
    for (const l of data.customer_levels) {
      if (existing.has(l.name)) { skipped++; continue; }
      ins.run(l.name, l.description, l.sort_order);
      imported++;
    }
    console.log(`✅ 客户分类: ${imported} 条导入, ${skipped} 条跳过`);
    imported = 0; skipped = 0;
  }

  // 导入设置
  if (data.settings?.length) {
    const ins = db.prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
    for (const s of data.settings) {
      ins.run(s.key, s.value, s.updated_at);
    }
    console.log(`✅ 设置: ${data.settings.length} 条导入`);
  }

  db.close();

  // 提示上传文件
  if (data.upload_files?.length) {
    console.log(`\n📁 上传文件: ${data.upload_files.length} 个`);
    console.log('   请手动将 uploads/ 文件夹复制到 backend/ 目录下');
  }

  console.log('\n🎉 导入完成！重启后端即可生效');
}

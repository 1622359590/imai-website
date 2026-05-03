/**
 * 飞书多维表格创建工具
 *
 * 两种模式：
 *   1. 自动创建：node scripts/create_feishu_bitable.js
 *      → 通过 API 自动创建多维表格（需 bitable:app 权限）
 *
 *   2. 手动配置：node scripts/create_feishu_bitable.js --app-token=<token>
 *      → 在已有多维表格上创建字段（无需 bitable:app 权限）
 *      → <token> 从浏览器地址栏获取：https://xxx.feishu.cn/base/<app_token>?table=<table_id>
 *
 * 前置条件：
 *   - 在后台设置中已配置 feishu_app_id / feishu_app_secret
 *   - 飞书应用已开启相关权限
 *
 * 权限说明：
 *   - 自动创建需要：bitable:app（创建多维表格）
 *   - 创建字段需要：bitable:field（添加字段）
 *   - 写入记录需要：bitable:record（写数据）——这个已经是开通的
 */

const https = require('https');
const path = require('path');

const { getDb, initSchema } = require(path.join(__dirname, '..', 'database', 'schema'));
initSchema();

// ============================================================
//  工具函数
// ============================================================

let cachedToken = null;
let tokenExpiry = 0;

function getFeishuConfig() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('feishu_app_id','feishu_app_secret')").all();
  const config = {};
  for (const row of rows) {
    config[row.key] = row.value.replace(/^["']|["']$/g, '');
  }
  return config;
}

function feishuReq(method, apiPath, token, body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const options = {
      hostname: 'open.feishu.cn',
      path: apiPath,
      method,
      headers,
    };
    if (body) {
      const str = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(str);
    }

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken(appId, appSecret) {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const result = await feishuReq('POST', '/open-apis/auth/v3/tenant_access_token/internal', '', {
    app_id: appId,
    app_secret: appSecret,
  });

  if (result.status !== 200 || result.data.code !== 0) {
    throw new Error(`获取 token 失败: ${JSON.stringify(result.data)}`);
  }

  cachedToken = result.data.tenant_access_token;
  tokenExpiry = Date.now() + (result.data.expire || 7200) * 1000;
  return cachedToken;
}

// ============================================================
//  字段定义（公共）
// ============================================================

const TICKET_FIELDS = [
  { field_name: '工单标题', type: 1 },
  { field_name: '工单描述', type: 1 },
  { field_name: '提交人', type: 1 },
  { field_name: '联系方式', type: 1 },
  { field_name: '客户身份分类', type: 1 },
  { field_name: '工单类型', type: 1 },
  { field_name: '状态', type: 1 },
  { field_name: '售后群聊', type: 1 },
  { field_name: '附件链接', type: 1 },
  { field_name: '创建时间', type: 2 },
];

async function createFields(token, appToken, tableId) {
  console.log(`\n🔄 正在创建字段 (app=${appToken}, table=${tableId})...`);

  for (const field of TICKET_FIELDS) {
    const result = await feishuReq(
      'POST',
      `/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
      token,
      field
    );

    if (result.status === 200 && result.data.code === 0) {
      console.log(`  ✅ ${field.field_name}`);
    } else if (result.data?.code === 150002) {
      console.log(`  ⚠️ 字段已存在: ${field.field_name}`);
    } else {
      console.warn(`  ❌ ${field.field_name}: ${result.data?.msg || JSON.stringify(result.data)}`);
    }

    await new Promise(r => setTimeout(r, 300));
  }
}

// ============================================================
//  模式1：自动创建
// ============================================================

async function autoCreate(token) {
  console.log('\n🔄 [模式1] 正在创建多维表格...');

  const appResult = await feishuReq('POST', '/open-apis/bitable/v1/apps', token, {
    name: '工单管理系统',
  });

  if (appResult.status !== 200 || appResult.data.code !== 0) {
    const msg = appResult.data?.msg || JSON.stringify(appResult.data);
    throw new Error(`创建失败: ${msg}\n\n` +
      `💡 可能缺少 bitable:app 权限。\n` +
      `   请按以下步骤操作：\n` +
      `   1. 在飞书开发者后台开启「多维表格」权限\n` +
      `   2. 或者先手动创建多维表格，再用 --app-token 模式配置字段`);
  }

  const appToken = appResult.data.data.app.app_token;
  console.log(`✅ 多维表格创建成功！`);

  // 获取默认工作表
  const listResult = await feishuReq('GET', `/open-apis/bitable/v1/apps/${appToken}/tables`, token);
  let tableId = null;
  if (listResult.status === 200 && listResult.data.code === 0 && listResult.data.data?.items?.length > 0) {
    tableId = listResult.data.data.items[0].table_id;
    console.log(`✅ 使用默认工作表: ${tableId}`);
  }

  if (!tableId) {
    throw new Error('无法获取工作表 ID');
  }

  // 创建字段
  await createFields(token, appToken, tableId);

  // 输出结果
  console.log('\n' + '='.repeat(50));
  console.log('🎉 完成！请在后台设置中填入：');
  console.log('='.repeat(50));
  console.log(`  bitable_app_token = ${appToken}`);
  console.log(`  bitable_table_id  = ${tableId}`);
  console.log('='.repeat(50) + '\n');
}

// ============================================================
//  模式2：手动配置（已有多维表格，只需加字段）
// ============================================================

async function manualMode(token, appToken) {
  console.log(`\n🔄 [模式2] 连接到已有表格: ${appToken}`);

  // 获取工作表列表
  const listResult = await feishuReq('GET', `/open-apis/bitable/v1/apps/${appToken}/tables`, token);
  if (listResult.status !== 200 || listResult.data.code !== 0) {
    throw new Error(`获取工作表失败: ${listResult.data?.msg || JSON.stringify(listResult.data)}`);
  }

  const tables = listResult.data.data?.items || [];
  if (tables.length === 0) {
    throw new Error('该多维表格中没有工作表，请先在页面中创建一个');
  }

  // 列出所有工作表让用户选
  console.log('\n📋 找到以下工作表：');
  for (let i = 0; i < tables.length; i++) {
    console.log(`  [${i + 1}] ${tables[i].name} (${tables[i].table_id})`);
  }

  // 默认用第一个
  const tableId = tables[0].table_id;
  console.log(`\n👉 默认使用第一个: ${tables[0].name} (${tableId})`);

  // 创建字段
  await createFields(token, appToken, tableId);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 字段创建完成！');
  console.log('='.repeat(50));
  console.log(`  bitable_app_token = ${appToken}`);
  console.log(`  bitable_table_id  = ${tableId}`);
  console.log('='.repeat(50) + '\n');
}

// ============================================================
//  主入口
// ============================================================

function printManualGuide() {
  console.log('\n' + '='.repeat(50));
  console.log('  📝 手动创建步骤');
  console.log('='.repeat(50));
  console.log('');
  console.log('  1. 在飞书打开「多维表格」或新建一个');
  console.log('     - 建议名称：工单管理系统');
  console.log('');
  console.log('  2. 从浏览器地址栏获取 app_token:');
  console.log('     地址格式：https://xxx.feishu.cn/base/APP_TOKEN?table=TABLE_ID');
  console.log('     例：https://xxx.feishu.cn/base/Bm9TbOdwfaR7ads...?table=tblABC123');
  console.log('              ↑ 这个就是 app_token         ↑ 这个是 table_id');
  console.log('');
  console.log('  3. 运行脚本添加字段：');
  console.log('     node scripts/create_feishu_bitable.js --app-token=<你的app_token>');
  console.log('');
  console.log('  4. 或者手动在工作表中创建以下字段：');
  for (const f of TICKET_FIELDS) {
    const typeName = f.type === 1 ? '文本' : f.type === 2 ? '数字' : f.type === 3 ? '单选' : '其他';
    console.log(`     - ${f.field_name}（${typeName}）`);
  }
  console.log('');
  console.log('  5. 将 app_token 和 table_id 填入后台设置');
  console.log('');
}

async function main() {
  console.log('='.repeat(50));
  console.log('  飞书多维表格 — 创建工具');
  console.log('='.repeat(50));

  // 解析命令行参数
  const args = process.argv.slice(2);
  let appTokenArg = null;
  for (const arg of args) {
    if (arg.startsWith('--app-token=')) {
      appTokenArg = arg.split('=')[1];
    }
  }

  const config = getFeishuConfig();

  if (!config.feishu_app_id || !config.feishu_app_secret) {
    console.log('\n⚠️  未检测到飞书配置（feishu_app_id / feishu_app_secret）');
    printManualGuide();
    process.exit(0);
  }

  console.log(`\n📋 使用 App ID: ${config.feishu_app_id.substring(0, 8)}...`);

  try {
    const token = await getToken(config.feishu_app_id, config.feishu_app_secret);
    console.log('✅ 获取 Token 成功');

    if (appTokenArg) {
      // 模式2：在已有表格上创建字段
      await manualMode(token, appTokenArg);
    } else {
      // 模式1：自动创建
      await autoCreate(token);
    }

  } catch (err) {
    console.error(`\n❌ 出错: ${err.message}`);

    // 如果是权限问题，给出手动指南
    if (err.message.includes('权限') || err.message.includes('permission') || err.message.includes('bitable:app')) {
      console.log('\n💡 切换为手动模式：先手动创建多维表格，然后运行：');
      console.log(`   node scripts/create_feishu_bitable.js --app-token=<你的app_token>`);
      printManualGuide();
    }

    process.exit(1);
  }
}

main();

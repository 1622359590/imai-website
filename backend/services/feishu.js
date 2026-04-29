/**
 * 飞书 API 服务 — 用于工单写入多维表格
 */
const https = require('https');
const { getDb } = require('../database/schema');

let cachedToken = null;
let tokenExpiry = 0;

/**
 * 从 settings 表获取飞书配置
 */
function getFeishuConfig() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('feishu_app_id','feishu_app_secret','bitable_app_token','bitable_table_id')").all();
  const config = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

function getToken(appId, appSecret) {
  return new Promise((resolve, reject) => {
    if (cachedToken && Date.now() < tokenExpiry) return resolve(cachedToken);

    const body = JSON.stringify({ app_id: appId, app_secret: appSecret });
    const options = {
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code !== 0) return reject(new Error(json.msg));
          cachedToken = json.tenant_access_token;
          tokenExpiry = Date.now() + (json.expire || 7200) * 1000;
          resolve(cachedToken);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function feishuReq(method, apiPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'open.feishu.cn',
      path: apiPath,
      method,
      headers: { ...headers }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);

    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * 创建多维表格记录
 */
async function createRecord(fields) {
  const config = getFeishuConfig();
  if (!config.feishu_app_id || !config.feishu_app_secret || !config.bitable_app_token || !config.bitable_table_id) {
    return { skipped: true, reason: '飞书未配置' };
  }

  const token = await getToken(config.feishu_app_id, config.feishu_app_secret);
  const result = await feishuReq(
    'POST',
    `/open-apis/bitable/v1/apps/${config.bitable_app_token}/tables/${config.bitable_table_id}/records`,
    { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    JSON.stringify({ fields })
  );

  return result;
}

module.exports = { createRecord };

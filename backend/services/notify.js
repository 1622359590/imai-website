/**
 * 工单通知服务 — 推送到飞书/企业微信 Webhook
 */
const https = require('https');
const { getDb } = require('../database/schema');

/**
 * 从 settings 表获取通知配置
 */
function getNotifyConfig() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('ticket_notify_channel','ticket_notify_webhook')").all();
  const config = {};
  for (const row of rows) config[row.key] = row.value;
  return config;
}

/**
 * 发送 HTTPS POST 请求
 */
function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve(buf); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * 构建飞书消息体（富文本卡片）
 */
function buildFeishuMessage(ticket) {
  const typeLabels = { bug: '问题反馈', feature: '功能建议', consult: '咨询', other: '其他' };
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `📋 新工单：${ticket.title}` },
        template: 'orange'
      },
      elements: [
        {
          tag: 'div',
          fields: [
            { is_short: true, text: { tag: 'lark_md', content: `**工单类型**\n${typeLabels[ticket.type] || ticket.type}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**提交人**\n${ticket.name || '未填写'}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**联系方式**\n${ticket.contact || '未填写'}` } },
            { is_short: true, text: { tag: 'lark_md', content: `**售后群名**\n${ticket.group_name || '未填写'}` } },
          ]
        },
        ...(ticket.description ? [{
          tag: 'div',
          text: { tag: 'lark_md', content: `**详细描述**\n${ticket.description.slice(0, 500)}` }
        }] : []),
        { tag: 'hr' },
        {
          tag: 'note',
          elements: [{ tag: 'plain_text', content: `工单 #${ticket.id} · ${ticket.created_at}` }]
        }
      ]
    }
  };
}

/**
 * 构建企业微信消息体（Markdown）
 */
function buildWecomMessage(ticket) {
  const typeLabels = { bug: '问题反馈', feature: '功能建议', consult: '咨询', other: '其他' };
  return {
    msgtype: 'markdown',
    markdown: {
      content: [
        `## 📋 新工单：${ticket.title}`,
        `> **工单类型：**${typeLabels[ticket.type] || ticket.type}`,
        `> **提交人：**${ticket.name || '未填写'}`,
        `> **联系方式：**${ticket.contact || '未填写'}`,
        `> **售后群名：**${ticket.group_name || '未填写'}`,
        ...(ticket.description ? [`> **详细描述：**\n> ${ticket.description.slice(0, 300)}`] : []),
        `> **工单编号：**#${ticket.id}`,
        ``,
        `[点击处理工单](${ticket.manageUrl || ''})`
      ].join('\n')
    }
  };
}

/**
 * 发送工单通知
 * @param {object} ticket - 工单数据
 * @param {string} manageUrl - 后台管理链接（可选）
 */
async function sendTicketNotification(ticket, manageUrl = '') {
  const config = getNotifyConfig();
  const channel = config.ticket_notify_channel;
  const webhook = config.ticket_notify_webhook;

  if (!channel || !webhook) return { skipped: true, reason: '通知未配置' };

  try {
    let body;
    if (channel === 'feishu') {
      body = buildFeishuMessage({ ...ticket, manageUrl });
    } else if (channel === 'wecom') {
      body = buildWecomMessage({ ...ticket, manageUrl });
    } else {
      return { skipped: true, reason: '未知通知渠道: ' + channel };
    }

    const result = await postJson(webhook, body);
    console.log(`工单通知已发送 (${channel}):`, JSON.stringify(result).slice(0, 100));
    return { ok: true, channel, result };
  } catch (err) {
    console.warn('工单通知发送失败:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendTicketNotification };

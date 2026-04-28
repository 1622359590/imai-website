'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

interface Settings {
  [key: string]: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('http://localhost:37888/api/admin/settings', {
      headers: { Authorization: `Bearer ${localStorage.getItem('imai-token')}` }
    }).then(r => r.json()).then(res => {
      setSettings(res.settings || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.saveSettings(settings);
      showToast('设置已保存', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-[#f1f5f9]" />)}</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#1e293b]">系统设置</h1>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
          {saving ? '保存中...' : '保存设置'}
        </button>
      </div>

      {/* 网站信息 */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
          🌐 网站信息
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">网站名称</label>
            <input value={settings.site_name || ''} onChange={e => update('site_name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">Logo URL</label>
            <input value={settings.site_logo || ''} onChange={e => update('site_logo', e.target.value)} placeholder="https://..." className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">ICP 备案号</label>
            <input value={settings.icp_number || ''} onChange={e => update('icp_number', e.target.value)} placeholder="沪ICP备2024xxxxxx号" className="input" />
          </div>
        </div>
      </div>

      {/* 短信平台 */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
          📱 短信平台
        </h2>
        <p className="mb-4 text-xs text-[#94a3b8]">用于发送验证码（手机号注册/登录）</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">服务商</label>
            <select value={settings.sms_provider || ''} onChange={e => update('sms_provider', e.target.value)} className="select">
              <option value="">请选择</option>
              <option value="aliyun">阿里云短信</option>
              <option value="tencent">腾讯云短信</option>
              <option value="qiniu">七牛云短信</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">AccessKey</label>
              <input value={settings.sms_access_key || ''} onChange={e => update('sms_access_key', e.target.value)} className="input" type="password" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">SecretKey</label>
              <input value={settings.sms_secret || ''} onChange={e => update('sms_secret', e.target.value)} className="input" type="password" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">短信签名</label>
            <input value={settings.sms_sign || ''} onChange={e => update('sms_sign', e.target.value)} placeholder="例如：imai.work" className="input" />
          </div>
        </div>
      </div>

      {/* 微信登录 */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
          💬 微信扫码登录
        </h2>
        <p className="mb-4 text-xs text-[#94a3b8]">需要微信开放平台资质（企业认证），没有可先留空</p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">AppID</label>
            <input value={settings.wechat_app_id || ''} onChange={e => update('wechat_app_id', e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">AppSecret</label>
            <input value={settings.wechat_app_secret || ''} onChange={e => update('wechat_app_secret', e.target.value)} className="input" type="password" />
          </div>
        </div>
      </div>

      {/* 飞书集成 */}
      <div className="card">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
          🏢 飞书集成
        </h2>
        <p className="mb-4 text-xs text-[#94a3b8]">用于工单系统写入飞书多维表格</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]]">AppID</label>
            <input value={settings.feishu_app_id || ''} onChange={e => update('feishu_app_id', e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">AppSecret</label>
            <input value={settings.feishu_app_secret || ''} onChange={e => update('feishu_app_secret', e.target.value)} className="input" type="password" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">多维表格 AppToken</label>
            <input value={settings.bitable_app_token || ''} onChange={e => update('bitable_app_token', e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">工作表 TableID</label>
            <input value={settings.bitable_table_id || ''} onChange={e => update('bitable_table_id', e.target.value)} className="input" />
          </div>
        </div>
      </div>

      {/* 保存按钮（底） */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? '保存中...' : '保存所有设置'}
        </button>
      </div>
    </div>
  );
}

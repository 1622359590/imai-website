'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ticketApi, authApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

const ticketTypes = [
  { value: 'bug', label: '问题反馈', icon: '🐛' },
  { value: 'feature', label: '功能建议', icon: '💡' },
  { value: 'consult', label: '咨询', icon: '💬' },
  { value: 'other', label: '其他', icon: '📋' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '待处理', color: 'text-[#d97706]', bg: 'bg-[#fef3c7]' },
  processing: { label: '处理中', color: 'text-[#2563eb]', bg: 'bg-[#dbeafe]' },
  resolved: { label: '已解决', color: 'text-[#059669]', bg: 'bg-[#ecfdf5]' },
};

const typeLabels: Record<string, string> = {
  bug: '问题反馈',
  feature: '功能建议',
  consult: '咨询',
  other: '其他',
};

interface Attachment {
  url: string;
  filename: string;
  size: number;
}

export default function TicketPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [groupName, setGroupName] = useState('');
  const [type, setType] = useState(ticketTypes[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('imai-token');
    if (token) {
      authApi.getMe().then(res => {
        setLoggedIn(true);
        setName(res.user.nickname || '');
        setContact(res.user.phone || '');
        ticketApi.getMyTickets().then(r => setMyTickets(r.tickets || [])).catch(() => {});
      }).catch(() => {
        localStorage.removeItem('imai-token');
      });
    }
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const token = localStorage.getItem('imai-token');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload/file', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setAttachments(prev => [...prev, { url: data.url, filename: data.filename || file.name, size: data.size || file.size }]);
          showToast(`${file.name} 已上传`, 'success');
        } else {
          showToast(data.error || `${file.name} 上传失败`, 'error');
        }
      } catch (err: any) {
        showToast(`${file.name} 上传失败`, 'error');
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { showToast('请输入工单标题', 'error'); return; }
    if (!loggedIn) { showToast('请先登录后再提交工单', 'error'); return; }

    setSubmitting(true);
    try {
      await ticketApi.submit({
        title: title.trim(),
        description,
        name,
        contact,
        type,
        group_name: groupName,
        attachments: attachments.map(a => ({ url: a.url, filename: a.filename })),
      });
      showToast('🎉 工单提交成功！', 'success');
      setTitle(''); setDescription(''); setAttachments([]); setGroupName('');
      setShowForm(false);
      ticketApi.getMyTickets().then(r => setMyTickets(r.tickets || [])).catch(() => {});
    } catch (err: any) {
      showToast(err.message || '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = myTickets.filter(t => t.status === 'pending').length;
  const processingCount = myTickets.filter(t => t.status === 'processing').length;
  const resolvedCount = myTickets.filter(t => t.status === 'resolved').length;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          {/* 页面标题 */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1e293b]">我的工单</h1>
              <p className="mt-1 text-sm text-[#64748b]">查看工单进度，需要帮助也可以提交新工单</p>
            </div>
            {loggedIn && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn btn-primary"
              >
                {showForm ? '收起表单' : '+ 提交新工单'}
              </button>
            )}
          </div>

          {!loggedIn ? (
            <div className="card text-center py-16">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8b5cf6]/10">
                <svg className="h-8 w-8 text-[#8b5cf6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#1e293b]">请先登录</h2>
              <p className="mt-1 text-sm text-[#64748b]">登录后才能查看和提交工单</p>
              <button onClick={() => router.push('/login')} className="btn btn-primary mt-6">去登录</button>
            </div>
          ) : (
            <>
              {/* 工单统计 */}
              <div className="mb-6 grid grid-cols-4 gap-3">
                <div className="card text-center py-3">
                  <p className="text-2xl font-bold text-[#1e293b]">{myTickets.length}</p>
                  <p className="text-xs text-[#64748b]">全部</p>
                </div>
                <div className="card text-center py-3">
                  <p className="text-2xl font-bold text-[#d97706]">{pendingCount}</p>
                  <p className="text-xs text-[#d97706]/70">待处理</p>
                </div>
                <div className="card text-center py-3">
                  <p className="text-2xl font-bold text-[#2563eb]">{processingCount}</p>
                  <p className="text-xs text-[#2563eb]/70">处理中</p>
                </div>
                <div className="card text-center py-3">
                  <p className="text-2xl font-bold text-[#059669]">{resolvedCount}</p>
                  <p className="text-xs text-[#059669]/70">已解决</p>
                </div>
              </div>

              {/* 提交新工单（折叠） */}
              {showForm && (
                <div className="card mb-6 border-[#8b5cf6]/30">
                  <h2 className="mb-4 text-base font-semibold text-[#1e293b]">提交新工单</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 工单类型 */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#64748b]">工单类型</label>
                      <div className="grid grid-cols-4 gap-2">
                        {ticketTypes.map(t => (
                          <button key={t.value} type="button" onClick={() => setType(t.value)}
                            className={`flex items-center justify-center gap-1.5 rounded-lg p-2.5 border text-sm transition-all ${
                              type === t.value ? 'border-[#8b5cf6] bg-[#f5f3ff] text-[#8b5cf6]' : 'border-[#e2e8f0] text-[#64748b] hover:border-[#cbd5e1]'
                            }`}>
                            <span>{t.icon}</span>
                            <span className="text-xs font-medium">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748b]">标题 *</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="简单描述你的问题" className="input" />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748b]">详细描述</label>
                      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="越详细，处理越快" className="input" rows={4} />
                    </div>

                    {/* 文件上传 */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#64748b]">附件</label>
                      <div className="rounded-lg border-2 border-dashed border-[#e2e8f0] p-3 text-center hover:border-[#8b5cf6] transition-colors">
                        <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={handleUpload} />
                        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                          className="text-sm text-[#64748b] hover:text-[#8b5cf6] transition-colors">
                          {uploading ? '上传中...' : '📎 点击上传附件'}
                        </button>
                      </div>
                      {attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {attachments.map((att, i) => (
                            <div key={i} className="flex items-center justify-between rounded border border-[#e2e8f0] px-3 py-1.5 text-sm">
                              <span className="text-[#1e293b] truncate">{att.filename} <span className="text-[#94a3b8] text-xs">{formatSize(att.size)}</span></span>
                              <button type="button" onClick={() => removeAttachment(i)} className="text-[#94a3b8] hover:text-[#ef4444] ml-2">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#64748b]">联系人</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#64748b]">联系方式</label>
                        <input value={contact} onChange={e => setContact(e.target.value)} className="input" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#64748b]">售后群名</label>
                        <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="选填" className="input" />
                      </div>
                    </div>

                    <button type="submit" disabled={submitting} className="btn btn-primary w-full justify-center py-2.5">
                      {submitting ? '提交中...' : '提交工单'}
                    </button>
                  </form>
                </div>
              )}

              {/* 工单列表 */}
              {myTickets.length > 0 ? (
                <div className="space-y-3">
                  {myTickets.map((ticket: any) => {
                    const sc = statusConfig[ticket.status] || statusConfig.pending;
                    return (
                      <div key={ticket.id}
                        className="card cursor-pointer hover:border-[#8b5cf6] transition-all p-4"
                        onClick={() => router.push(`/ticket/${ticket.id}`)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#1e293b] truncate">{ticket.title}</p>
                            <p className="mt-1 text-xs text-[#94a3b8] line-clamp-1">{ticket.description || '无描述'}</p>
                          </div>
                          <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-[#94a3b8]">
                          <span>{typeLabels[ticket.type] || ticket.type}</span>
                          <span>·</span>
                          <span>{ticket.created_at?.split(' ')[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-center py-12">
                  <p className="text-[#94a3b8]">暂无工单</p>
                  <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm mt-3">提交第一个工单</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

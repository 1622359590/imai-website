'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ticketApi, authApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

const ticketTypes = [
  {
    value: 'bug',
    label: '问题反馈',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  },
  {
    value: 'feature',
    label: '功能建议',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  },
  {
    value: 'consult',
    label: '咨询',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>,
  },
  {
    value: 'other',
    label: '其他',
    icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  },
];

interface Attachment {
  url: string;
  filename: string;
  size: number;
}

export default function TicketPage() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [type, setType] = useState(ticketTypes[0].value); // 默认第一个
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [showMyTickets, setShowMyTickets] = useState(false);
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
        showToast(`${file.name} 上传失败: ${err.message}`, 'error');
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
        attachments: attachments.map(a => ({ url: a.url, filename: a.filename })),
      });
      showToast('🎉 工单提交成功！', 'success');
      setTitle(''); setDescription(''); setAttachments([]);
      ticketApi.getMyTickets().then(r => setMyTickets(r.tickets || [])).catch(() => {});
    } catch (err: any) {
      showToast(err.message || '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8fafc]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          {/* 页面标题 */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-[#1e293b]">提交工单</h1>
            <p className="mt-2 text-[#64748b]">遇到问题？告诉我们，技术团队会尽快为你处理</p>
          </div>

          {!loggedIn ? (
            <div className="card text-center py-16">
              <svg className="mx-auto h-16 w-16 text-[#cbd5e1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <h2 className="mt-4 text-lg font-semibold text-[#1e293b]">请先登录</h2>
              <p className="mt-1 text-sm text-[#64748b]">登录后才能提交工单并查看处理进度</p>
              <button onClick={() => router.push('/login')} className="btn btn-primary mt-6">
                去登录
              </button>
            </div>
          ) : (
            <>
              {/* 工单统计 - 数据来自当前用户的工单记录 */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="card text-center">
                  <p className="text-2xl font-bold text-[#8b5cf6]">{myTickets.length}</p>
                  <p className="text-xs text-[#64748b] mt-1">我的工单</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-[#f59e0b]">{myTickets.filter(t => t.status === 'pending').length}</p>
                  <p className="text-xs text-[#64748b] mt-1">待处理</p>
                </div>
                <div className="card text-center">
                  <p className="text-2xl font-bold text-[#10b981]">{myTickets.filter(t => t.status === 'resolved').length}</p>
                  <p className="text-xs text-[#64748b] mt-1">已解决</p>
                </div>
              </div>

              {/* 工单表单 */}
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-[#1e293b] mb-6">提交新工单</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* 工单类型 */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[#64748b]">工单类型</label>
                    <div className="grid grid-cols-4 gap-2">
                      {ticketTypes.map(t => (
                        <button key={t.value} type="button" onClick={() => setType(t.value)}
                          className={`flex flex-col items-center gap-1 rounded-lg p-3 border transition-all ${
                            type === t.value ? 'border-[#8b5cf6] bg-[#f5f3ff] text-[#8b5cf6]' : 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1]'
                          }`}
                        >
                          <span className="w-6 h-6">{t.icon}</span>
                          <span className="text-xs font-medium">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 标题 */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#64748b]">标题 *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="简单描述你的问题" className="input" />
                  </div>

                  {/* 描述 */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#64748b]">详细描述</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="越详细，处理越快" className="input" rows={5} />
                  </div>

                  {/* 文件上传 */}
                  <div>
                    <label className="mb-2 block text-xs font-medium text-[#64748b]">附件（截图、文件、视频）</label>
                    <div className="rounded-lg border-2 border-dashed border-[#e2e8f0] p-4 text-center transition-colors hover:border-[#8b5cf6]">
                      <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={handleUpload} />
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="flex flex-col items-center gap-2 mx-auto text-[#64748b] hover:text-[#8b5cf6] transition-colors">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <span className="text-sm">{uploading ? '上传中...' : '点击上传附件'}</span>
                        <span className="text-xs text-[#94a3b8]">支持图片、视频、PDF、文档，单文件最大 10MB</span>
                      </button>
                    </div>

                    {/* 已上传文件列表 */}
                    {attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {attachments.map((att, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-[#e2e8f0] bg-white px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 flex-shrink-0 text-[#8b5cf6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                              <span className="text-sm text-[#1e293b] truncate">{att.filename}</span>
                              <span className="text-xs text-[#94a3b8] flex-shrink-0">{formatSize(att.size)}</span>
                            </div>
                            <button type="button" onClick={() => removeAttachment(i)}
                              className="ml-2 p-1 rounded hover:bg-[#fef2f2] text-[#94a3b8] hover:text-[#ef4444] transition-colors flex-shrink-0">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 姓名 + 联系方式 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748b]">联系人</label>
                      <input value={name} onChange={e => setName(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#64748b]">联系方式</label>
                      <input value={contact} onChange={e => setContact(e.target.value)} className="input" />
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="btn btn-primary w-full justify-center py-3">
                    {submitting ? '提交中...' : '提交工单'}
                  </button>
                </form>
              </div>

              {/* 我的工单 */}
              {myTickets.length > 0 && (
                <div className="card">
                  <button onClick={() => setShowMyTickets(!showMyTickets)} className="flex items-center justify-between w-full">
                    <h2 className="text-lg font-semibold text-[#1e293b]">我的工单记录</h2>
                    <svg className={`h-5 w-5 text-[#64748b] transition-transform ${showMyTickets ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showMyTickets && (
                    <div className="mt-4 space-y-3">
                      {myTickets.map((ticket: any) => (
                        <div key={ticket.id} className="rounded-lg border border-[#e2e8f0] p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-[#1e293b]">{ticket.title}</p>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              ticket.status === 'pending' ? 'bg-[#fef3c7] text-[#d97706]' :
                              ticket.status === 'processing' ? 'bg-[#dbeafe] text-[#2563eb]' :
                              'bg-[#ecfdf5] text-[#059669]'
                            }`}>
                              {ticket.status === 'pending' ? '待处理' :
                               ticket.status === 'processing' ? '处理中' : '已解决'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#94a3b8]">{ticket.created_at?.split(' ')[0]}</p>
                        </div>
                      ))}
                    </div>
                  )}
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

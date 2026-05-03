'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ticketApi, authApi } from '@/lib/api';

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

interface Ticket {
  id: number;
  title: string;
  description: string;
  name: string;
  contact: string;
  type: string;
  attachments: string;
  status: string;
  reply: string;
  created_at: string;
  updated_at: string;
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('imai-token');
    if (!token) {
      router.push('/login');
      return;
    }
    authApi.getMe().then(() => {
      ticketApi.getTicket(ticketId)
        .then(res => setTicket(res.ticket))
        .catch(err => setError(err.message || '工单不存在'))
        .finally(() => setLoading(false));
    }).catch(() => {
      localStorage.removeItem('imai-token');
      router.push('/login');
    });
  }, [ticketId, router]);

  const parseAttachments = (raw: string) => {
    try { return JSON.parse(raw || '[]'); } catch { return []; }
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    return t.split('.')[0]?.replace('T', ' ') || t;
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f8fafc]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/ticket')}
            className="mb-6 flex items-center gap-1.5 text-sm text-[#64748b] hover:text-[#8b5cf6] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7l-7 7 7 7"/>
            </svg>
            返回工单列表
          </button>

          {loading ? (
            <div className="card">
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-2/3 rounded bg-[#e2e8f0]" />
                <div className="h-4 w-1/3 rounded bg-[#e2e8f0]" />
                <div className="h-20 rounded bg-[#e2e8f0]" />
              </div>
            </div>
          ) : error ? (
            <div className="card text-center py-16">
              <svg className="mx-auto h-16 w-16 text-[#cbd5e1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
              </svg>
              <h2 className="mt-4 text-lg font-semibold text-[#1e293b]">{error}</h2>
              <button onClick={() => router.push('/ticket')} className="btn btn-primary mt-6">
                返回工单列表
              </button>
            </div>
          ) : ticket ? (
            <div className="space-y-6">
              {/* 工单头部 */}
              <div className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl font-bold text-[#1e293b]">{ticket.title}</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#94a3b8]">
                      <span>工单 #{ticket.id}</span>
                      <span>·</span>
                      <span>{typeLabels[ticket.type] || ticket.type}</span>
                      <span>·</span>
                      <span>{formatTime(ticket.created_at)}</span>
                    </div>
                  </div>
                  {(() => {
                    const sc = statusConfig[ticket.status] || statusConfig.pending;
                    return (
                      <span className={`inline-flex items-center text-sm font-medium px-3 py-1 rounded-full ${sc.bg} ${sc.color} flex-shrink-0`}>
                        {sc.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* 问题描述 */}
              {ticket.description && (
                <div className="card">
                  <h2 className="text-sm font-medium text-[#64748b] mb-3">问题描述</h2>
                  <p className="text-sm text-[#1e293b] whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>
              )}

              {/* 附件 */}
              {parseAttachments(ticket.attachments).length > 0 && (
                <div className="card">
                  <h2 className="text-sm font-medium text-[#64748b] mb-3">附件</h2>
                  <div className="space-y-2">
                    {parseAttachments(ticket.attachments).map((att: any, i: number) => (
                      <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-[#8b5cf6] hover:border-[#8b5cf6] hover:bg-[#f5f3ff] transition-all">
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {att.filename || '附件'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 管理员回复 */}
              <div className="card">
                <h2 className="text-sm font-medium text-[#64748b] mb-3">管理员回复</h2>
                {ticket.reply ? (
                  <div className="rounded-lg border border-[#8b5cf6]/20 bg-[#f5f3ff] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-[#8b5cf6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span className="text-xs font-medium text-[#8b5cf6]">官方回复</span>
                      {ticket.updated_at !== ticket.created_at && (
                        <span className="text-xs text-[#94a3b8] ml-auto">{formatTime(ticket.updated_at)}</span>
                      )}
                    </div>
                    <p className="text-sm text-[#1e293b] whitespace-pre-wrap leading-relaxed">{ticket.reply}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#e2e8f0] p-6 text-center">
                    <svg className="mx-auto h-8 w-8 text-[#cbd5e1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="mt-2 text-sm text-[#94a3b8]">暂无回复，请耐心等待</p>
                  </div>
                )}
              </div>

              {/* 联系信息 */}
              <div className="card">
                <h2 className="text-sm font-medium text-[#64748b] mb-3">联系信息</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#94a3b8]">联系人</span>
                    <p className="mt-0.5 text-[#1e293b]">{ticket.name || '未填写'}</p>
                  </div>
                  <div>
                    <span className="text-[#94a3b8]">联系方式</span>
                    <p className="mt-0.5 text-[#1e293b]">{ticket.contact || '未填写'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tutorials: 0, published: 0, faqs: 0, users: 0, todayViews: 0, tickets: 0, ticketsPending: 0, ticketsProcessing: 0, ticketsResolved: 0 });
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getTickets(),
    ]).then(([statsRes, ticketsRes]) => {
      setStats(statsRes.stats);
      setTickets((ticketsRes.tickets || []).slice(0, 5));
    }).catch(() => showToast('获取数据失败', 'error')).finally(() => setLoading(false));
  }, []);

  const mainStats = [
    { label: '注册用户', value: stats.users, icon: 'users', color: '#8b5cf6', bg: 'from-[#8b5cf6]/10 to-[#a855f7]/5', border: 'border-[#8b5cf6]/15' },
    { label: '已发布教程', value: stats.published, icon: 'book', color: '#3b82f6', bg: 'from-[#3b82f6]/10 to-[#2563eb]/5', border: 'border-[#3b82f6]/15' },
    { label: 'FAQ 条目', value: stats.faqs, icon: 'help', color: '#f59e0b', bg: 'from-[#f59e0b]/10 to-[#d97706]/5', border: 'border-[#f59e0b]/15' },
    { label: '今日浏览', value: stats.todayViews, icon: 'eye', color: '#10b981', bg: 'from-[#10b981]/10 to-[#059669]/5', border: 'border-[#10b981]/15' },
  ];

  const ticketStats = [
    { label: '全部工单', value: stats.tickets, color: '#64748b' },
    { label: '待处理', value: stats.ticketsPending, color: '#f59e0b' },
    { label: '处理中', value: stats.ticketsProcessing, color: '#3b82f6' },
    { label: '已解决', value: stats.ticketsResolved, color: '#10b981' },
  ];

  const icons: Record<string, JSX.Element> = {
    users: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    book: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
    help: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    eye: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  };

  return (
    <div className="space-y-5">
      {/* 欢迎区 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] p-6 text-white shadow-lg shadow-[#8b5cf6]/15">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="text-xl font-bold">欢迎回来 👋</h1>
          <p className="mt-1 text-sm text-white/70">这是你的 imai.work 控制台，系统运行一切正常</p>
          <div className="mt-4 flex gap-2">
            <Link href="/admin/tutorials/new" className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3.5 py-1.5 text-sm font-medium text-white hover:bg-white/30 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新建教程
            </Link>
            <Link href="/admin/ai" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-1.5 text-sm text-white/80 hover:bg-white/20 transition-colors">
              AI 知识库
            </Link>
          </div>
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {mainStats.map((s) => (
          <div key={s.label} className={`stat-card border ${s.border}`}>
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg}`} style={{ color: s.color }}>
                {icons[s.icon]}
              </div>
              {loading ? (
                <div className="skeleton h-7 w-12 rounded-lg" />
              ) : (
                <p className="text-2xl font-bold text-[var(--text-primary)]">{s.value}</p>
              )}
            </div>
            <p className="mt-2.5 text-xs font-medium text-[var(--text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 工单 + 最新教程 两栏 */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* 工单概览 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">工单概览</h2>
              <Link href="/admin/tickets" className="text-xs text-[var(--accent)] hover:underline">查看全部 →</Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {ticketStats.map((t) => (
                <div key={t.label} className="rounded-xl border border-[var(--border)] p-3 text-center">
                  <p className="text-xl font-bold" style={{ color: t.color }}>{loading ? '-' : t.value}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 最新工单 */}
          {tickets.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">最新工单</h2>
              </div>
              <div className="divide-y divide-[#f1f5f9]">
                {tickets.map((t: any) => (
                  <Link key={t.id} href="/admin/tickets" className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-secondary)] transition-colors">
                    <span className={`status-dot ${t.status === 'pending' ? 'status-dot-warning' : t.status === 'processing' ? 'status-dot-info' : 'status-dot-success'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{t.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{t.name || '匿名'} · {t.created_at?.split(' ')[0]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 最新教程 */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden h-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">最新教程</h2>
              <Link href="/admin/tutorials" className="text-xs text-[var(--accent)] hover:underline">查看全部 →</Link>
            </div>
            <TutorialList />
          </div>
        </div>
      </div>
    </div>
  );
}

function TutorialList() {
  const [tutorials, setTutorials] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getTutorials().then(res => {
      setTutorials((res.tutorials || []).slice(0, 6));
    }).catch(console.error);
  }, []);

  if (tutorials.length === 0) {
    return <div className="empty-state py-12"><p className="empty-state-text">暂无教程</p></div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {['标题', '分类', '状态', '阅读', '时间'].map(h => (
              <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-secondary)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tutorials.map((t: any) => (
            <tr key={t.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
              <td className="px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] max-w-[250px] truncate">{t.title}</td>
              <td className="px-5 py-2.5"><span className="tag">{t.category}</span></td>
              <td className="px-5 py-2.5">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.status === 'published' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <span className={`status-dot ${t.status === 'published' ? 'status-dot-success' : 'status-dot-warning'}`} />
                  {t.status === 'published' ? '已发布' : '草稿'}
                </span>
              </td>
              <td className="px-5 py-2.5 text-sm text-[var(--text-secondary)]">{t.views}</td>
              <td className="px-5 py-2.5 text-xs text-[var(--text-muted)]">{t.created_at?.split(' ')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

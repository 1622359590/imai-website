'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tutorials: 0, published: 0, faqs: 0, users: 0, todayViews: 0 });

  useEffect(() => {
    adminApi.getStats().then(res => {
      setStats(res.stats);
    }).catch(console.error);
  }, []);

  const statCards = [
    { label: '已发布教程', value: stats.published, color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/5' },
    { label: '全部教程', value: stats.tutorials, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/5' },
    { label: 'FAQ', value: stats.faqs, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/5' },
    { label: '注册用户', value: stats.users, color: 'text-[#10b981]', bg: 'bg-[#10b981]/5' },
  ];

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="card">
            <p className="text-sm text-[#64748b]">{card.label}</p>
            <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="card">
        <h2 className="mb-4 text-base font-semibold text-[#1e293b]">快速操作</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/tutorials/new" className="btn btn-primary btn-sm">
            + 新建教程
          </Link>
          <Link href="/admin/faq" className="btn btn-secondary btn-sm">
            + 新建 FAQ
          </Link>
          <Link href="/admin/users" className="btn btn-secondary btn-sm">
            + 创建用户
          </Link>
        </div>
      </div>

      {/* 最新教程 */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1e293b]">最新教程</h2>
          <Link href="/admin/tutorials" className="text-xs text-[#8b5cf6] hover:underline">查看全部</Link>
        </div>
        <TutorialList />
      </div>
    </div>
  );
}

function TutorialList() {
  const [tutorials, setTutorials] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getTutorials().then(res => {
      setTutorials((res.tutorials || []).slice(0, 5));
    }).catch(console.error);
  }, []);

  if (tutorials.length === 0) {
    return <div className="py-8 text-center text-sm text-[#94a3b8]">暂无教程</div>;
  }

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>标题</th>
          <th>分类</th>
          <th>状态</th>
          <th>阅读</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        {tutorials.map((t: any) => (
          <tr key={t.id}>
            <td className="font-medium max-w-[300px] truncate">{t.title}</td>
            <td><span className="tag">{t.category}</span></td>
            <td>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                t.status === 'published' ? 'text-[#10b981]' : 'text-[#f59e0b]'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                  t.status === 'published' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'
                }`} />
                {t.status === 'published' ? '已发布' : '草稿'}
              </span>
            </td>
            <td>{t.views}</td>
            <td className="text-[#94a3b8]">{t.created_at?.split(' ')[0]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

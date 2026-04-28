'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { tutorialApi, faqApi, authApi } from '@/lib/api';

interface Tutorial {
  id: number;
  title: string;
  category: string;
  status: string;
  views: number;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tutorials: 0, faqs: 0, users: 0 });
  const [recentTutorials, setRecentTutorials] = useState<Tutorial[]>([]);

  useEffect(() => {
    Promise.all([
      tutorialApi.getList({}),
      faqApi.getList({}),
      authApi.getMe(),
    ]).then(([tutorialRes, faqRes]) => {
      setStats({
        tutorials: tutorialRes.tutorials?.length || 0,
        faqs: faqRes.faqs?.length || 0,
        users: 1,
      });
      setRecentTutorials((tutorialRes.tutorials || []).slice(0, 5));
    }).catch(console.error);
  }, []);

  const statCards = [
    { label: '已发布教程', value: stats.tutorials, color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/5' },
    { label: 'FAQ', value: stats.faqs, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/5' },
    { label: '注册用户', value: stats.users, color: 'text-[#10b981]', bg: 'bg-[#10b981]/5' },
  ];

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid gap-6 sm:grid-cols-3">
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
        </div>
      </div>

      {/* 最新教程 */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1e293b]">最新教程</h2>
          <Link href="/admin/tutorials" className="text-xs text-[#00d4ff] hover:underline">查看全部</Link>
        </div>
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
            {recentTutorials.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.title}</td>
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
      </div>
    </div>
  );
}

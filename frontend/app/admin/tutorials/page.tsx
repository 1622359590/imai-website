'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

const categories = ['全部', '抖音', '快手', '小红书', '微信', '其他'];
const statuses = ['全部', 'published', 'draft'];

interface Tutorial {
  id: number;
  title: string;
  category: string;
  status: string;
  views: number;
  created_at: string;
}

export default function AdminTutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchTutorials = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (category !== '全部') params.category = category;
    if (status !== '全部') params.status = status;

    fetch(`http://localhost:37888/api/admin/tutorials?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('imai-token')}` }
    }).then(r => r.json()).then(res => {
      setTutorials(res.tutorials || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchTutorials(); }, [category, status]);

  const handleDelete = async (id: number) => {
    try {
      await adminApi.deleteTutorial(id);
      showToast('删除成功', 'success');
      setDeleteId(null);
      fetchTutorials();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#1e293b]">教程管理</h1>
          <Link href="/admin/tutorials/new" className="btn btn-primary btn-sm">+ 新建教程</Link>
        </div>

        {/* 筛选 */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  category === cat ? 'bg-[#00d4ff] text-white' : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                }`}>{cat}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  status === s ? 'bg-[#00d4ff] text-white' : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                }`}>{s === 'all' ? '全部' : s === 'published' ? '已发布' : '草稿'}</button>
            ))}
          </div>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="mt-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-[#f1f5f9]" />)}
          </div>
        ) : tutorials.length === 0 ? (
          <div className="mt-8 py-12 text-center text-[#94a3b8]">暂无教程</div>
        ) : (
          <table className="mt-6 w-full">
            <thead>
              <tr>
                <th>标题</th>
                <th>分类</th>
                <th>状态</th>
                <th>阅读</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tutorials.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium max-w-[300px] truncate">{t.title}</td>
                  <td><span className="tag">{t.category}</span></td>
                  <td>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      t.status === 'published' ? 'text-[#10b981]' : 'text-[#f59e0b]'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${t.status === 'published' ? 'bg-[#10b981]' : 'bg-[#f59e0b]'}`} />
                      {t.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td>{t.views}</td>
                  <td className="text-[#94a3b8] text-xs">{t.created_at?.split(' ')[0]}</td>
                  <td>
                    <div className="flex gap-2">
                      <Link href={`/admin/tutorials/${t.id}`} className="rounded px-2 py-1 text-xs text-[#00d4ff] hover:bg-[#00d4ff]/5 transition-colors">
                        编辑
                      </Link>
                      <button onClick={() => setDeleteId(t.id)} className="rounded px-2 py-1 text-xs text-[#ef4444] hover:bg-[#ef4444]/5 transition-colors">
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#1e293b]">确认删除</h3>
            <p className="mt-2 text-sm text-[#64748b]">删除后无法恢复，确定要删除这条教程吗？</p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary btn-sm">取消</button>
              <button onClick={() => handleDelete(deleteId)} className="btn btn-danger btn-sm">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

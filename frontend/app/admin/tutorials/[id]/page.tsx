'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import MDEditor from '@uiw/react-md-editor';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

const categories = ['抖音', '快手', '小红书', '微信', '其他'];

interface Tutorial {
  id: number;
  title: string;
  category: string;
  content: string;
  summary: string;
  cover: string;
  tags: string;
  status: string;
}

export default function EditTutorialPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('抖音');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [cover, setCover] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`http://localhost:37888/api/admin/tutorials/${params.id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('imai-token')}` }
    }).then(r => r.json()).then(res => {
      const t = res.tutorial;
      setTitle(t.title);
      setCategory(t.category);
      setContent(t.content);
      setSummary(t.summary || '');
      setCover(t.cover || '');
      setTags(JSON.parse(t.tags || '[]').join(' '));
      setStatus(t.status);
    }).catch(() => {
      showToast('加载教程失败', 'error');
      router.push('/admin/tutorials');
    }).finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSubmit = async (publishStatus?: string) => {
    if (!title.trim()) { showToast('请输入标题', 'error'); return; }
    setSaving(true);
    try {
      const tagArr = tags ? tags.split(/[,，\s]+/).filter(Boolean) : [];
      await adminApi.updateTutorial(params.id as string, {
        title: title.trim(),
        category,
        content,
        summary: summary.trim(),
        cover: cover.trim(),
        tags: JSON.stringify(tagArr),
        status: publishStatus || status,
      });
      showToast('更新成功', 'success');
      router.push('/admin/tutorials');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1,2,3,4,5].map(i => <div key={i} className="h-8 animate-pulse rounded bg-[#f1f5f9]" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-[#64748b]">
        <Link href="/admin/tutorials" className="hover:text-[#00d4ff]">教程管理</Link>
        <span>/</span>
        <span className="text-[#1e293b]">编辑教程</span>
      </div>

      <div className="card">
        <h1 className="mb-6 text-lg font-semibold text-[#1e293b]">编辑教程</h1>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">标题 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="教程标题" className="input" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">分类 *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="select">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">状态</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="select">
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">标签</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="用空格分隔" className="input" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">摘要</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} className="input" rows={2} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">封面图 URL</label>
            <input value={cover} onChange={e => setCover(e.target.value)} className="input" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">正文</label>
            <div data-color-mode="light">
              <MDEditor value={content} onChange={(val) => setContent(val || '')} height={500} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <Link href="/admin/tutorials" className="btn btn-secondary btn-sm">取消</Link>
            <button onClick={() => handleSubmit('draft')} disabled={saving} className="btn btn-secondary btn-sm">
              保存草稿
            </button>
            <button onClick={() => handleSubmit('published')} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? '保存中...' : '保存并发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

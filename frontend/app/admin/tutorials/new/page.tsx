'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MDEditor from '@uiw/react-md-editor';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

const categories = ['抖音', '快手', '小红书', '微信', '其他'];

export default function NewTutorialPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('抖音');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [cover, setCover] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (publishStatus?: string) => {
    if (!title.trim()) { showToast('请输入标题', 'error'); return; }
    if (!category) { showToast('请选择分类', 'error'); return; }

    setSaving(true);
    try {
      const tagArr = tags ? tags.split(/[,，\s]+/).filter(Boolean) : [];
      await adminApi.createTutorial({
        title: title.trim(),
        category,
        content,
        summary: summary.trim(),
        cover: cover.trim(),
        tags: JSON.stringify(tagArr),
        status: publishStatus || status,
      });
      showToast('教程创建成功', 'success');
      router.push('/admin/tutorials');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-[#64748b]">
        <Link href="/admin/tutorials" className="hover:text-[#00d4ff]">教程管理</Link>
        <span>/</span>
        <span className="text-[#1e293b]">新建教程</span>
      </div>

      <div className="card">
        <h1 className="mb-6 text-lg font-semibold text-[#1e293b]">新建教程</h1>

        <div className="space-y-5">
          {/* 标题 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">标题 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="教程标题" className="input" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 分类 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">分类 *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="select">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* 状态 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">状态</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="select">
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </div>
            {/* 标签 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[#64748b]">标签</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="用空格或逗号分隔" className="input" />
            </div>
          </div>

          {/* 摘要 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">摘要</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="教程简短描述" className="input" rows={2} />
          </div>

          {/* 封面 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">封面图 URL</label>
            <input value={cover} onChange={e => setCover(e.target.value)} placeholder="https://..." className="input" />
            {cover && <img src={cover} alt="preview" className="mt-2 h-32 rounded-lg object-cover" />}
          </div>

          {/* 正文编辑器 */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[#64748b]">正文 *</label>
            <div data-color-mode="light">
              <MDEditor value={content} onChange={(val) => setContent(val || '')} height={500} />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e2e8f0]">
            <Link href="/admin/tutorials" className="btn btn-secondary btn-sm">取消</Link>
            <button onClick={() => handleSubmit('draft')} disabled={saving} className="btn btn-secondary btn-sm">
              保存草稿
            </button>
            <button onClick={() => handleSubmit('published')} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? '保存中...' : '发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

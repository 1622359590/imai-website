'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

interface CustomerLevel {
  id: number;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
}

export default function AdminLevelsPage() {
  const [levels, setLevels] = useState<CustomerLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CustomerLevel | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSort, setFormSort] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchLevels = () => {
    setLoading(true);
    adminApi.getCustomerLevels()
      .then(res => setLevels(res.levels || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLevels(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormSort(0);
    setShowModal(true);
  };

  const openEdit = (level: CustomerLevel) => {
    setEditing(level);
    setFormName(level.name);
    setFormDesc(level.description);
    setFormSort(level.sort_order);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('请输入分类名称', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateCustomerLevel(editing.id, {
          name: formName.trim(),
          description: formDesc.trim(),
          sort_order: formSort,
        });
        showToast('更新成功', 'success');
      } else {
        await adminApi.createCustomerLevel({
          name: formName.trim(),
          description: formDesc.trim(),
          sort_order: formSort,
        });
        showToast('创建成功', 'success');
      }
      setShowModal(false);
      fetchLevels();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (level: CustomerLevel) => {
    if (!confirm(`确定删除「${level.name}」吗？\n删除后关联此分类的用户将取消分类。`)) return;
    try {
      await adminApi.deleteCustomerLevel(level.id);
      showToast('删除成功', 'success');
      fetchLevels();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-[#1e293b]">客户身份分类</h1>
            <button onClick={openCreate} className="btn btn-primary btn-sm">+ 新增分类</button>
          </div>
          <span className="text-sm text-[#64748b]">共 {levels.length} 个分类</span>
        </div>

        <div className="card">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 animate-pulse rounded bg-[#f1f5f9]" />)}
            </div>
          ) : levels.length === 0 ? (
            <div className="py-12 text-center text-[#94a3b8]">暂无分类，点击右上角新增</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-12">ID</th>
                  <th>分类名称</th>
                  <th>描述</th>
                  <th className="w-20 text-center">排序值</th>
                  <th className="w-36">创建时间</th>
                  <th className="w-28 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {levels.map(level => (
                  <tr key={level.id}>
                    <td className="text-xs font-mono text-[#94a3b8]">{level.id}</td>
                    <td><span className="font-medium">{level.name}</span></td>
                    <td className="text-sm text-[#64748b]">{level.description || '-'}</td>
                    <td className="text-center"><span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f1f5f9] text-xs font-medium text-[#64748b]">{level.sort_order}</span></td>
                    <td className="text-xs text-[#94a3b8]">{level.created_at?.split(' ')[0]}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(level)} className="text-xs text-[#8b5cf6] hover:underline">编辑</button>
                        <button onClick={() => handleDelete(level)} className="text-xs text-red-500 hover:underline">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="card w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#1e293b]">{editing ? '编辑客户分类' : '新增客户分类'}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-[#64748b] mb-1">分类名称 *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="如：黄金代理" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#64748b] mb-1">描述</label>
                <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="分类描述（可选）" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs text-[#64748b] mb-1">排序值（越小越靠前）</label>
                <input type="number" value={formSort} onChange={e => setFormSort(Number(e.target.value))} className="input text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary btn-sm justify-center">取消</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 btn btn-primary btn-sm justify-center">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

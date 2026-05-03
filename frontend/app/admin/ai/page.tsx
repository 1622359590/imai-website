'use client';

import { useState, useEffect } from 'react';
import { aiAdminApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';

interface KnowledgeItem {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const defaultCategories = ['养号技巧', '获客方法', '短视频运营', '平台规则', '产品功能', '收费相关', '常见问题'];

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchItems = () => {
    setLoading(true);
    aiAdminApi.getKnowledge()
      .then(res => setItems(res.items || []))
      .catch(() => showToast('获取知识库失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchItems(); }, []);

  // 获取所有分类
  const categories = [...new Set([...defaultCategories, ...items.map(i => i.category).filter(Boolean)])];

  // 过滤后的条目
  const filtered = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', content: '', category: '养号技巧' });
    setShowEditor(true);
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setForm({ title: item.title, content: item.content, category: item.category });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      showToast('标题和内容必填', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await aiAdminApi.updateKnowledge(editingId, form);
        showToast('已更新', 'success');
      } else {
        await aiAdminApi.createKnowledge(form);
        showToast('已添加', 'success');
      }
      setShowEditor(false);
      fetchItems();
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条知识？')) return;
    try {
      await aiAdminApi.deleteKnowledge(id);
      showToast('已删除', 'success');
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleStatus = async (item: KnowledgeItem) => {
    const newStatus = item.status === 'active' ? 'hidden' : 'active';
    try {
      await aiAdminApi.updateKnowledge(item.id, { status: newStatus });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      showToast(newStatus === 'active' ? '已启用' : '已隐藏', 'success');
    } catch {}
  };

  // 快速导入预置知识
  const handleQuickImport = async () => {
    setImporting(true);
    const presetKnowledge = [
      { title: '抖音养号基本流程', content: '1. 注册后先不发内容，先刷3-5天视频\n2. 每天活跃30分钟以上，点赞、评论、关注同行\n3. 完善个人资料：头像、昵称、简介要垂直\n4. 第6天开始发内容，每天1-2条\n5. 发布后积极回复评论，增加互动率', category: '养号技巧' },
      { title: '抖音流量池机制', content: '抖音采用层级递进的流量池机制：\n- 初始池：200-500播放量\n- 若完播率>30%、点赞率>3%，进入下一级\n- 第二级：1000-5000播放\n- 第三级：1万-10万播放\n- 爆款池：100万+播放\n\n关键指标：完播率 > 点赞率 > 评论率 > 转发率', category: '短视频运营' },
      { title: '小红书账号定位方法', content: '三步定位法：\n1. 找到你擅长的领域（技能/经验/兴趣）\n2. 分析目标用户画像（年龄/需求/痛点）\n3. 确定内容形式（图文/视频/混剪）\n\n关键：账号垂直度越高，推荐越精准', category: '短视频运营' },
      { title: '获客系统使用指南', content: 'imai.work AI 获客系统核心功能：\n1. 智能客服：24小时自动回复客户咨询\n2. 工单管理：客户问题统一收集处理\n3. 知识库：AI 基于专业知识自动回答\n4. 数据分析：客户行为追踪和分析\n\n使用流程：注册 → 配置AI → 导入知识 → 接入渠道', category: '产品功能' },
      { title: '微信养号防封攻略', content: '新号养号要点：\n1. 注册后绑定手机号，实名认证\n2. 每天正常聊天、刷朋友圈\n3. 不要频繁加人（每天不超过5人）\n4. 不发广告、不群发\n5. 养号15天后再开始正常使用\n6. 避免使用多开、模拟器', category: '养号技巧' },
    ];
    try {
      for (const item of presetKnowledge) {
        await aiAdminApi.createKnowledge(item);
      }
      showToast(`已导入 ${presetKnowledge.length} 条知识`, 'success');
      fetchItems();
    } catch (err: any) {
      showToast('导入失败: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1e293b]">AI 知识库</h1>
          <p className="text-xs text-[#94a3b8]">管理 AI 客服的专业知识，AI 回答时会自动参考</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button onClick={handleQuickImport} disabled={importing} className="btn btn-secondary btn-sm">
              {importing ? '导入中...' : '📥 导入预置知识'}
            </button>
          )}
          <button onClick={openCreate} className="btn btn-primary btn-sm">+ 添加知识</button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-4 h-4 text-[#94a3b8] group-focus-within:text-[#8b5cf6] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索标题/内容"
            className="pl-9 pr-4 py-2 w-44 text-sm bg-white border border-[#e2e8f0] rounded-full outline-none focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20 transition-all placeholder:text-[#94a3b8]"
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className={`appearance-none pl-3 pr-7 py-2 text-sm border rounded-full bg-white outline-none transition-all cursor-pointer ${filterCategory ? 'border-[#8b5cf6] text-[#8b5cf6] bg-[#f5f3ff]' : 'border-[#e2e8f0] text-[#64748b]'}`}
          >
            <option value="">全部分类</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg className="w-3.5 h-3.5 text-[#94a3b8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <span className="text-sm text-[#94a3b8]">{filtered.length} / {items.length}</span>
      </div>

      {/* 知识列表 */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-[#f1f5f9]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-[#cbd5e1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
            <p className="mt-3 text-sm text-[#94a3b8]">知识库为空</p>
            <p className="mt-1 text-xs text-[#94a3b8]">添加知识后，AI 回答时会自动参考这些内容</p>
            <button onClick={handleQuickImport} disabled={importing} className="btn btn-primary btn-sm mt-4">
              {importing ? '导入中...' : '📥 导入预置知识（5条）'}
            </button>
          </div>
        ) : (
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr>
                <th className="w-12">ID</th>
                <th>标题</th>
                <th>分类</th>
                <th>内容预览</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="group">
                  <td className="text-xs font-mono text-[#94a3b8]">{item.id}</td>
                  <td className="font-medium text-[#1e293b] max-w-[200px] truncate">{item.title}</td>
                  <td><span className="tag">{item.category || '未分类'}</span></td>
                  <td className="text-xs text-[#64748b] max-w-[300px] truncate">{item.content.slice(0, 80)}</td>
                  <td>
                    <button onClick={() => handleToggleStatus(item)} className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.status === 'active' ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#f1f5f9] text-[#94a3b8]'}`}>
                      {item.status === 'active' ? '启用' : '隐藏'}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="rounded px-2 py-1 text-xs text-[#64748b] hover:bg-[#f1f5f9]">编辑</button>
                      <button onClick={() => handleDelete(item.id)} className="rounded px-2 py-1 text-xs text-[#ef4444] hover:bg-[#fef2f2]">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 编辑器弹窗 */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEditor(false)}>
          <div className="card w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#1e293b]">{editingId ? '编辑知识' : '添加知识'}</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1e293b]">标题</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="例如：抖音养号基本流程" className="input" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1e293b]">分类</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, category: c }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${form.category === c ? 'border-[#8b5cf6] bg-[#f5f3ff] text-[#8b5cf6]' : 'border-[#e2e8f0] text-[#64748b]'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="或自定义分类" className="input mt-2" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#1e293b]">内容</label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="输入知识内容，支持分步骤、分点描述..." className="input" rows={10} />
                <p className="mt-1 text-xs text-[#94a3b8]">内容越详细，AI 回答越准确</p>
              </div>
            </div>
            <div className="flex gap-2 pt-5">
              <button onClick={() => setShowEditor(false)} className="flex-1 btn btn-secondary btn-sm justify-center">取消</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn btn-primary btn-sm justify-center">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

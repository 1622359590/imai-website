'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { aiApi, authApi } from '@/lib/api';
import { showToast } from '@/components/ui/Toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// URL 自动检测：纯文本 URL 转为可点击链接
const URL_RE = /(https?:\/\/[^\s<>\])"]+)/g;
function autoLink(text: string) {
  return text.replace(URL_RE, '[$1]($1)');
}

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  image_url?: string;
  rating?: number;
  created_at?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [started, setStarted] = useState(false); // 是否已开始对话
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 是否已登录
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollRef = useRef(false);
  const isAtBottomRef = useRef(true); // 用户是否在底部

  // 检查登录状态
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('imai-token'));
  }, []);

  // 监听用户滚动，判断是否在底部
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 80; // 距底部 80px 内算“在底部”
      isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [started]);

  // 消息变化时自动滚动（仅在用户已在底部时）
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el || !started || !isAtBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    const t1 = setTimeout(() => { if (isAtBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, 100);
    const t2 = setTimeout(() => { if (isAtBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [messages, started]);

  // 快捷问题
  const quickQuestions = [
    { icon: '🚀', text: 'AI获客怎么配置？' },
    { icon: '🎵', text: '抖音养号有什么技巧？' },
    { icon: '📱', text: '设备绑定失败怎么办？' },
    { icon: '⏰', text: '24小时任务怎么启动？' },
    { icon: '💡', text: '快手和抖音有什么区别？' },
    { icon: '📕', text: '小红书怎么涨粉？' },
  ];

  // 上传图片
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const token = localStorage.getItem('imai-token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/file', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok) { setImageUrl(data.url); showToast('图片已上传', 'success'); }
      else showToast(data.error || '上传失败', 'error');
    } catch { showToast('上传失败', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const token = localStorage.getItem('imai-token');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload/file', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok) { setImageUrl(data.url); showToast('图片已上传', 'success'); }
      else showToast(data.error || '上传失败', 'error');
    } catch { showToast('上传失败', 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  // 发送消息
  const handleSend = async (textOverride?: string) => {
    const text = (textOverride || input).trim();
    if (!text && !imageUrl) return;
    if (sending) return;

    if (!started) setStarted(true);

    // 懒创建对话
    let convId = conversationId;
    if (!convId) {
      const token = localStorage.getItem('imai-token');
      if (!token) {
        showToast('请先登录后再提问', 'error');
        router.push('/login');
        return;
      }
      try {
        let guestName = '';
        try { const me = await authApi.getMe(); guestName = me.user?.nickname || me.user?.phone || ''; } catch {}
        const res = await aiApi.createConversation(guestName);
        convId = res.conversation.id;
        setConversationId(convId);
      } catch (err: any) {
        showToast('创建对话失败: ' + err.message, 'error');
        return;
      }
    }

    const userMsg: Message = { role: 'user', content: text, image_url: imageUrl };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImageUrl('');
    setSending(true);
    isAtBottomRef.current = true; // 用户发消息时强制滚到底部
    setTimeout(() => chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' }), 50);

    try {
      const res = await aiApi.sendMessage(convId!, text, imageUrl);
      shouldScrollRef.current = true;

      setMessages(prev => [...prev, { id: res.message_id, role: 'assistant', content: '' }]);
      const fullText = res.reply;
      let current = 0;
      const chunkSize = 3;
      const typeInterval = setInterval(() => {
        current = Math.min(current + chunkSize, fullText.length);
        setMessages(prev => prev.map((msg, i) =>
          i === prev.length - 1 && msg.role === 'assistant' ? { ...msg, content: fullText.slice(0, current) } : msg
        ));
        // 打字后自动滚动（仅在用户已在底部时）
        requestAnimationFrame(() => {
          const el = chatContainerRef.current;
          if (el && isAtBottomRef.current) el.scrollTop = el.scrollHeight;
        });
        if (current >= fullText.length) {
          clearInterval(typeInterval);
          setSending(false);
          inputRef.current?.focus();
        }
      }, 30);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ 抱歉，AI 回复失败：' + (err.message || '未知错误') + '\n\n你可以稍后重试，或直接提交人工工单。',
      }]);
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // 评分
  const handleRate = async (messageIndex: number, messageId: number, rating: number) => {
    try {
      await aiApi.rateMessage(messageId, rating);
      setMessages(prev => prev.map((msg, i) => i === messageIndex ? { ...msg, rating } : msg));
      showToast(rating === 1 ? '感谢你的反馈！' : '已记录，会持续改进', 'success');
    } catch {}
  };

  // 转人工
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try { const res = await aiApi.getConversations(); setHistoryList(res.conversations || []); } catch {}
    setLoadingHistory(false);
  };

  const switchConversation = async (convId: number) => {
    setShowHistory(false);
    setConversationId(convId);
    setStarted(true);
    try { const res = await aiApi.getMessages(convId); setMessages(res.messages || []); shouldScrollRef.current = true; } catch { showToast('加载对话失败', 'error'); }
  };
  const [transferTitle, setTransferTitle] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const openTransferModal = () => {
    if (!conversationId) { showToast('请先发送一条消息', 'error'); return; }
    const token = localStorage.getItem('imai-token');
    if (!token) { showToast('请先登录后再转人工', 'error'); router.push('/login'); return; }
    const userMsgs = messages.filter(m => m.role === 'user');
    setTransferTitle(userMsgs[0]?.content?.slice(0, 50) || '需要人工协助');
    setShowTransferModal(true);
  };

  const handleTransferConfirm = async () => {
    if (!conversationId || !transferTitle.trim()) return;
    setTransferLoading(true);
    try {
      const res = await aiApi.transferToHuman(conversationId, { title: transferTitle.trim() });
      showToast('已转人工客服', 'success');
      setShowTransferModal(false);
      router.push(`/ticket/${res.ticket.id}`);
    } catch (err: any) { showToast(err.message || '转人工失败', 'error'); }
    finally { setTransferLoading(false); }
  };

  // 新对话
  const handleNewConversation = async () => {
    if (conversationId) { try { await aiApi.endConversation(conversationId); } catch {} }
    setConversationId(null);
    setMessages([]);
    setStarted(false);
    inputRef.current?.focus();
  };

  return (
    <>
      <Header />
      <main className="flex flex-col bg-gradient-to-b from-[#f8fafc] to-white" style={{ height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        {/* 未开始对话：欢迎界面 */}
        {!started && (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-4 sm:pt-8">
            {/* Logo + 标题 */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white shadow-xl shadow-[#8b5cf6]/30 relative overflow-hidden">
                {/* 背景光晕 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_60%)]" />
                {/* AI 对话图标 */}
                <svg className="w-8 h-8 relative z-10" viewBox="0 0 32 32" fill="none">
                  {/* 外圈光晕 */}
                  <circle cx="16" cy="16" r="14" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                  {/* 对话气泡 */}
                  <path d="M8 10a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-4l-3 3-3-3h-2a2 2 0 01-2-2V10z" fill="rgba(255,255,255,0.9)"/>
                  {/* AI 电路节点 */}
                  <circle cx="12.5" cy="14" r="1.2" fill="#8b5cf6"/>
                  <circle cx="19.5" cy="14" r="1.2" fill="#8b5cf6"/>
                  <circle cx="16" cy="14" r="1.2" fill="#6d28d9"/>
                  {/* 连接线 */}
                  <line x1="13.7" y1="14" x2="14.8" y2="14" stroke="#8b5cf6" strokeWidth="0.8"/>
                  <line x1="17.2" y1="14" x2="18.3" y2="14" stroke="#8b5cf6" strokeWidth="0.8"/>
                  {/* 底部信号波 */}
                  <path d="M13 17.5h6" stroke="#8b5cf6" strokeWidth="0.8" strokeLinecap="round"/>
                  <path d="M14.5 19h3" stroke="#8b5cf6" strokeWidth="0.6" strokeLinecap="round" opacity="0.5"/>
                  {/* 顶部信号发射 */}
                  <path d="M14 7.5c0-1 .7-2 2-2s2 1 2 2" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" strokeLinecap="round"/>
                  <circle cx="16" cy="4.5" r="0.6" fill="rgba(255,255,255,0.8)"/>
                </svg>
                {/* 脉冲动画点 */}
                <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#10b981] shadow-sm shadow-[#10b981]/50 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-[#1e293b]">
                  imai<span className="text-[#8b5cf6]">小助手</span>
                </h1>
                <p className="text-sm text-[#94a3b8]">有问题直接问我，7×24 在线 ✨</p>
              </div>
            </div>

            {/* 快捷问题卡片 */}
            <div className="mb-6 w-full max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-[#94a3b8]">试试问一下</span>
                <button
                  onClick={() => { setShowHistory(true); loadHistory(); }}
                  className="flex items-center gap-1 text-xs text-[#94a3b8] hover:text-[#8b5cf6] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  历史对话
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (!isLoggedIn) { showToast('请先登录后再提问', 'error'); router.push('/login'); return; }
                      setStarted(true); handleSend(q.text);
                    }}
                    className="group flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-3 text-left text-sm text-[#475569] transition-all hover:border-[#8b5cf6]/40 hover:bg-[#f5f3ff] hover:text-[#8b5cf6] hover:shadow-sm"
                  >
                    <span className="text-base">{q.icon}</span>
                    <span className="line-clamp-1">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 输入框 / 登录提示 */}
            {!isLoggedIn ? (
              <div className="w-full max-w-2xl">
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 text-center shadow-sm">
                  <svg className="mx-auto w-10 h-10 text-[#cbd5e1] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  <p className="text-sm font-medium text-[#1e293b]">登录后即可提问</p>
                  <p className="mt-1 text-xs text-[#94a3b8]">imai小助手 7×24 在线，随时为你解答</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Link href="/login" className="btn btn-primary btn-sm">登录</Link>
                    <Link href="/register" className="btn btn-secondary btn-sm">注册</Link>
                  </div>
                </div>
              </div>
            ) : (
            <div className="w-full max-w-2xl">
              <div
                className={`rounded-2xl border bg-white shadow-lg shadow-black/[0.03] transition-all focus-within:border-[#8b5cf6]/50 focus-within:shadow-[#8b5cf6]/[0.08] focus-within:shadow-lg ${dragOver ? 'border-[#8b5cf6] bg-[#f5f3ff]' : 'border-[#e2e8f0]'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) uploadFile(f); }}
              >
                {imageUrl && (
                  <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-4 py-2">
                    <img src={imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    <span className="flex-1 text-xs text-[#8b5cf6]">图片已上传，发送后 AI 会分析</span>
                    <button onClick={() => setImageUrl('')} className="p-1 text-[#94a3b8] hover:text-[#ef4444]">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 px-3 py-2.5">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex-shrink-0 rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#8b5cf6] transition-colors" title="上传图片">
                    {uploading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="30 70"/></svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    )}
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(); } }}
                    placeholder="输入你的问题，比如：抖音怎么养号？"
                    className="flex-1 resize-none bg-transparent text-sm text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
                    rows={1}
                    style={{ minHeight: '28px', maxHeight: '100px' }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={sending || (!input.trim() && !imageUrl)}
                    className="flex-shrink-0 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] p-2 text-white shadow-md shadow-[#8b5cf6]/20 transition-all hover:shadow-lg hover:shadow-[#8b5cf6]/30 disabled:opacity-40 disabled:shadow-none"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-[#94a3b8]">
                AI 回答仅供参考 · 解决不了可以<a href="/ticket" className="text-[#8b5cf6] hover:underline">提交工单</a>或在对话中说「转人工」
              </p>
            </div>
            )}

            {/* 底部导航 */}
            <div className="mt-8 flex items-center gap-5 text-xs text-[#94a3b8]">
              <Link href="/tutorials" className="flex items-center gap-1.5 hover:text-[#8b5cf6] transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                教程
              </Link>
              <Link href="/faq" className="flex items-center gap-1.5 hover:text-[#8b5cf6] transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                常见问题
              </Link>
              <Link href="/ticket" className="flex items-center gap-1.5 hover:text-[#8b5cf6] transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                提交工单
              </Link>
            </div>
          </div>
        )}

        {/* 已开始对话：聊天界面 */}
        {started && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-3 pb-0" style={{ minHeight: 0 }}>
            {/* 顶部操作栏 */}
            <div className="mb-2 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_60%)]" />
                  <svg className="w-4 h-4 relative z-10" viewBox="0 0 32 32" fill="none">
                    <path d="M8 10a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-4l-3 3-3-3h-2a2 2 0 01-2-2V10z" fill="rgba(255,255,255,0.9)"/>
                    <circle cx="12.5" cy="14" r="1.2" fill="#8b5cf6"/>
                    <circle cx="19.5" cy="14" r="1.2" fill="#8b5cf6"/>
                    <circle cx="16" cy="14" r="1.2" fill="#6d28d9"/>
                    <line x1="13.7" y1="14" x2="14.8" y2="14" stroke="#8b5cf6" strokeWidth="0.8"/>
                    <line x1="17.2" y1="14" x2="18.3" y2="14" stroke="#8b5cf6" strokeWidth="0.8"/>
                    <path d="M13 17.5h6" stroke="#8b5cf6" strokeWidth="0.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#1e293b]">imai小助手</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setShowHistory(true); loadHistory(); }}
                  className="rounded-full border border-[#e2e8f0] p-1.5 text-[#94a3b8] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-all" title="历史对话">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </button>
                <button onClick={openTransferModal}
                  className="flex items-center gap-1 rounded-full border border-[#8b5cf6]/40 px-2.5 py-1 text-xs font-medium text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white transition-all">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  转人工
                </button>
                <button onClick={handleNewConversation}
                  className="rounded-full border border-[#e2e8f0] p-1.5 text-[#94a3b8] hover:border-[#8b5cf6] hover:text-[#8b5cf6] transition-all" title="新对话">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>

            {/* 消息列表 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pb-2" style={{ minHeight: 0 }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%]`}>
                    {msg.image_url && (
                      <div className="mb-1"><img src={msg.image_url} alt="" className="max-w-[180px] rounded-xl border border-[#e2e8f0]" /></div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] text-white rounded-br-sm shadow-sm shadow-[#8b5cf6]/15'
                        : 'bg-white border border-[#e2e8f0] text-[#1e293b] rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="chat-markdown"><ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#8b5cf6] font-medium hover:text-[#7c3aed] underline decoration-[#8b5cf6]/30 hover:decoration-[#8b5cf6] bg-[#8b5cf6]/5 px-1 py-0.5 rounded transition-colors">
                                {props.children}
                                <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                            ),
                          }}
                        >{autoLink(msg.content)}</ReactMarkdown></div>
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.id && (
                      <div className="mt-0.5 flex items-center gap-0.5">
                        <button onClick={() => handleRate(i, msg.id!, msg.rating === 1 ? 0 : 1)}
                          className={`rounded p-0.5 transition-colors ${msg.rating === 1 ? 'text-[#10b981]' : 'text-[#e2e8f0] hover:text-[#10b981]'}`} title="有帮助">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={msg.rating === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                        </button>
                        <button onClick={() => handleRate(i, msg.id!, msg.rating === -1 ? 0 : -1)}
                          className={`rounded p-0.5 transition-colors ${msg.rating === -1 ? 'text-[#ef4444]' : 'text-[#e2e8f0] hover:text-[#ef4444]'}`} title="没帮助">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={msg.rating === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-[#e2e8f0] bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b5cf6]" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b5cf6]" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b5cf6]" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 输入区域（固定底部） */}
            <div className={`shrink-0 mb-4 mt-1 rounded-xl border bg-white shadow-sm transition-all ${dragOver ? 'border-[#8b5cf6] bg-[#f5f3ff]' : 'border-[#e2e8f0]'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) uploadFile(f); }}
            >
              {imageUrl && (
                <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-3 py-1.5">
                  <img src={imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  <span className="flex-1 text-[11px] text-[#8b5cf6]">图片已上传</span>
                  <button onClick={() => setImageUrl('')} className="p-0.5 text-[#94a3b8] hover:text-[#ef4444]">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}
              <div className="flex items-end gap-1.5 px-2.5 py-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex-shrink-0 rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#8b5cf6] transition-colors">
                  {uploading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="30 70"/></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  )}
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(); } }}
                  placeholder="继续对话..."
                  className="flex-1 resize-none bg-transparent text-sm text-[#1e293b] outline-none placeholder:text-[#94a3b8]"
                  rows={1}
                  style={{ minHeight: '28px', maxHeight: '100px' }}
                />
                <button onClick={() => handleSend()} disabled={sending || (!input.trim() && !imageUrl)}
                  className="flex-shrink-0 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#a855f7] p-1.5 text-white shadow-sm shadow-[#8b5cf6]/20 disabled:opacity-40 transition-all">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-[#94a3b8]">AI 回答仅供参考 · 说「转人工」可接入真人客服</p>
          </div>
        )}
      </main>

      {/* 历史对话面板 */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="card w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-[#1e293b]">历史对话</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowHistory(false); setStarted(true); }} className="text-xs text-[#8b5cf6] hover:underline">+ 新对话</button>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-[#f1f5f9] text-[#94a3b8]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto -mx-1">
              {loadingHistory ? (
                <div className="p-4 text-center text-sm text-[#94a3b8]">加载中...</div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-10 h-10 mx-auto text-[#e2e8f0] mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <p className="text-sm text-[#94a3b8]">暂无历史对话</p>
                  <p className="text-xs text-[#cbd5e1] mt-1">发一条消息开始吧</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {historyList.map(conv => (
                    <button key={conv.id}
                      onClick={() => switchConversation(conv.id)}
                      className={`w-full px-3 py-2.5 text-left rounded-lg transition-colors ${conversationId === conv.id ? 'bg-[#f5f3ff]' : 'hover:bg-[#f8fafc]'}`}>
                      <p className="text-sm text-[#1e293b] truncate">{conv.first_message || `对话 #${conv.id}`}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[#94a3b8]">
                        <span>{conv.message_count} 条消息</span>
                        <span>·</span>
                        <span>{conv.updated_at?.split(' ')[0]}</span>
                        {conv.status === 'transferred' && (
                          <span className="ml-auto text-[#d97706]">已转人工</span>
                        )}
                        {conv.status === 'closed' && (
                          <span className="ml-auto text-[#94a3b8]">已结束</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 转人工弹窗 */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTransferModal(false)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-[#1e293b]">转人工客服</h3>
            <p className="mt-1 text-sm text-[#64748b]">确认后将为你创建工单，工程师会尽快处理</p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-[#1e293b]">工单标题</label>
              <input value={transferTitle} onChange={e => setTransferTitle(e.target.value)} className="input" placeholder="描述你的问题" />
            </div>
            <div className="mt-3 rounded-lg border border-[#e2e8f0] p-3 max-h-28 overflow-y-auto">
              <p className="text-xs font-medium text-[#64748b] mb-1.5">对话记录将一同提交</p>
              {messages.filter(m => m.content).slice(-4).map((msg, i) => (
                <p key={i} className="text-xs text-[#64748b] truncate">
                  <span className={msg.role === 'user' ? 'text-[#8b5cf6]' : 'text-[#10b981]'}>{msg.role === 'user' ? '你' : 'AI'}：</span>
                  {msg.content.slice(0, 60)}{msg.content.length > 60 ? '...' : ''}
                </p>
              ))}
            </div>
            <div className="flex gap-2 pt-4">
              <button onClick={() => setShowTransferModal(false)} className="flex-1 btn btn-secondary btn-sm justify-center">取消</button>
              <button onClick={handleTransferConfirm} disabled={transferLoading || !transferTitle.trim()} className="flex-1 btn btn-primary btn-sm justify-center">
                {transferLoading ? '提交中...' : '确认转人工'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

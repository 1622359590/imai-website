'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { tutorialApi } from '@/lib/api';

interface Tutorial {
  id: number;
  title: string;
  category: string;
  content: string;
  summary: string;
  cover: string;
  tags: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export default function TutorialDetailPage() {
  const params = useParams();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    tutorialApi.getDetail(params.id as string).then((res) => {
      setTutorial(res.tutorial);
    }).catch(console.error).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-20 rounded bg-[#1e293b]" />
              <div className="h-10 w-3/4 rounded bg-[#1e293b]" />
              <div className="h-4 w-40 rounded bg-[#1e293b]" />
              <div className="mt-8 space-y-3">
                {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-4 w-full rounded bg-[#1e293b]" />)}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!tutorial) {
    return (
      <>
        <Header />
        <main className="min-h-screen">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
            <h1 className="text-2xl font-bold">教程不存在</h1>
            <Link href="/tutorials" className="btn btn-primary mt-6">返回教程列表</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          {/* 面包屑 */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-[#475569]">
            <Link href="/" className="hover:text-[#00d4ff]">首页</Link>
            <span>/</span>
            <Link href="/tutorials" className="hover:text-[#00d4ff]">教程</Link>
            <span>/</span>
            <span className="text-[#94a3b8]">{tutorial.title}</span>
          </nav>

          {/* 分类 */}
          <div className="mb-4 flex items-center gap-2">
            <span className="tag">{tutorial.category}</span>
            {tutorial.tags && JSON.parse(tutorial.tags || '[]').slice(0, 3).map((tag: string) => (
              <span key={tag} className="tag" style={{ opacity: 0.6 }}>{tag}</span>
            ))}
          </div>

          {/* 标题 */}
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{tutorial.title}</h1>

          {/* 元信息 */}
          <div className="mt-3 flex items-center gap-4 text-sm text-[#475569]">
            <span>👁 {tutorial.views} 阅读</span>
            <span>📅 {tutorial.created_at?.split(' ')[0]}</span>
          </div>

          {/* 封面图 */}
          {tutorial.cover && (
            <div className="mt-8 overflow-hidden rounded-xl">
              <img src={tutorial.cover} alt={tutorial.title} className="w-full object-cover" />
            </div>
          )}

          {/* 正文 */}
          <div className="markdown-body mt-10">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {tutorial.content}
            </ReactMarkdown>
          </div>

          {/* 底部 CTA */}
          <div className="mt-16 rounded-xl border border-[#e2e8f0] bg-white p-8 text-center">
            <h3 className="text-lg font-semibold">还没解决你的问题？</h3>
            <p className="mt-1 text-sm text-[#94a3b8]">提交工单，我们的技术支持团队会尽快为你解答</p>
            <Link href="/login" className="btn btn-primary mt-4">
              提交工单
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

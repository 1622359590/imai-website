'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { tutorialApi, faqApi } from '@/lib/api';

interface Tutorial {
  id: number;
  title: string;
  category: string;
  summary: string;
  cover: string;
  tags: string;
  views: number;
  status: string;
  created_at: string;
}

interface Faq {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const categories = [
  { key: '抖音', label: '抖音', color: '#ff4444' },
  { key: '快手', label: '快手', color: '#ff6b35' },
  { key: '小红书', label: '小红书', color: '#ff2442' },
  { key: '微信', label: '微信', color: '#07c160' },
  { key: '其他', label: '其他', color: '#0099bb' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      tutorialApi.getList({}),
      faqApi.getList({}),
    ]).then(([tutorialRes, faqRes]) => {
      setTutorials((tutorialRes.tutorials || []).slice(0, 6));
      setFaqs((faqRes.faqs || []).slice(0, 6));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tutorials?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#f0fdff] via-white to-[#f0f4ff] py-20 sm:py-28">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">
                imai.work
              </span>
            </h1>
            <p className="mt-4 text-lg text-[#64748b] sm:text-xl">
              未来将是无人工
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索教程..."
                className="input flex-1"
              />
              <button type="submit" className="btn btn-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索
              </button>
            </form>
          </div>
        </section>

        {/* Category Cards */}
        <section className="border-b border-[#e2e8f0] bg-white py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-center text-2xl font-bold text-[#1e293b]">快捷分类</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {categories.map((cat) => (
                <Link
                  key={cat.key}
                  href={`/tutorials?category=${encodeURIComponent(cat.key)}`}
                  className="card group flex cursor-pointer flex-col items-center gap-3 py-8 text-center"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-2xl transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                  >
                    {cat.key === '抖音' && '🎵'}
                    {cat.key === '快手' && '📱'}
                    {cat.key === '小红书' && '📕'}
                    {cat.key === '微信' && '💬'}
                    {cat.key === '其他' && '🔧'}
                  </div>
                  <span className="text-sm font-medium text-[#64748b] group-hover:text-[#00d4ff] transition-colors">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Tutorials */}
        <section className="border-b border-[#e2e8f0] bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1e293b]">最新教程</h2>
              <Link href="/tutorials" className="text-sm text-[#00d4ff] hover:underline">
                查看全部 &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-4 w-16 rounded bg-[#f1f5f9]" />
                    <div className="mt-3 h-5 w-3/4 rounded bg-[#f1f5f9]" />
                    <div className="mt-2 h-4 w-full rounded bg-[#f1f5f9]" />
                    <div className="mt-2 h-4 w-2/3 rounded bg-[#f1f5f9]" />
                    <div className="mt-4 flex gap-4">
                      <div className="h-3 w-16 rounded bg-[#f1f5f9]" />
                      <div className="h-3 w-16 rounded bg-[#f1f5f9]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tutorials.length === 0 ? (
              <div className="py-12 text-center text-[#94a3b8]">暂无教程，敬请期待</div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {tutorials.map((tutorial) => (
                  <Link
                    key={tutorial.id}
                    href={`/tutorials/${tutorial.id}`}
                    className="card group"
                  >
                    {tutorial.cover && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={tutorial.cover}
                          alt={tutorial.title}
                          className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="mb-2 flex items-center gap-2">
                      <span className="tag">{tutorial.category}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#1e293b] group-hover:text-[#00d4ff] transition-colors line-clamp-2">
                      {tutorial.title}
                    </h3>
                    {tutorial.summary && (
                      <p className="mt-1 text-sm text-[#64748b] line-clamp-2">{tutorial.summary}</p>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-[#94a3b8]">
                      <span>👁 {tutorial.views}</span>
                      <span>{tutorial.created_at?.split(' ')[0]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#1e293b]">常见问题</h2>
              <Link href="/faq" className="text-sm text-[#00d4ff] hover:underline">
                查看全部 &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="h-5 w-3/4 rounded bg-[#f1f5f9]" />
                  </div>
                ))}
              </div>
            ) : faqs.length === 0 ? (
              <div className="py-12 text-center text-[#94a3b8]">暂无常见问题</div>
            ) : (
              <div className="space-y-3">
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="card cursor-pointer"
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-[#1e293b]">{faq.question}</h3>
                      <svg
                        className={`h-4 w-4 text-[#94a3b8] transition-transform duration-200 ${
                          activeFaq === faq.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div
                      className={`accordion-content ${
                        activeFaq === faq.id ? 'open' : ''
                      } ${activeFaq === faq.id ? 'mt-3 pt-3 border-t border-[#e2e8f0]' : ''}`}
                    >
                      <p className="text-sm leading-relaxed text-[#64748b]">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-[#e2e8f0] bg-gradient-to-br from-[#f0fdff] to-white py-20 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-bold text-[#1e293b]">遇到问题？我们帮你解决</h2>
            <p className="mt-2 text-[#64748b]">
              提交工单，我们的技术支持团队会尽快与你联系
            </p>
            <Link href="/login" className="btn btn-primary mt-6">
              提交工单
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { tutorialApi } from '@/lib/api';

const categories = ['全部', '抖音', '快手', '小红书', '微信', '其他'];

interface Tutorial {
  id: number;
  title: string;
  category: string;
  summary: string;
  cover: string;
  tags: string;
  views: number;
  created_at: string;
}

function TutorialsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '全部');

  useEffect(() => {
    setLoading(true);
    const params: { category?: string; search?: string } = {};
    if (activeCategory !== '全部') params.category = activeCategory;
    if (search) params.search = search;

    tutorialApi.getList(params).then((res) => {
      setTutorials(res.tutorials || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [activeCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/tutorials?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
      <main className="min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold">教程中心</h1>
            <p className="mt-2 text-[#94a3b8]">抖音、快手、小红书、微信运营技巧全攻略</p>
          </div>

          <form onSubmit={handleSearch} className="mx-auto mb-8 flex max-w-xl gap-2">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索教程..." className="input flex-1" />
            <button type="submit" className="btn btn-primary">搜索</button>
          </form>

          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setSearch(''); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-[#00d4ff] text-white'
                    : 'bg-white text-[#94a3b8] border border-[#e2e8f0] hover:border-[#00d4ff]'
                }`}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 w-16 rounded bg-[#1e293b]" />
                  <div className="mt-3 h-5 w-3/4 rounded bg-[#1e293b]" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-[#1e293b]" />
                </div>
              ))}
            </div>
          ) : tutorials.length === 0 ? (
            <div className="py-20 text-center text-[#475569]">暂无教程，敬请期待</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tutorials.map((tutorial, i) => (
                <Link key={tutorial.id} href={`/tutorials/${tutorial.id}`} className="card group">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="tag">{tutorial.category}</span>
                    {JSON.parse(tutorial.tags || '[]').slice(0, 2).map((tag: string) => (
                      <span key={tag} className="tag" style={{ opacity: 0.6 }}>{tag}</span>
                    ))}
                  </div>
                  <h3 className="text-base font-semibold text-[#1e293b] group-hover:text-[#00d4ff] transition-colors line-clamp-2">
                    {tutorial.title}
                  </h3>
                  {tutorial.summary && (
                    <p className="mt-1 text-sm text-[#94a3b8] line-clamp-2">{tutorial.summary}</p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-[#475569]">
                    <span>👁 {tutorial.views} 阅读</span>
                    <span>{tutorial.created_at?.split(' ')[0]}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function TutorialsPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <main className="min-h-screen">
          <div className="mx-auto max-w-7xl px-4 py-12">
            <div className="animate-pulse space-y-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 rounded bg-[#1e293b]" />)}
            </div>
          </div>
        </main>
      }>
        <TutorialsContent />
      </Suspense>
    </>
  );
}

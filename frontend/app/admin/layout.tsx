'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/layout/AdminSidebar';
import ToastContainer from '@/components/ui/Toast';
import { authApi } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ nickname: string; phone: string } | null>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('imai-token');
    if (!token) {
      router.push('/login');
      return;
    }
    authApi.getMe().then((res) => {
      if (res.user.role !== 'admin') {
        router.push('/');
        return;
      }
      setUser(res.user);
      setAuthed(true);
    }).catch(() => {
      localStorage.removeItem('imai-token');
      router.push('/login');
    }).finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#00d4ff] border-t-transparent" />
          <p className="mt-3 text-sm text-[#94a3b8]">验证身份...</p>
        </div>
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="admin-content flex-1">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#e2e8f0] bg-white px-6">
          <h1 className="text-lg font-semibold text-[#1e293b]">后台管理</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#64748b]">{user?.nickname || user?.phone}</span>
            <button
              onClick={() => { localStorage.removeItem('imai-token'); router.push('/'); }}
              className="rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
            >
              退出
            </button>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}

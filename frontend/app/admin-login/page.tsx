'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('请输入管理员账号和密码'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登录失败');
      localStorage.setItem('imai-admin-token', data.token);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f5f3ff] via-white to-[#ede9fe]">
      
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] text-white text-xl font-bold shadow-lg shadow-[#8b5cf6]/20">
            A
          </div>
          <h1 className="mt-4 text-xl font-bold text-[#1e293b]">后台管理</h1>
          <p className="mt-1 text-sm text-[#64748b]">管理员专用入口</p>
        </div>

        <form onSubmit={handleLogin} className="card space-y-4 !p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748b]">管理员账号</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="输入管理员用户名" className="input" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748b]">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="输入密码" className="input" />
          </div>
          {error && (
            <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-3 text-sm text-[#ef4444]">{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center py-2.5">
            {loading ? '验证中...' : '进入后台'}
          </button>
          <div className="text-center text-xs text-[#94a3b8]">
            <a href="/" className="hover:text-[#8b5cf6]">← 返回前台</a>
          </div>
        </form>
      </div>
    </div>
  );
}

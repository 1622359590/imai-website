'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (val: string) => {
    if (val && !/^1\d{10}$/.test(val)) {
      setPhoneError('手机号格式不正确');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePhone(phone)) return;
    if (!phone || !password) { setError('请填写手机号和密码'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    if (password !== confirmPassword) { setError('两次密码不一致'); return; }

    setLoading(true);
    try {
      const res = await authApi.register(phone, password, nickname || undefined);
      localStorage.setItem('imai-token', res.token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <div className="card border-[#cbd5e1]">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">注册</h1>
              <p className="mt-1 text-sm text-[#94a3b8]">创建你的账号</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#94a3b8]">手机号 *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  onBlur={() => validatePhone(phone)}
                  placeholder="请输入手机号"
                  className={`input ${phoneError ? '!border-[#ef4444]' : ''}`}
                  maxLength={11}
                />
                {phoneError && <p className="mt-1 text-xs text-[#ef4444]">{phoneError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#94a3b8]">昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="给自己取个名字"
                  className="input"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#94a3b8]">密码 *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少6位密码"
                  className="input"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#94a3b8]">确认密码 *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="input"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] p-3 text-sm text-[#ef4444]">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center text-base py-3">
                {loading ? '注册中...' : '注册'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#475569]">
              已有账号？
              <Link href="/login" className="ml-1 text-[#8b5cf6] hover:underline">去登录</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

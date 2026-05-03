'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import VIPBadge from '@/components/ui/VIPBadge';
import { authApi } from '@/lib/api';

interface User {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
  role: string;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('imai-token');
    if (token) {
      authApi.getMe().then((res) => {
        setUser(res.user);
      }).catch(() => {
        localStorage.removeItem('imai-token');
      });
    }
  }, []);

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('imai-token');
    setUser(null);
    setUserMenuOpen(false);
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/tutorials', label: '教程' },
    { href: '/faq', label: 'FAQ' },
    { href: '/support', label: 'imai小助手' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#8b5cf6]">imai.work</span>
        </Link>

        {/* Nav Links - Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-[#8b5cf6] ${
                isActive(link.href) ? 'text-[#8b5cf6]' : 'text-[#94a3b8]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden md:flex" ref={userMenuRef}>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[#64748b] hover:bg-[#f1f5f9] transition-colors"
                >
                  <span className="font-medium">{user.nickname || user.phone}</span>
                  {(user as any).vip === 1 && <VIPBadge />}
                  <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* 用户下拉菜单 */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg">
                    <Link
                      href="/ticket"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#8b5cf6] transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      我的工单
                    </Link>
                    <div className="border-t border-[#e2e8f0] my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#64748b] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="btn btn-secondary btn-sm">
                登录
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm">
                注册
              </Link>
            </div>
          )}

          {/* Hamburger */}
          <button
            className="flex items-center justify-center p-2 text-[#94a3b8] md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="菜单"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="border-t border-[#e2e8f0] bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-[#8b5cf6] ${
                  isActive(link.href) ? 'text-[#8b5cf6] bg-white' : 'text-[#94a3b8]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                href="/ticket"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-[#94a3b8] hover:text-[#8b5cf6] transition-colors"
              >
                我的工单
              </Link>
            )}
            <div className="border-t border-[#e2e8f0] pt-2">
              {user ? (
                <div className="space-y-2 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#94a3b8]">{user.nickname || user.phone}</span>
                    {(user as any).vip === 1 && <VIPBadge />}
                  </div>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="btn btn-secondary btn-sm w-full"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 px-3 py-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="btn btn-secondary btn-sm flex-1 text-center">登录</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="btn btn-primary btn-sm flex-1 text-center">注册</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

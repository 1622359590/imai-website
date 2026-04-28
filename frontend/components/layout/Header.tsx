'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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

  const handleLogout = () => {
    localStorage.removeItem('imai-token');
    setUser(null);
    router.push('/');
  };

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/tutorials', label: '教程' },
    { href: '/faq', label: 'FAQ' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[#00d4ff]">imai.work</span>
        </Link>

        {/* Nav Links - Desktop */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-[#00d4ff] ${
                isActive(link.href) ? 'text-[#00d4ff]' : 'text-[#94a3b8]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors hover:text-[#00d4ff] ${
                isActive('/admin') ? 'text-[#00d4ff]' : 'text-[#94a3b8]'
              }`}
            >
              后台管理
            </Link>
          )}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden items-center gap-3 md:flex">
              <span className="text-sm text-[#94a3b8]">{user.nickname || user.phone}</span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
              >
                退出
              </button>
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
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-[#00d4ff] ${
                  isActive(link.href) ? 'text-[#00d4ff] bg-white' : 'text-[#94a3b8]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user?.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-[#00d4ff] ${
                  isActive('/admin') ? 'text-[#00d4ff] bg-white' : 'text-[#94a3b8]'
                }`}
              >
                后台管理
              </Link>
            )}
            <div className="border-t border-[#e2e8f0] pt-2">
              {user ? (
                <div className="space-y-2 px-3 py-2">
                  <span className="text-sm text-[#94a3b8]">{user.nickname || user.phone}</span>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="btn btn-danger btn-sm w-full"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 px-3 py-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="btn btn-secondary btn-sm flex-1 text-center"
                  >
                    登录
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="btn btn-primary btn-sm flex-1 text-center"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

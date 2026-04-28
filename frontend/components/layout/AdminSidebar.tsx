'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarLinks = [
  { href: '/admin', label: '仪表盘', icon: '📊' },
  { href: '/admin/tutorials', label: '教程管理', icon: '📚' },
  { href: '/admin/faq', label: 'FAQ管理', icon: '❓' },
  { href: '/admin/settings', label: '系统设置', icon: '⚙️' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <aside className="admin-sidebar flex h-screen w-60 flex-col border-r">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-[#e2e8f0]">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#00d4ff]">Admin</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {sidebarLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              isActive(link.href) ? 'active' : ''
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Back to site */}
      <div className="border-t border-[#e2e8f0] p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#64748b] transition-colors hover:text-[#00d4ff]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回前台
        </Link>
      </div>
    </aside>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#e2e8f0] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#94a3b8]">
              &copy; {new Date().getFullYear()} imai.work - All Rights Reserved
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#475569]">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00d4ff] transition-colors"
            >
              沪ICP备2024000000号
            </a>
            <span className="text-[#1e293b]">|</span>
            <Link href="/faq" className="hover:text-[#00d4ff] transition-colors">
              常见问题
            </Link>
            <span className="text-[#1e293b]">|</span>
            <Link href="/tutorials" className="hover:text-[#00d4ff] transition-colors">
              教程中心
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

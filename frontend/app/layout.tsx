import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "imai.work - 未来将是无人工",
  description: "AI 知识教程平台 - 抖音/快手/小红书/微信养号教程与技术支持",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-white text-[#1e293b] antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}

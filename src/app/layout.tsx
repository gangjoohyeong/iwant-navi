import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { ReactQueryProvider } from '@/provider/react-query-provider.client';

export const metadata: Metadata = {
  title: 'I WANT NAVI - 분당풍림아이원플러스 길안내',
  description: '분당풍림아이원플러스 길안내 서비스 I WANT NAVI입니다.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}

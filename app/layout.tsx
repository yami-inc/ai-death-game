import type { Metadata, Viewport } from 'next';
import { DotGothic16, VT323 } from 'next/font/google';
import './globals.css';

const dotGothic = DotGothic16({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dotgothic',
  display: 'swap',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AIデスゲーム | GMとして介入せよ',
  description: 'AIたちが命をかけて議論するデスゲーム。GMとして介入し、展開を揺らせ。',
  keywords: ['AIゲーム', 'デスゲーム', 'ブラウザゲーム', 'GM介入', 'AI'],
  openGraph: {
    title: 'AIデスゲーム | GMとして介入せよ',
    description: 'AIたちが命をかけて議論するデスゲーム。あなたはGMとして介入できる。',
    siteName: 'AIデスゲーム',
    locale: 'ja_JP',
    type: 'website',
  },
  icons: {
    icon: '/images/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${dotGothic.variable} ${vt323.variable} font-dotgothic antialiased`}>
        {children}
      </body>
    </html>
  );
}

'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ShareRedirectClient() {
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      window.location.replace('/');
    }, 80);

    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-green-400 px-6">
      <div className="text-center">
        <p className="text-lg font-bold">トップページへ移動中...</p>
        <p className="mt-3 text-sm text-green-600">
          遷移しない場合は <Link href="/" className="underline hover:text-green-400">こちら</Link>
        </p>
      </div>
    </main>
  );
}

'use client';

import { LandingPage } from '@/components';

/**
 * ランディングページ（トップページ）
 * - ゲーム説明、キャラクター紹介、トロフィー、FAQ
 * - 現在は障害対応のため開始導線を停止中
 */
export default function HomePage() {
  return (
    <div className="min-h-dvh relative">
      {/* CRTオーバーレイ */}
      <div className="fixed inset-0 z-50 pointer-events-none crt-overlay opacity-30" />
      <div className="fixed inset-0 z-40 pointer-events-none bg-green-500/[0.02] mix-blend-overlay" />

      {/* ランディングページコンテンツ */}
      <div className="relative z-10">
        <LandingPage />
      </div>
    </div>
  );
}

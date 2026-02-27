'use client';

import React from 'react';
import Link from 'next/link';

export const CTASection: React.FC = () => {

  const handleShareToX = () => {
    const shareText = 'AIたちが命をかけて議論するデスゲーム。GMとして介入し、展開を揺らせ。 #AIデスゲーム';
    const shareUrl = 'https://deathgame.ai.yami.net/';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="px-4 pt-8 pb-12 md:pt-10 md:pb-16 text-center bg-[#040904]">
      <div className="max-w-3xl mx-auto">
        <p className="text-lg md:text-2xl text-[#89e972] mb-6">AIたちの運命を、あなたが握る。</p>

        <div className="mx-auto w-full max-w-[430px] md:max-w-[645px]">
          <Link
            href="/byok"
            className="mx-auto mt-4 block w-full max-w-[300px] border-2 border-[#33ff00] bg-[#061206] px-4 py-3 text-center text-base font-bold text-[#33ff00] transition hover:bg-[#33ff00]/15"
          >
            ゲームを始める
          </Link>
          <p className="mt-2 text-center text-xs text-[#6eb659]">
            ※ Gemini APIキー（無料取得可）が必要です
          </p>

          <div className="mt-[50px] mb-12 flex justify-center">
            <button
              onClick={handleShareToX}
              className="flex h-12 w-full max-w-[300px] items-center justify-center gap-2 border border-[#33ff00] text-[#33ff00] transition-colors hover:bg-[#33ff00]/10"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>でシェアする</span>
            </button>
          </div>
        </div>

        <footer className="border-t border-[#1d5f1d] pt-8 text-sm text-[#6eb659]">
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://deathgame.ai.yami.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#90ee79] underline"
            >
              Demo
            </a>
            <span className="text-[#1d5f1d]">|</span>
            <a
              href="https://github.com/yami-inc/ai-death-game"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#90ee79] underline"
            >
              GitHub
            </a>
          </div>
          <p className="mt-3">
            <a
              href="https://ai.yami.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#90ee79]"
            >
              Made by YAMI AI
            </a>
          </p>
          <p className="mt-1">MIT License</p>
        </footer>
      </div>
    </section>
  );
};

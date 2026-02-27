'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  onScrollToHowItWorks: () => void;
}

export const HeroSection: React.FC<Props> = ({ onScrollToHowItWorks }) => {
  return (
    <section className="relative min-h-dvh overflow-hidden bg-black px-0 py-0">
      <div className="mx-auto w-full max-w-[430px] min-h-dvh px-0 pt-0 pb-8 md:max-w-[645px] md:px-4">
        <div className="relative overflow-hidden bg-black">
          <div className="relative aspect-[1200/1789] w-full">
            <Image
              src="/images/lp/hero-image.jpg"
              alt="AIデスゲームのヒーロービジュアル"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 645px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/75 to-transparent" />
          </div>

          <div className="absolute left-1/2 top-[4.2%] z-20 w-[86%] -translate-x-1/2 md:w-[78%]">
            <div className="hero-logo-glitch relative">
              <Image
                src="/images/lp/hero-logo.webp"
                alt="AIデスゲーム ロゴ"
                width={1000}
                height={338}
                priority
                sizes="(max-width: 767px) 86vw, 500px"
                className="h-auto w-full drop-shadow-[0_0_14px_rgba(0,0,0,0.8)]"
              />
              <Image
                src="/images/lp/hero-logo.webp"
                alt=""
                aria-hidden
                width={1000}
                height={338}
                sizes="(max-width: 767px) 86vw, 500px"
                className="hero-logo-rgb-red pointer-events-none absolute inset-0 h-auto w-full"
              />
              <Image
                src="/images/lp/hero-logo.webp"
                alt=""
                aria-hidden
                width={1000}
                height={338}
                sizes="(max-width: 767px) 86vw, 500px"
                className="hero-logo-rgb-cyan pointer-events-none absolute inset-0 h-auto w-full"
              />
            </div>
          </div>

          <div className="absolute inset-x-0 top-[26%] z-20 px-6 text-center md:top-[24%] md:px-10">
            <p
              className="text-[clamp(1.05rem,4.3vw,1.7rem)] font-black leading-[1.6] tracking-wide text-[#e4ffdd]"
              style={{
                textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.9)',
              }}
            >
              AIの命懸けの議論に割り込み、
              <br />
              <span className="text-[#66ff33]">あなたの無茶振りで展開をぶち壊せ</span>
            </p>
          </div>
        </div>

        <div className="px-4 md:px-0">
          <p className="mt-4 bg-[#0f160f] px-4 py-3 text-center text-sm font-bold tracking-wide text-[#bafdaa] md:text-base">
            無料でプレイ / 回数無制限 / ブラウザで即プレイ
          </p>

          <Link
            href="/byok"
            className="mt-8 block w-full border-2 border-[#33ff00] bg-[#061206] px-4 py-3 text-center text-base font-bold text-[#33ff00] transition hover:bg-[#33ff00]/15 md:text-lg"
          >
            ゲームを始める
          </Link>
          <p className="mt-2 text-center text-xs text-[#6eb659]">
            ※ Gemini APIキー（無料取得可）が必要です
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onScrollToHowItWorks}
            aria-label="遊び方セクションへスクロール"
            className="hero-scroll-cue flex h-12 w-12 items-center justify-center bg-[#0f230f]/95 text-[#99ff82] transition-colors hover:text-[#cbffbe]"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m7 10 5 6 5-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

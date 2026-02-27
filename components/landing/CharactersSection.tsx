'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { LandingCharacter } from '../LandingPage';

interface Props {
  characters: LandingCharacter[];
}

// スワイプ検出の閾値
const SWIPE_THRESHOLD = 50;

export const CharactersSection: React.FC<Props> = ({ characters }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const currentCharacter = characters[currentIndex];

  // スワイプ用のref
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handlePrev = useCallback(() => {
    setSlideDirection('right');
    setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);
  }, [characters.length]);

  const handleNext = useCallback(() => {
    setSlideDirection('left');
    setCurrentIndex((prev) => (prev + 1) % characters.length);
  }, [characters.length]);

  // スワイプハンドラー
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // 横方向のスワイプが縦方向より大きい場合、スクロールを防止
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;

    if (isSwiping.current && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        // 右にスワイプ → 前へ
        handlePrev();
      } else {
        // 左にスワイプ → 次へ
        handleNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isSwiping.current = false;
  }, [handlePrev, handleNext]);

  // 全身画像のパスを取得
  const getFullBodyImage = (id: string) => {
    const secretMap: Record<string, string> = {
      secret: 'c-secret-01.jpg',
      secret2: 'c-secret-02.jpg',
      secret3: 'c-secret-03.jpg',
      secret4: 'c-secret-04.jpg',
    };
    if (id in secretMap) {
      return `/images/lp/${secretMap[id]}`;
    }
    return `/images/lp/c-${id}.jpg`;
  };

  // 隣のキャラクターのインデックスを取得（プリロード用）
  const prevIndex = (currentIndex - 1 + characters.length) % characters.length;
  const nextIndex = (currentIndex + 1) % characters.length;

  // サムネイル画像のパスを取得
  const getThumbnailImage = (id: string) => {
    if (id === 'moderator') {
      return '/agents/master_default_0.jpg';
    }
    if (id.startsWith('secret')) {
      return '/images/lp/c-secret-face.jpg';
    }
    return `/agents/${id}_default_0.jpg`;
  };

  return (
    <section className="px-4 py-16 md:py-20 overflow-hidden bg-black">
      <div className="max-w-5xl mx-auto">
        <h2 className="lp-jp-heading-flicker text-center text-[clamp(2.24rem,9.6vw,5.12rem)] font-black leading-none tracking-wide text-[#66ff33]">
          登場人物
        </h2>
        <p className="mb-10 mt-[15px] text-center text-xs font-extrabold uppercase tracking-[0.42em] text-[#8cd779] md:text-sm">
          Characters
        </p>
        <p className="mb-8 text-center text-base font-bold text-[#95ef7f] md:text-xl">
          10人のAIキャラから5人がランダム選出
        </p>

        <div className="max-w-md mx-auto">
          {/* メインエリア: 全身絵 + 情報カード（重なり配置） */}
          <div
            className="relative min-h-[540px] md:min-h-[650px] touch-pan-y"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* 左矢印 */}
            <button
              onClick={handlePrev}
              aria-label="前のキャラクター"
              className="absolute left-0 top-[40%] -translate-y-1/2 z-20 p-2 text-[#8aff70] transition-colors hover:text-[#bcffab]"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><polygon points="13,1 3,8 13,15"/></svg>
            </button>

            {/* 全身絵（1.5倍サイズ） */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[300px] h-[540px] md:w-[360px] md:h-[650px]">
              <div
                key={currentIndex}
                className={`absolute inset-0 ${
                  slideDirection === 'left'
                    ? 'animate-slide-in-from-right'
                    : slideDirection === 'right'
                      ? 'animate-slide-in-from-left'
                      : ''
                }`}
                onAnimationEnd={() => setSlideDirection(null)}
              >
                <Image
                  src={getFullBodyImage(currentCharacter.id)}
                  alt={`${currentCharacter.name}の全身`}
                  fill
                  sizes="(max-width: 767px) 300px, 360px"
                  className="object-contain object-bottom"
                  priority
                />
              </div>
            </div>

            {/* 右矢印 */}
            <button
              onClick={handleNext}
              aria-label="次のキャラクター"
              className="absolute right-0 top-[40%] -translate-y-1/2 z-20 p-2 text-[#8aff70] transition-colors hover:text-[#bcffab]"
            >
              <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor"><polygon points="3,1 13,8 3,15"/></svg>
            </button>

            {/* 隣のキャラクター画像をプリロード（非表示） */}
            <div className="hidden">
              <Image
                src={getFullBodyImage(characters[prevIndex].id)}
                alt=""
                width={360}
                height={650}
              />
              <Image
                src={getFullBodyImage(characters[nextIndex].id)}
                alt=""
                width={360}
                height={650}
              />
            </div>

            {/* 情報カード（足に重なる位置） */}
            <article className="absolute bottom-0 left-0 right-0 z-10 border-2 border-[#2a7a2a] bg-black/70 p-4">
              <div className="flex items-start gap-4">
                {/* サムネイル */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0 border border-[#2f8f2f] overflow-hidden">
                  <Image
                    src={getThumbnailImage(currentCharacter.id)}
                    alt={currentCharacter.name}
                    fill
                    sizes="96px"
                    className="object-cover brightness-95"
                  />
                </div>

                {/* テキスト情報 */}
                <div className="flex-1 min-w-0">
                  <p className="text-xl font-bold text-[#66ff33]">{currentCharacter.name}</p>
                  <p className="mt-1 text-sm font-bold leading-tight text-[#8de578]">
                    {currentCharacter.occupation} / {currentCharacter.age}
                  </p>
                  <p className="mt-2 text-sm text-[#9dff80] leading-relaxed">{currentCharacter.description}</p>
                </div>
              </div>
            </article>
          </div>

          {/* インジケーター */}
          <div className="flex justify-center gap-2 mt-5">
            {characters.map((character, idx) => (
              <button
                key={character.id}
                onClick={() => {
                  setSlideDirection(idx > currentIndex ? 'left' : 'right');
                  setCurrentIndex(idx);
                }}
                aria-label={`${character.name}を表示`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-[#66ff33]' : 'bg-[#1f4f1f]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* スライドアニメーション用CSS */}
      <style jsx>{`
        @keyframes slide-in-from-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slide-in-from-left {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-from-right {
          animation: slide-in-from-right 0.3s ease-out forwards;
        }
        .animate-slide-in-from-left {
          animation: slide-in-from-left 0.3s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Expression } from '@/lib/types';
import { ensureImageDecoded, isImageDecoded } from '@/lib/imagePreloader';

interface Props {
  characterId: string;
  expression: Expression;
  mouthOpen: boolean;
  isAlive: boolean;
}

/**
 * フォーカスエリア用の大きいポートレート
 * - LLM出力に応じて表情変化
 * - 発言中は口パクアニメーション
 */
export const FocusPortrait: React.FC<Props> = ({
  characterId,
  expression,
  mouthOpen,
  isAlive,
}) => {
  const getTargetFrames = () => {
    if (!isAlive || expression === 'fainted') {
      const fainted = `/agents/${characterId}_fainted_0.jpg`;
      return { closed: fainted, open: null };
    }

    const base = `/agents/${characterId}_${expression}`;
    return { closed: `${base}_0.jpg`, open: `${base}_1.jpg` };
  };

  const initialFrames = getTargetFrames();
  const [displayFrames, setDisplayFrames] = useState<{ closed: string; open: string | null }>(initialFrames);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const targetFrames = getTargetFrames();
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    const requiredUrls = targetFrames.open
      ? [targetFrames.closed, targetFrames.open]
      : [targetFrames.closed];

    const allReady = requiredUrls.every((url) => isImageDecoded(url));
    if (allReady) {
      setDisplayFrames(targetFrames);
      return;
    }
    // 画像decode待ち中も一旦空にせず、直前フレームを維持してフリッカーを防ぐ

    void Promise.all(requiredUrls.map((url) => ensureImageDecoded(url)))
      .then(() => {
        if (requestIdRef.current !== currentRequestId) return;
        setDisplayFrames(targetFrames);
      })
      .catch(() => {
        if (requestIdRef.current !== currentRequestId) return;
        setDisplayFrames(targetFrames);
      });
  }, [characterId, expression, isAlive]);

  return (
    <div className="relative w-[180px] h-[180px] md:w-[200px] md:h-[200px] border-2 border-green-500 bg-black overflow-hidden">
      {displayFrames.closed && (
        <>
          {/* 口閉じフレーム */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayFrames.closed}
            alt="Portrait"
            className={`absolute inset-0 w-full h-full object-cover ${mouthOpen && displayFrames.open ? 'opacity-0' : 'opacity-100'}`}
            style={{
              filter: 'contrast(1.1) brightness(0.9)',
            }}
          />

          {/* 口開きフレーム（生存時のみ） */}
          {displayFrames.open && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayFrames.open}
              alt="Portrait mouth-open"
              className={`absolute inset-0 w-full h-full object-cover ${mouthOpen ? 'opacity-100' : 'opacity-0'}`}
              style={{
                filter: 'contrast(1.1) brightness(0.9)',
              }}
            />
          )}
        </>
      )}

      {/* スキャンライン */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* グロー効果（枠の外側） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 20px rgba(51, 255, 0, 0.1), 0 0 15px rgba(51, 255, 0, 0.2)',
        }}
      />

      {/* 脱落時オーバーレイ */}
      {!isAlive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span
            className="text-red-500 font-bold text-lg tracking-widest transform -rotate-12"
            style={{ textShadow: '0 0 8px rgba(255,0,0,0.8)' }}
          >
            DELETED
          </span>
        </div>
      )}
    </div>
  );
};

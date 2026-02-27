'use client';

import React from 'react';
import { FocusPortrait } from './FocusPortrait';
import { Expression } from '@/lib/types';

interface Props {
  characterId: string | null;
  expression: Expression;
  mouthOpen: boolean;
  isAlive: boolean;
}

/**
 * フォーカスエリア: 横長背景の上に正方形のポートレートを配置
 * - 発言中のエージェントを大きく表示
 * - 表情変化 + 口パクアニメーション
 */
export const FocusArea: React.FC<Props> = ({
  characterId,
  expression,
  mouthOpen,
  isAlive,
}) => {
  return (
    <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
      {/* 背景画像 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/images/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* 背景オーバーレイ: 暗く + 緑のティント */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 10, 0, 0.5), rgba(0, 10, 0, 0.6))',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'rgba(51, 255, 0, 0.05)',
          mixBlendMode: 'overlay',
        }}
      />

      {/* 横長背景フレーム */}
      <div className="relative w-full h-full border-2 border-green-800">
        {/* 中央のポートレート */}
        <div className="absolute inset-0 flex items-center justify-center">
          {characterId ? (
            <FocusPortrait
              characterId={characterId}
              expression={expression}
              mouthOpen={mouthOpen}
              isAlive={isAlive}
            />
          ) : (
            // ローディング中（エージェント未選択時）
            <div className="w-[180px] h-[180px] border-2 border-green-800 border-dashed flex items-center justify-center bg-black/50">
              <span className="text-green-700 text-sm animate-pulse">LOADING...</span>
            </div>
          )}
        </div>

        {/* 外枠のグロー効果 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8)',
          }}
        />
      </div>
    </div>
  );
};

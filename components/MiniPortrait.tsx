'use client';

import React, { useState, useEffect, useRef } from 'react';
import { audioService } from '@/lib/audio';

interface Props {
  characterId: string;
  name: string;
  isAlive: boolean;
  isSpeaking?: boolean;
  receivedVotes?: number;  // 獲得票数
  votedForName?: string;   // 投票先の名前
  showVoteInfo?: boolean;  // 投票情報を表示するか（投票フェーズ中）
  gmVoteAnimation?: {      // GM投票アニメーション
    targetId: string;      // アニメーション対象のエージェントID
    addVotes: number;      // 加算する票数（1 or 10）
  } | null;
  agentId?: string;        // このポートレートのエージェントID
}

/**
 * ステータスバー用のポートレート（スマホ最適化版）
 * - 常にdefault表情、口閉じ
 * - 脱落時のみfainted表情
 * - 発言中は枠が光る
 */
export const MiniPortrait: React.FC<Props> = ({
  characterId,
  name,
  isAlive,
  isSpeaking = false,
  receivedVotes = 0,
  votedForName,
  showVoteInfo = false,
  gmVoteAnimation = null,
  agentId,
}) => {
  // アニメーション表示用の票数（実際の票数と別に管理）
  const [displayVotes, setDisplayVotes] = useState(receivedVotes);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // GM投票アニメーション
  useEffect(() => {
    // このエージェントがアニメーション対象かチェック
    if (gmVoteAnimation && agentId && gmVoteAnimation.targetId === agentId) {
      const { addVotes } = gmVoteAnimation;
      // アニメーション開始時の票数（GM票を引いた状態）
      // receivedVotesにはすでにGM票が含まれているので引く
      const baseVotes = Math.max(0, receivedVotes - addVotes);

      // アニメーション開始: 最初は0票から表示開始（0でも表示するようにisAnimatingで制御）
      setDisplayVotes(baseVotes);
      setIsAnimating(true);

      let currentVote = 0;
      const interval = addVotes === 10 ? 280 : 500; // 10票なら280ms間隔（約2.8秒）、1票なら500ms

      animationRef.current = setInterval(() => {
        currentVote++;
        const newVotes = baseVotes + currentVote;
        setDisplayVotes(newVotes);

        // パルス音を再生
        audioService.playPulseBeep();

        if (currentVote >= addVotes) {
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }
          setIsAnimating(false);
        }
      }, interval);

      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    } else {
      // アニメーション対象でない場合は即座に表示
      setDisplayVotes(receivedVotes);
      setIsAnimating(false);
    }
  }, [gmVoteAnimation, agentId, receivedVotes]);

  // 画像パス: 常にdefault_0、脱落時のみfainted_0
  const imageSrc = isAlive
    ? `/agents/${characterId}_default_0.jpg`
    : `/agents/${characterId}_fainted_0.jpg`;

  // 発言中の枠グロー
  const borderClass = isSpeaking
    ? 'border-green-400 shadow-[0_0_12px_rgba(51,255,0,0.6)]'
    : 'border-green-800';

  // 脱落時のスタイル
  const containerOpacity = isAlive ? 'opacity-100' : 'opacity-70';

  return (
    <div className={`flex flex-col items-center ${containerOpacity}`}>
      {/* ポートレート - スマホ向けに大きく */}
      <div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 border-2 ${borderClass} bg-black overflow-hidden transition-all duration-200`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={name}
          className="w-full h-full object-cover"
          style={{
            filter: 'contrast(1.1) brightness(0.85)',
          }}
        />

        {/* スキャンライン */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)',
          }}
        />

        {/* DELETED オーバーレイ */}
        {!isAlive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span
              className="text-red-500 font-bold text-[10px] tracking-wider transform -rotate-12"
              style={{ textShadow: '0 0 6px rgba(255,0,0,0.9)' }}
            >
              DELETED
            </span>
          </div>
        )}

        {/* 票数バッジ（右上、投票フェーズで票がある場合、またはアニメーション中） */}
        {showVoteInfo && (displayVotes > 0 || isAnimating) && (
          <div
            className={`absolute -top-1 -right-1 min-w-6 h-6 px-1 flex items-center justify-center transition-all duration-200 ${
              isAnimating ? 'bg-red-500 scale-125 animate-pulse' : 'bg-red-600'
            }`}
          >
            <span
              className="text-white text-sm leading-none"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                fontWeight: 900,
                marginLeft: '-2px',
              }}
            >
              {displayVotes}
            </span>
          </div>
        )}
      </div>

      {/* 名前 - 大きく */}
      <div
        className={`mt-1.5 text-xs sm:text-sm font-bold truncate max-w-[70px] text-center ${
          isAlive ? 'text-green-400' : 'text-red-700 line-through'
        }`}
      >
        {name}
      </div>

      {/* 投票先 / 退場テキスト - 大きく */}
      <div className="h-4 text-[11px] sm:text-xs text-center truncate max-w-[70px]">
        {!isAlive ? (
          <span className="text-red-500 font-bold">退場</span>
        ) : showVoteInfo && votedForName ? (
          <span className="font-bold" style={{ color: '#ffff00' }}>[{votedForName}]</span>
        ) : (
          <span className="text-transparent">-</span>
        )}
      </div>
    </div>
  );
};

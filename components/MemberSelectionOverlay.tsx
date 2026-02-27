'use client';

import React, { useState, useEffect } from 'react';
import { Agent } from '@/lib/types';
import { canPlay, getRemainingPlays, getMaxPlaysPerDay } from '@/lib/playLimit';
import { getMaxAchievedRarity } from '@/lib/hiddenCharacter';
import { AGENT_PERSONALITIES } from '@/lib/constants';
import { useGameStore } from '@/lib/store';

interface Props {
  agents: Agent[];
  onShuffle: () => void;
  onStart: () => void | Promise<void>;
  onBackToTop: () => void;
  isPreparingAssets?: boolean;
}

/**
 * メンバー選定オーバーレイ
 * ゲーム開始前に表示し、参加メンバーの確認・シャッフル・開始を行う
 */
export const MemberSelectionOverlay: React.FC<Props> = ({
  agents,
  onShuffle,
  onStart,
  onBackToTop,
  isPreparingAssets = false,
}) => {
  const isByok = useGameStore((s) => s.isByok);
  const maxPlaysPerDay = getMaxPlaysPerDay();
  const [remainingPlays, setRemainingPlays] = useState(maxPlaysPerDay);
  const [isPlayable, setIsPlayable] = useState(true);
  const [isStartPending, setIsStartPending] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(0);

  useEffect(() => {
    // BYOK は自前キーなのでプレイ回数制限なし
    if (isByok) {
      setIsPlayable(true);
      setRemainingPlays(Infinity);
    } else {
      setRemainingPlays(getRemainingPlays());
      setIsPlayable(canPlay());
    }
    // 解放済みキャラ数を計算
    const maxRarity = getMaxAchievedRarity();
    const count = AGENT_PERSONALITIES.filter(
      (p) => p.unlockTier && p.unlockTier <= maxRarity
    ).length;
    setUnlockedCount(count);
  }, [isByok]);

  const handleStart = async () => {
    if (isStartPending || isPreparingAssets) return;

    if (!isByok && !canPlay()) {
      setIsPlayable(false);
      return;
    }

    setIsStartPending(true);

    try {
      await onStart();
    } catch (error) {
    } finally {
      setIsStartPending(false);
    }
  };

  const isStartDisabled = !isPlayable || isStartPending || isPreparingAssets;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="w-full max-w-md mx-4 border-2 border-green-500 bg-black p-4">
        {/* タイトル */}
        <h2
          className="text-center text-green-400 text-lg font-bold mb-4 tracking-wider"
          style={{ textShadow: '0 0 10px rgba(51,255,0,0.5)' }}
        >
          【 参加者 】
        </h2>

        {/* メンバーサムネイル - 上段3人 + 下段2人 */}
        <div className="flex flex-col items-center gap-3 mb-6">
          {/* 上段 */}
          <div className="flex justify-center gap-4">
            {agents.slice(0, 3).map((agent) => (
              <MemberCard key={agent.id} agent={agent} />
            ))}
          </div>
          {/* 下段 */}
          <div className="flex justify-center gap-4">
            {agents.slice(3, 5).map((agent) => (
              <MemberCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* ルール説明 */}
        <div className="p-3 mb-4" style={{ backgroundColor: '#042C04' }}>
          <h3
            className="text-green-400 text-sm font-bold mb-2"
            style={{ textShadow: '0 0 6px rgba(51,255,0,0.4)' }}
          >
            【 ルール 】
          </h3>
          <ul className="text-green-300 text-sm space-y-1">
            <li>・5人で議論し、投票で追放者を決める</li>
            <li>・最多票者は即退場（同票も退場）</li>
            <li>・最後まで生存すれば勝者</li>
            <li>・あなたはGMとして介入可能</li>
          </ul>
        </div>

        {/* 隠しキャラ解放済み通知 */}
        {unlockedCount > 0 && (
          <div
            className="p-2 mb-4 border border-green-600 rounded text-center"
            style={{ backgroundColor: 'rgba(51, 255, 0, 0.05)' }}
          >
            <p className="text-green-500 text-xs">
              隠しキャラ {unlockedCount}体 解放済み
            </p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-3 mb-3">
          <button
            onClick={onShuffle}
            disabled={isPreparingAssets || isStartPending}
            className="flex-1 py-3 border-2 border-green-600 text-green-400 font-bold text-sm
                       hover:bg-green-900/30 active:bg-green-800/50 transition-colors
                       disabled:border-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed"
            style={{ textShadow: '0 0 6px rgba(51,255,0,0.5)' }}
          >
            シャッフル
          </button>
          <button
            onClick={handleStart}
            disabled={isStartDisabled}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 border-2 font-bold text-sm transition-colors
                       ${!isStartDisabled
                         ? 'border-red-600 text-red-400 hover:bg-red-900/30 active:bg-red-800/50'
                         : 'border-gray-600 text-gray-500 cursor-not-allowed'}`}
            style={{ textShadow: !isStartDisabled ? '0 0 6px rgba(255,0,85,0.5)' : 'none' }}
          >
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><polygon points="3,1 13,8 3,15"/></svg>
            <span>{isPreparingAssets || isStartPending ? '準備中...' : 'デスゲーム開始'}</span>
          </button>
        </div>
        {/* 下部：トップに戻る + 残りプレイ回数 */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onBackToTop}
            className="px-3 py-1.5 text-green-300 font-bold text-xs
                       hover:text-green-200 active:text-green-100 transition-colors"
            style={{ textShadow: '0 0 4px rgba(51,255,0,0.35)' }}
          >
            ← トップに戻る
          </button>
          {isByok ? (
            <span className="text-green-400 text-xs">
              BYOK: 回数無制限
            </span>
          ) : isPlayable ? (
            <span className="text-green-400 text-xs">
              本日の残プレイ <span className="font-bold">{remainingPlays}</span>/{maxPlaysPerDay}
            </span>
          ) : (
            <span className="text-red-400 text-xs font-bold">
              上限到達（0時リセット）
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * メンバーカード（サムネイル + 名前）
 */
const MemberCard: React.FC<{ agent: Agent }> = ({ agent }) => {
  const imageSrc = `/agents/${agent.characterId}_default_0.jpg`;

  return (
    <div className="flex flex-col items-center">
      {/* ポートレート */}
      <div className="relative w-16 h-16 border-2 border-green-700 bg-black overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={agent.name}
          className="w-full h-full object-cover"
          style={{
            filter: 'contrast(1.1) brightness(0.85)',
          }}
        />
        {/* スキャンライン */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)',
          }}
        />
      </div>
      {/* 名前 */}
      <div
        className="mt-1 text-xs font-bold text-green-400 truncate max-w-[70px] text-center"
        style={{ textShadow: '0 0 4px rgba(51,255,0,0.4)' }}
      >
        {agent.name}
      </div>
    </div>
  );
};

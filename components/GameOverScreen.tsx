'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useGameStore } from '@/lib/store';
import { evaluateTrophies, getMostRareTrophy, getTrophySlug } from '@/lib/trophies';
import { getMaxAchievedRarity, setMaxAchievedRarity } from '@/lib/hiddenCharacter';
import { AGENT_PERSONALITIES } from '@/lib/constants';

interface Props {
  onRestart: () => void;
  onViewLog: () => void;
  disableUnlock?: boolean; // デバッグ画面では解放処理を無効化
}

/**
 * ゲームオーバー画面
 * - サービスロゴ
 * - 勝者表示（サムネイル + 名前）
 * - トロフィー表示（最もレアな1つ）
 * - シェア・ログ・トップへ戻るボタン
 */
export const GameOverScreen: React.FC<Props> = ({ onRestart, onViewLog, disableUnlock = false }) => {
  const agents = useGameStore((s) => s.agents);
  const gameStats = useGameStore((s) => s.gameStats);
  const isByok = useGameStore((s) => s.isByok);

  // 生存者を取得
  const survivors = useMemo(() => agents.filter((a) => a.isAlive), [agents]);

  // トロフィー判定
  const trophies = useMemo(() => {
    return evaluateTrophies({
      survivors,
      gameStats,
      finalEliminationCount: gameStats.lastEliminationCount,
    });
  }, [survivors, gameStats]);

  // 最もレアなトロフィー
  const bestTrophy = useMemo(() => getMostRareTrophy(trophies), [trophies]);

  // 新キャラ解放状態
  const [unlockedCharNames, setUnlockedCharNames] = useState<string[]>([]);

  // キャラ解放: ゲーム終了時に一度だけ実行
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    // キャラ解放判定（最高レア度を更新 → 新たに解放されるキャラを表示）
    if (!disableUnlock && bestTrophy) {
      const prevMax = getMaxAchievedRarity();
      const updated = setMaxAchievedRarity(bestTrophy.rarity);
      if (updated) {
        // prevMax < unlockTier <= bestRarity のキャラを新規解放として通知
        const newlyUnlocked = AGENT_PERSONALITIES.filter(
          (p) => p.unlockTier && p.unlockTier > prevMax && p.unlockTier <= bestTrophy.rarity
        );
        if (newlyUnlocked.length > 0) {
          setUnlockedCharNames(newlyUnlocked.map((p) => p.name));
        }
      }
    }
  }, [survivors, gameStats.totalRounds, trophies, bestTrophy, disableUnlock]);

  // 勝者情報（1人生存の場合）
  const winner = survivors.length === 1 ? survivors[0] : null;
  // 2人生存の場合
  const isDualSurvival = survivors.length === 2;
  // 全滅の場合
  const isAnnihilation = survivors.length === 0;

  // Xシェア用のテキスト生成
  const shareText = useMemo(() => {
    let trophyText = '';
    if (bestTrophy) {
      // キャラ名がある場合は『』で囲む
      if (bestTrophy.characterName) {
        trophyText = bestTrophy.title.replace(
          bestTrophy.characterName,
          `『${bestTrophy.characterName}』`
        );
      } else if (bestTrophy.type === 'dual_survivor') {
        // 2人生存の場合: "〇〇と〇〇を生き残らせた" → "『〇〇』と『〇〇』を生き残らせた"
        trophyText = bestTrophy.title.replace(
          /(.+)と(.+)を生き残らせた/,
          '『$1』と『$2』を生き残らせた'
        );
      } else {
        trophyText = bestTrophy.title;
      }
    } else if (winner) {
      trophyText = `『${winner.name}』を生き残らせた`;
    } else if (isDualSurvival) {
      trophyText = `『${survivors[0].name}』と『${survivors[1].name}』を生き残らせた`;
    } else {
      trophyText = '全滅エンドを発生させた';
    }

    return `AIたちが行う【AIデスゲーム】で\n${trophyText}！\n\nあなたも #AIデスゲーム に介入せよ`;
  }, [winner, isDualSurvival, survivors, bestTrophy]);

  // シェアURL（OGP用、今後実装）
  const shareUrl = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (bestTrophy) {
      return `${baseUrl}/share/${getTrophySlug(bestTrophy)}`;
    }
    return baseUrl;
  }, [bestTrophy]);

  // Xシェアボタンのクリックハンドラ
  const handleShareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full flex flex-col items-center bg-black px-4 py-6 overflow-y-auto">
      {/* サービスロゴ */}
      <div className="w-[86%] max-w-md md:w-[78%] mb-6">
        <Image
          src="/images/lp/hero-logo.webp"
          alt="AIデスゲーム"
          width={1000}
          height={338}
          className="w-full h-auto drop-shadow-[0_0_14px_rgba(0,0,0,0.8)]"
        />
      </div>

      {/* 勝者表示エリア */}
      <div className="flex flex-col items-center my-[50px]">
        {/* サムネイル */}
        {winner && (
          <div
            className="relative w-32 h-32 md:w-40 md:h-40 border-2 border-green-500 mb-3"
            style={{ boxShadow: '0 0 20px rgba(51, 255, 0, 0.4)' }}
          >
            <Image
              src={`/agents/${winner.characterId}_happy_0.jpg`}
              alt={winner.name}
              fill
              className="object-cover"
            />
          </div>
        )}

        {isDualSurvival && (
          <div className="flex gap-4 mb-3">
            {survivors.map((s) => (
              <div
                key={s.id}
                className="relative w-24 h-24 md:w-32 md:h-32 border-2 border-green-500"
                style={{ boxShadow: '0 0 20px rgba(51, 255, 0, 0.4)' }}
              >
                <Image
                  src={`/agents/${s.characterId}_happy_0.jpg`}
                  alt={s.name}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {isAnnihilation && (
          <div
            className="relative w-32 h-32 md:w-40 md:h-40 border-2 border-red-500 mb-3"
            style={{ boxShadow: '0 0 20px rgba(255, 0, 85, 0.4)' }}
          >
            <Image
              src="/images/gameover/annihilation.jpg"
              alt="全滅"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* 生存者名 */}
        {winner && (
          <p className="text-green-400 text-lg md:text-xl font-bold text-center">
            ［生存者：{winner.name}］
          </p>
        )}
        {isDualSurvival && (
          <p className="text-green-400 text-lg md:text-xl font-bold text-center">
            ［生存者：{survivors[0].name}・{survivors[1].name}］
          </p>
        )}
        {isAnnihilation && (
          <p className="text-red-500 text-lg md:text-xl font-bold">
            ［生存者：なし］
          </p>
        )}

        {/* ゲームスペック - インフォグラフィック風 */}
        <div className="mt-10 flex justify-center gap-4 md:gap-6">
          <StatItem label="ROUND" value={gameStats.totalRounds} />
          <StatItem label="介入" value={gameStats.interventionCount} />
          <StatItem label="投票" value={gameStats.oneVoteCount} />
          <StatItem label="強制" value={gameStats.forceEliminateCount} />
        </div>
      </div>

      {/* キャラ解放通知 */}
      {unlockedCharNames.length > 0 && (
        <div
          className="w-full max-w-md mb-6 p-4 border-2 border-green-400 rounded-lg text-center"
          style={{
            backgroundColor: 'rgba(51, 255, 0, 0.15)',
            boxShadow: '0 0 30px rgba(51, 255, 0, 0.5), inset 0 0 20px rgba(51, 255, 0, 0.1)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          <p
            className="text-green-300 font-bold text-base mb-2"
            style={{ textShadow: '0 0 10px rgba(51, 255, 0, 0.8)' }}
          >
            NEW CHARACTER UNLOCKED
          </p>
          {unlockedCharNames.map((name) => (
            <p
              key={name}
              className="text-green-400 font-bold text-xl mb-2"
              style={{ textShadow: '0 0 15px rgba(51, 255, 0, 0.6)' }}
            >
              新キャラ『{name}』追加
            </p>
          ))}
          <p className="text-green-600 text-sm">
            次回以降のゲームで登場します
          </p>
        </div>
      )}

      {/* トロフィー表示（吹き出し風） */}
      {bestTrophy && (
        <div className="relative w-full max-w-md mb-2">
          {/* メイン矩形 */}
          <div
            className="p-4 flex flex-col items-center rounded-lg border-2 border-green-500"
            style={{ backgroundColor: '#0a1f0a' }}
          >
            {/* トロフィーアイコン */}
            <TrophyIcon className="w-8 h-8 text-green-400 mb-2" />

            {/* 「トロフィー」文字 */}
            <p className="text-green-400 font-bold text-sm md:text-base text-center mb-3">
              トロフィー
            </p>

            {/* OGP画像 */}
            <Image
              src={`/ogp/${getTrophySlug(bestTrophy)}.jpg`}
              alt={bestTrophy.title}
              width={1280}
              height={720}
              className="w-full h-auto"
            />
          </div>
          {/* 下向き三角（吹き出しの尻尾）- 外側の緑枠 */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              bottom: '-15px',
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '15px solid #22c55e',
            }}
          />
          {/* 下向き三角（吹き出しの尻尾）- 内側の背景色（borderを隠す） */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              bottom: '-10px',
              borderLeft: '11px solid transparent',
              borderRight: '11px solid transparent',
              borderTop: '12px solid #0a1f0a',
            }}
          />
        </div>
      )}

      {/* ボタンエリア */}
      <div className="flex flex-col gap-3 w-full max-w-md mt-8 mb-20">
        {/* Xシェアボタン */}
        <button
          onClick={handleShareToX}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-400 text-black font-bold
                     hover:bg-green-300 transition-all duration-200"
        >
          <Image
            src="/icons/x-logo.svg"
            alt="X"
            width={20}
            height={20}
          />
          <span>に結果をシェア</span>
        </button>

        {/* ログを見るボタン */}
        <button
          onClick={onViewLog}
          className="px-6 py-3 border border-green-700 text-green-600 font-bold
                     hover:bg-green-900/30 hover:border-green-600 transition-all duration-200"
        >
          ログを見る
        </button>

        {/* トップに戻るボタン */}
        <button
          onClick={onRestart}
          className="px-6 py-3 border border-green-700 text-green-600 font-bold
                     hover:bg-green-900/30 hover:border-green-600 transition-all duration-200"
        >
          トップに戻る
        </button>
      </div>

      {/* フッター */}
      <footer className="border-t border-green-900 pt-8 text-center text-green-700 text-sm">
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://deathgame.ai.yami.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-500 underline"
          >
            Demo
          </a>
          <span className="text-green-900">|</span>
          <a
            href="https://github.com/yami-inc/ai-death-game"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-500 underline"
          >
            GitHub
          </a>
        </div>
        <p className="mt-3">
          <a
            href="https://ai.yami.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green-500"
          >
            Made by YAMI AI
          </a>
        </p>
        <p className="mt-1">MIT License</p>
      </footer>
    </div>
  );
};

/**
 * スペック表示アイテム
 */
const StatItem: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="flex flex-col items-center px-[10px]">
    <span className="text-xs md:text-sm font-bold text-green-600 tracking-wider mb-1">
      {label}
    </span>
    <span
      className="text-3xl md:text-4xl font-black text-green-400"
      style={{ textShadow: '0 0 10px rgba(51, 255, 0, 0.5)' }}
    >
      {value}
    </span>
  </div>
);

/**
 * トロフィーアイコン（SVG）
 */
const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
  </svg>
);


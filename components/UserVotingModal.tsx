'use client';

import React, { useState, useEffect } from 'react';
import { Agent, UserVote, UserVoteType } from '@/lib/types';

interface Props {
  isOpen: boolean;
  candidates: Agent[];
  onVote: (vote: UserVote) => void;
}

/**
 * ユーザー投票モーダル: GM投票を行う
 * - 先に対象を選択
 * - 「強制退場」「1票」「見守る」から選択
 * - レトロUI
 */
export const UserVotingModal: React.FC<Props> = ({ isOpen, candidates, onVote }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // モーダル開閉時にリセット
  useEffect(() => {
    if (isOpen) {
      setSelectedTargetId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVote = (type: UserVoteType) => {
    if (type === 'watch') {
      onVote({ type: 'watch', targetId: null });
    } else if (selectedTargetId) {
      onVote({ type, targetId: selectedTargetId });
    }
  };

  // 選択中のエージェント名を取得
  const selectedAgent = candidates.find((a) => a.id === selectedTargetId);
  const selectedName = selectedAgent?.name || '対象を選択';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div
        className="border-2 border-green-700 bg-black p-5 w-[90%] max-w-md shadow-[0_0_20px_rgba(0,255,0,0.1)]"
        style={{ borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="mb-4">
          <h2 className="text-green-400 font-bold text-sm font-dotgothic leading-tight text-center">
            投票フェーズ
          </h2>
          <p className="text-green-700 text-xs font-dotgothic text-center mt-1">
            ゲームマスターとして投票に介入できます
          </p>
        </div>

        {/* キャラクター選択 */}
        <div className="mb-4">
          <p className="text-green-600 text-xs font-dotgothic mb-2">対象を選択:</p>
          <div className="grid grid-cols-5 gap-2">
            {candidates.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedTargetId(agent.id)}
                className={`relative aspect-square border-2 transition-all overflow-hidden ${
                  selectedTargetId === agent.id
                    ? 'border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.3)]'
                    : 'border-green-800 hover:border-green-600'
                }`}
              >
                <img
                  src={`/agents/${agent.characterId}_default_0.jpg`}
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
                    background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 1px, transparent 1px, transparent 3px)',
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-0.5">
                  <span className="text-green-400 text-[10px] font-dotgothic block text-center truncate px-1">
                    {agent.name}
                  </span>
                </div>
                {/* 選択インジケーター */}
                {selectedTargetId === agent.id && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 flex items-center justify-center">
                    <span className="text-black text-xs font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-2">
          {/* 強制退場ボタン - 赤ベタ #FF0000、白文字 */}
          <button
            onClick={() => handleVote('force_eliminate')}
            disabled={!selectedTargetId}
            className="w-full py-3 text-sm font-dotgothic font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: '#FF0000',
              color: '#FFFFFF',
            }}
          >
            強制退場: {selectedName}
          </button>

          {/* 1票ボタン - 黄色ベタ #FFFF00、黒文字 */}
          <button
            onClick={() => handleVote('one_vote')}
            disabled={!selectedTargetId}
            className="w-full py-3 text-sm font-dotgothic font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: '#FFFF00',
              color: '#000000',
            }}
          >
            1票投じる: {selectedName}
          </button>

          {/* 見守るボタン - グリーンベタ #33ff00、黒文字 */}
          <button
            onClick={() => handleVote('watch')}
            className="w-full py-3 text-sm font-dotgothic font-bold transition-colors"
            style={{
              backgroundColor: '#33ff00',
              color: '#000000',
            }}
          >
            見守る
          </button>
        </div>

        {/* 説明 */}
        <div className="mt-4 text-green-700 text-xs font-dotgothic border border-green-900/50 bg-green-950/20 px-2 py-2 leading-relaxed rounded">
          <p>・<span style={{ color: '#FF0000' }}>強制退場</span>: 対象に+10票（確定で最多票）</p>
          <p>・<span style={{ color: '#FFFF00' }}>1票投じる</span>: 対象に+1票</p>
          <p>・<span style={{ color: '#33ff00' }}>見守る</span>: 何もしない</p>
        </div>
      </div>
    </div>
  );
};

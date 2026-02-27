'use client';

import React, { useRef, useEffect } from 'react';
import { LogEntry } from './LogEntry';
import { LogEntry as LogEntryType, LogType } from '@/lib/types';

interface AgentInfo {
  id: string;
  name: string;
}

interface Props {
  logs: LogEntryType[];
  agents: AgentInfo[];
  onBack: () => void;
}

/**
 * ログ画面: 過去ログ一覧（別ページ風）
 */
export const LogScreen: React.FC<Props> = ({ logs, agents, onBack }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 最新位置へスクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // ラウンド開始を検出し、ラウンド番号を抽出
  // 通常: 「ラウンド2……開始だ」
  // 最終: 「ラウンド3……最終戦だ」
  const extractRoundNumber = (log: LogEntryType): number | null => {
    if (log.type === LogType.MASTER && log.content.includes('ラウンド')) {
      // 「ラウンドN……開始」または「ラウンドN……最終戦」を検出
      if (log.content.includes('開始') || log.content.includes('最終戦')) {
        const match = log.content.match(/ラウンド(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      }
    }
    return null;
  };

  // 区切り線テキストかどうか判定
  const isDividerText = (content: string): boolean => {
    return content.includes('--------------------------------');
  };

  return (
    <div className="flex flex-col h-full bg-black text-green-500">
      {/* ヘッダー */}
      <div className="h-10 flex items-center border-b border-green-900">
        <div className="max-w-md mx-auto w-full flex items-center justify-between px-3">
          {/* 戻るボタン */}
          <button
            onClick={onBack}
            className="text-green-500 hover:text-green-300 transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span className="text-sm">BACK</span>
          </button>

          {/* タイトル */}
          <span className="text-green-400 font-bold text-sm tracking-wider">LOG</span>
        </div>
      </div>

      {/* ログ一覧 - ゲームページと同じ幅 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-dotgothic"
      >
        <div className="max-w-md mx-auto">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-green-800">No logs yet...</span>
            </div>
          ) : (
            logs.map((log) => {
              // 「--------------------------------」区切り線テキストはスキップ
              if (log.type === LogType.SYSTEM && isDividerText(log.content)) {
                return null;
              }

              // ラウンド開始検出
              const roundNum = extractRoundNumber(log);
              if (roundNum !== null) {
                return (
                  <React.Fragment key={log.id}>
                    {/* ROUND見出し */}
                    <div className="py-4 my-2">
                      <div className="h-px bg-white mb-3" />
                      <div className="text-center">
                        <span className="text-white font-bold text-lg tracking-wider">
                          【 ROUND {roundNum} 】
                        </span>
                      </div>
                    </div>
                    <LogEntry log={log} agents={agents} />
                  </React.Fragment>
                );
              }

              return <LogEntry key={log.id} log={log} agents={agents} />;
            })
          )}

          {/* 下部の戻るボタン */}
          <div className="mt-6 mb-8 flex justify-center">
            <button
              onClick={onBack}
              className="text-green-500 hover:text-green-300 transition-colors flex items-center gap-1 border border-green-700 px-4 py-2 hover:border-green-500"
            >
              <span>←</span>
              <span className="text-sm">戻る</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

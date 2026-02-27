'use client';

import React from 'react';
import { LogEntry as LogEntryType, LogType } from '@/lib/types';

interface AgentInfo {
  id: string;
  name: string;
}

interface Props {
  log: LogEntryType;
  agents: AgentInfo[];
}

// GM介入かどうかを判定
const isGMIntervention = (content: string): boolean => {
  return content.includes('ゲームマスターから指示') || content.includes('大人の事情') || content.includes('ルールは変えられない');
};

/**
 * ログ画面の各エントリ
 */
export const LogEntry: React.FC<Props> = ({ log, agents }) => {
  const agent = log.agentId ? agents.find((a) => a.id === log.agentId) : null;

  // システムメッセージ（白文字）
  if (log.type === LogType.SYSTEM) {
    return (
      <div className="py-2 px-4">
        <span className="text-white text-sm">{log.content}</span>
      </div>
    );
  }

  // 投票メッセージ（白文字）
  if (log.type === LogType.VOTE) {
    return (
      <div className="py-1 px-4">
        <span className="text-white text-sm">{log.content}</span>
      </div>
    );
  }

  // 司会者メッセージ（MASTER）
  if (log.type === LogType.MASTER) {
    // GM介入は赤字ボーダー・赤字
    if (isGMIntervention(log.content)) {
      return (
        <div className="my-2 mx-2 border border-red-500 rounded overflow-hidden">
          <div className="px-3 py-2 bg-black/50">
            <span className="text-red-400">{log.content}</span>
          </div>
        </div>
      );
    }
    // 通常の司会者メッセージは白文字（システムメッセージ扱い）
    return (
      <div className="py-2 px-4">
        <span className="text-white text-sm">{log.content}</span>
      </div>
    );
  }

  // 断末魔（ELIMINATION_REACTION）
  if (log.type === LogType.ELIMINATION_REACTION && agent) {
    return (
      <div className="my-2 mx-2 border border-green-500 rounded overflow-hidden">
        {/* ヘッダー: 名前のみ */}
        <div className="bg-green-950/40 px-3 py-1">
          <span className="text-green-400 font-bold text-sm">{agent.name}</span>
        </div>
        {/* 内容 */}
        <div className="px-3 py-2 bg-black/50">
          <span className="text-green-400">「{log.content}」</span>
        </div>
      </div>
    );
  }

  // 勝利コメント（VICTORY_COMMENT）
  if (log.type === LogType.VICTORY_COMMENT && agent) {
    return (
      <div className="my-2 mx-2 border border-yellow-500 rounded overflow-hidden">
        {/* ヘッダー: 名前のみ（勝者なので金色系） */}
        <div className="bg-yellow-950/40 px-3 py-1">
          <span className="text-yellow-400 font-bold text-sm">{agent.name}</span>
        </div>
        {/* 内容 */}
        <div className="px-3 py-2 bg-black/50">
          {/* 思考 */}
          {log.thought && (
            <div className="mb-1">
              <span className="text-yellow-700 text-sm">（{log.thought}）</span>
            </div>
          )}
          {/* 発言 */}
          {log.speech && (
            <div>
              <span className="text-yellow-300">「{log.speech}」</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // エージェントの発言（AGENT_TURN）
  if (log.type === LogType.AGENT_TURN && agent) {
    return (
      <div className="my-2 mx-2 border border-green-500 rounded overflow-hidden">
        {/* ヘッダー: 名前のみ */}
        <div className="bg-green-950/40 px-3 py-1">
          <span className="text-green-400 font-bold text-sm">{agent.name}</span>
        </div>

        {/* 内容 */}
        <div className="px-3 py-2 bg-black/50">
          {/* 思考 */}
          {log.thought && (
            <div className="mb-1">
              <span className="text-green-700 text-sm">（{log.thought}）</span>
            </div>
          )}

          {/* 発言 */}
          {log.speech && (
            <div>
              <span className="text-green-400">「{log.speech}」</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // フォールバック
  if (log.type === LogType.THOUGHT && agent) {
    return (
      <div className="py-1 px-4">
        <span className="text-gray-500 text-sm">{agent.name}: （{log.content}）</span>
      </div>
    );
  }

  if (log.type === LogType.SPEECH && agent) {
    return (
      <div className="py-1 px-4">
        <span className="text-green-400">{agent.name}: 「{log.content}」</span>
      </div>
    );
  }

  return null;
};

'use client';

import React from 'react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { FocusArea } from './FocusArea';
import { DialogArea, ContentPhase, DialogPhase } from './DialogArea';
import { Expression } from '@/lib/types';

interface AgentData {
  id: string;
  characterId: string;
  name: string;
  isAlive: boolean;
}

interface VoteInfo {
  votedFor?: string;
  receivedVotes: number;
}

interface GmVoteAnimation {
  targetId: string;
  addVotes: number;
}

interface CurrentDisplay {
  agentId: string | null;
  agentName: string | null;
  characterId: string | null;
  expression: Expression;
  thought: string;
  speech: string;
  isAlive: boolean;
  isMaster?: boolean;
  isEliminationReaction?: boolean; // 断末魔ログかどうか
  isExecuting?: boolean; // 処刑演出中（fainted画像表示中、タップで次へ）
}

interface Props {
  round: number;
  turn: number;
  agents: AgentData[];
  currentDisplay: CurrentDisplay;
  contentPhase: ContentPhase; // 現在表示するコンテンツフェーズ（親が制御）
  contentKey?: string; // 一意のコンテンツキー（変更時にタイプライターをリセット）
  isTyping: boolean;
  waitingForTap: boolean;
  mouthOpen: boolean;
  isThinking?: boolean; // 「（考え中）」表示モード（API待ち）
  isVoting?: boolean; // 「（投票中...）」表示モード（投票API待ち）
  voteResults?: Record<string, VoteInfo>; // 投票結果情報
  showVoteInfo?: boolean; // 投票情報を表示するか
  gmVoteAnimation?: GmVoteAnimation | null; // GM投票アニメーション
  onLogClick: () => void;
  onTap: () => void;
  onTypingComplete: () => void;
  onMouthOpen: (open: boolean) => void;
  onDialogPhaseChange?: (phase: DialogPhase) => void; // ダイアログフェーズ変更通知
}

/**
 * メイン画面: 全体レイアウト
 * - Header (ROUND + LOGボタン)
 * - StatusBar (5体の小ポートレート)
 * - FocusArea (大ポートレート)
 * - DialogArea (テキスト表示 + タップ領域)
 */
export const MainScreen: React.FC<Props> = ({
  round,
  turn,
  agents,
  currentDisplay,
  contentPhase,
  contentKey,
  isTyping,
  waitingForTap,
  mouthOpen,
  isThinking = false,
  isVoting = false,
  voteResults = {},
  showVoteInfo = false,
  gmVoteAnimation = null,
  onLogClick,
  onTap,
  onTypingComplete,
  onMouthOpen,
  onDialogPhaseChange,
}) => {
  return (
    <div className="flex flex-col h-full bg-black text-green-500 max-w-2xl mx-auto">
      {/* ヘッダー: 約5% */}
      <Header round={round} turn={turn} onLogClick={onLogClick} />

      {/* ステータスバー: 約12% */}
      <StatusBar
        agents={agents}
        speakingAgentId={currentDisplay.agentId}
        voteResults={voteResults}
        showVoteInfo={showVoteInfo}
        gmVoteAnimation={gmVoteAnimation}
      />

      {/* フォーカスエリア: 16:9比率で横長に */}
      <div className="h-[30%] sm:h-[35%]">
        <FocusArea
          characterId={currentDisplay.characterId}
          expression={currentDisplay.expression}
          mouthOpen={mouthOpen}
          isAlive={currentDisplay.isAlive}
        />
      </div>

      {/* ダイアログエリア: 約43% */}
      <div className="flex-1 min-h-0">
        <DialogArea
          agentName={currentDisplay.agentName}
          agentId={currentDisplay.agentId}
          thought={currentDisplay.thought}
          speech={currentDisplay.speech}
          contentPhase={contentPhase}
          contentKey={contentKey}
          isTyping={isTyping}
          waitingForTap={waitingForTap}
          isMaster={currentDisplay.isMaster}
          isEliminationReaction={currentDisplay.isEliminationReaction}
          isThinking={isThinking}
          isVoting={isVoting}
          isExecuting={currentDisplay.isExecuting}
          onTap={onTap}
          onTypingComplete={onTypingComplete}
          onMouthOpen={onMouthOpen}
          onPhaseChange={onDialogPhaseChange}
        />
      </div>
    </div>
  );
};

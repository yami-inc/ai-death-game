'use client';

import React, { useMemo } from 'react';
import { MiniPortrait } from './MiniPortrait';

interface AgentData {
  id: string;
  characterId: string;
  name: string;
  isAlive: boolean;
}

interface VoteInfo {
  votedFor?: string;      // 投票先ID
  receivedVotes: number;  // 獲得票数
}

interface GmVoteAnimation {
  targetId: string;
  addVotes: number;
}

interface Props {
  agents: AgentData[];
  speakingAgentId: string | null;
  voteResults?: Record<string, VoteInfo>;  // 投票情報
  showVoteInfo?: boolean;                  // 投票情報を表示するか
  gmVoteAnimation?: GmVoteAnimation | null; // GM投票アニメーション
}

/**
 * ステータスバー: 5体のエージェントを小さく横並びに表示
 * - 生存者は左側、退場者は右側に固定
 * - 投票フェーズでは票数・投票先を表示
 */
export const StatusBar: React.FC<Props> = ({
  agents,
  speakingAgentId,
  voteResults = {},
  showVoteInfo = false,
  gmVoteAnimation = null,
}) => {
  // 生存者を左側、退場者を右側に並べる（元の順序を保持しつつ）
  const sortedAgents = useMemo(() => {
    const alive = agents.filter((a) => a.isAlive);
    const dead = agents.filter((a) => !a.isAlive);
    return [...alive, ...dead];
  }, [agents]);

  // IDから名前を取得するヘルパー
  const getNameById = (id: string): string => {
    const agent = agents.find((a) => a.id === id);
    return agent?.name || '';
  };

  return (
    <div className="flex items-center justify-around px-1 py-3 border-b border-green-900 bg-black">
      {sortedAgents.map((agent) => {
        const voteInfo = voteResults[agent.id];
        const votedForName = voteInfo?.votedFor ? getNameById(voteInfo.votedFor) : undefined;

        return (
          <MiniPortrait
            key={agent.id}
            agentId={agent.id}
            characterId={agent.characterId}
            name={agent.name}
            isAlive={agent.isAlive}
            isSpeaking={agent.id === speakingAgentId}
            receivedVotes={voteInfo?.receivedVotes || 0}
            votedForName={votedForName}
            showVoteInfo={showVoteInfo}
            gmVoteAnimation={gmVoteAnimation}
          />
        );
      })}
    </div>
  );
};

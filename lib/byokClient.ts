/**
 * BYOK クライアントサイド Gemini API アダプター
 *
 * BYOKユーザーのブラウザから直接 @google/genai SDK を使って
 * Gemini API を呼び出す。サーバーサイドの gemini.ts と同じ
 * プロンプト・スキーマ（prompts.ts）を使用し、同じレスポンス型を返す。
 *
 * - LLM Guard: スキップ（BYOKユーザーは自身のAPIクォータを使用）
 * - フォールバック: primary → fallback → テキストフォールバック
 * - APIキーはSDKに一時的に渡すのみ（ログ出力・永続化しない）
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  Agent,
  DiscussionBatchItem,
  DiscussionBatchResponse,
  Expression,
  LogEntry,
  VoteBatchItemResponse,
  VoteBatchResponse,
} from './types';
import { MASTER_PROFILE } from './constants';
import { createDefaultPromptContext, type DynamicPromptContext } from './ruleConfig';
import { parseStreamResponse } from './turnResponseParser';
import {
  buildDiscussionPrompt,
  buildDiscussionBatchPrompt,
  buildVoteBatchPrompt,
  buildEliminationReactionPrompt,
  buildVictoryCommentPrompt,
  buildDualVictoryCommentPrompt,
  buildModerationPrompt,
  looksLikeHostSelfQuestion,
  normalizeExpression,
  DISCUSSION_BATCH_SCHEMA,
  VOTE_BATCH_SCHEMA,
  MODERATION_SCHEMA,
} from './prompts';

// ============================================
// モデル設定
// ============================================

const BYOK_PRIMARY_MODEL = 'gemini-3-flash-preview';
const BYOK_FALLBACK_MODEL = 'gemini-2.5-flash';

function getByokClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

/** サーバー側 modelThinkingConfig.ts と同じロジック */
function getThinkingConfigForModel(modelName: string) {
  if (modelName.startsWith('gemini-2.5')) {
    return { thinkingBudget: 0 };
  }
  if (modelName === 'gemini-3-flash-preview') {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  return undefined;
}

/** エラーオブジェクトからAPIキー等の機密情報を除去した安全なメッセージを抽出する */
function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // APIキー・トークン等の機密文字列を一律マスク
    return error.message.replace(/[A-Za-z0-9_-]{20,}/g, '***');
  }
  return 'Unknown error';
}

/**
 * Primary → Fallback → テキストフォールバックの3段階で試行する
 * ゲーム継続を最優先とし、全失敗時はフォールバック結果を返す
 *
 * @param onFallbackUsed - 全モデル失敗時に呼ばれるコールバック（エラー通知用）
 */
async function withModelFallback<T>(
  apiKey: string,
  fn: (ai: GoogleGenAI, model: string) => Promise<T>,
  fallbackResult: T,
  onFallbackUsed?: (errorMessage: string) => void
): Promise<T> {
  const ai = getByokClient(apiKey);
  try {
    return await fn(ai, BYOK_PRIMARY_MODEL);
  } catch (primaryError) {
    try {
      return await fn(ai, BYOK_FALLBACK_MODEL);
    } catch (fallbackError) {
      const fallbackMsg = safeErrorMessage(fallbackError);
      onFallbackUsed?.(`Gemini API エラー: ${fallbackMsg}`);
      return fallbackResult;
    }
  }
}

// ============================================
// 議論個別生成（BYOK個別モード用）
// ============================================

export async function byokDiscussionTurn(
  params: {
    agent: Agent;
    allAgents: Agent[];
    recentLogs: LogEntry[];
    promptContext?: DynamicPromptContext;
    onError?: (msg: string) => void;
  },
  apiKey: string
): Promise<{
  thought: string;
  speech: string;
  thoughtExpression: Expression;
  speechExpression: Expression;
  rawText: string;
}> {
  const { agent, allAgents, recentLogs, promptContext } = params;
  const ctx = promptContext || createDefaultPromptContext();
  const prompt = buildDiscussionPrompt(agent, recentLogs, allAgents, ctx, { verbose: true });

  return withModelFallback(
    apiKey,
    async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: getThinkingConfigForModel(model),
        },
      });

      const text = response.text?.trim() || '';
      const parsed = parseStreamResponse(text);

      return {
        thought: parsed.internal_thought || '……',
        speech: parsed.external_speech || '……',
        thoughtExpression: parsed.internal_expression || 'default',
        speechExpression: parsed.external_expression || 'default',
        rawText: text,
      };
    },
    {
      thought: '……',
      speech: '……',
      thoughtExpression: 'default' as Expression,
      speechExpression: 'default' as Expression,
      rawText: '[default]……|||[default]……',
    },
    params.onError
  );
}

// ============================================
// 議論バッチ生成
// ============================================

export async function byokDiscussionBatch(
  params: {
    aliveAgents: Agent[];
    allAgents: Agent[];
    recentLogs: LogEntry[];
    round: number;
    turnInRound: number;
    startSpeakerIndex: number;
    generationEpoch: number;
    promptContext?: DynamicPromptContext;
    onError?: (msg: string) => void;
  },
  apiKey: string
): Promise<DiscussionBatchResponse> {
  const {
    aliveAgents, allAgents, recentLogs, round, turnInRound,
    startSpeakerIndex, generationEpoch, promptContext,
  } = params;

  const speakers = aliveAgents.slice(startSpeakerIndex);
  if (speakers.length === 0) {
    return { generationEpoch, items: [], consumedInstructionTurns: 0 };
  }

  const ctx = promptContext || createDefaultPromptContext();
  const prompt = buildDiscussionBatchPrompt(
    aliveAgents, allAgents, recentLogs, round, turnInRound, startSpeakerIndex, ctx,
    { verbose: true }
  );

  const fallbackItems: DiscussionBatchItem[] = speakers.map((agent) => ({
    agent_id: agent.id,
    thought: '……',
    speech: '……',
    thought_expression: 'default' as Expression,
    speech_expression: 'default' as Expression,
  }));

  return withModelFallback(
    apiKey,
    async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: DISCUSSION_BATCH_SCHEMA,
          thinkingConfig: getThinkingConfigForModel(model),
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text) as { items?: unknown[] };

      const parsedMap = new Map<string, DiscussionBatchItem>();
      if (Array.isArray(parsed.items)) {
        for (const item of parsed.items) {
          const it = item as Record<string, unknown>;
          if (
            it &&
            typeof it.agent_id === 'string' &&
            typeof it.thought === 'string' &&
            typeof it.speech === 'string'
          ) {
            parsedMap.set(it.agent_id, {
              agent_id: it.agent_id,
              thought: it.thought,
              speech: it.speech,
              thought_expression: normalizeExpression(it.thought_expression),
              speech_expression: normalizeExpression(it.speech_expression),
            });
          }
        }
      }

      const normalizedItems: DiscussionBatchItem[] = speakers.map((agent) => {
        const p = parsedMap.get(agent.id);
        if (p) return p;
        return {
          agent_id: agent.id,
          thought: '……',
          speech: '……',
          thought_expression: 'default' as Expression,
          speech_expression: 'default' as Expression,
        };
      });

      return {
        generationEpoch,
        items: normalizedItems,
        consumedInstructionTurns: speakers.length,
      };
    },
    { generationEpoch, items: fallbackItems, consumedInstructionTurns: 0 },
    params.onError
  );
}

// ============================================
// 投票バッチ生成
// ============================================

export async function byokVoteBatch(
  params: {
    voters: Agent[];
    candidates: Agent[];
    allAgents: Agent[];
    recentLogs: LogEntry[];
    promptContext?: DynamicPromptContext;
    onError?: (msg: string) => void;
  },
  apiKey: string
): Promise<VoteBatchResponse> {
  const { voters, candidates, allAgents, recentLogs, promptContext } = params;

  if (voters.length === 0) {
    return { votes: [] };
  }

  const ctx = promptContext || createDefaultPromptContext();
  const prompt = buildVoteBatchPrompt(voters, candidates, recentLogs, allAgents, ctx, { verbose: true });
  const fallbackTargetId = candidates[0]?.id || voters[0].id;

  return withModelFallback(
    apiKey,
    async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: VOTE_BATCH_SCHEMA,
          thinkingConfig: getThinkingConfigForModel(model),
        },
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text) as VoteBatchResponse;

      const candidateIds = new Set(candidates.map((c) => c.id));
      const parsedMap = new Map<string, VoteBatchItemResponse>();

      if (Array.isArray(parsed.votes)) {
        for (const vote of parsed.votes) {
          if (
            vote &&
            typeof vote.voter_id === 'string' &&
            typeof vote.vote_target_id === 'string' &&
            typeof vote.internal_reasoning === 'string'
          ) {
            parsedMap.set(vote.voter_id, vote);
          }
        }
      }

      const normalizedVotes: VoteBatchItemResponse[] = voters.map((voter) => {
        const parsedVote = parsedMap.get(voter.id);
        const hasValidTarget =
          !!parsedVote &&
          (candidateIds.has(parsedVote.vote_target_id) || parsedVote.vote_target_id === voter.id);

        return {
          voter_id: voter.id,
          vote_target_id: hasValidTarget ? parsedVote!.vote_target_id : fallbackTargetId,
          internal_reasoning: parsedVote?.internal_reasoning || '処理エラー',
          internal_expression: 'default',
        };
      });

      return { votes: normalizedVotes };
    },
    {
      votes: voters.map((voter) => ({
        voter_id: voter.id,
        vote_target_id: fallbackTargetId,
        internal_reasoning: '処理エラー',
        internal_expression: 'default',
      })),
    },
    params.onError
  );
}

// ============================================
// 断末魔（退場リアクション）
// ============================================

export async function byokEliminationReaction(
  params: {
    agent: Agent;
    eliminatedAgents: { id: string; name: string }[];
    logs: LogEntry[];
    allAgents: Agent[];
    selfVoted?: boolean;
    gmVote?: { type: 'force_eliminate' | 'one_vote' | 'watch'; targetId: string | null };
    onError?: (msg: string) => void;
  },
  apiKey: string
): Promise<{ reaction: string }> {
  const { agent, eliminatedAgents, logs, allAgents, selfVoted = false, gmVote } = params;
  const prompt = buildEliminationReactionPrompt(
    agent, eliminatedAgents, logs, allAgents, selfVoted, gmVote, { verbose: true }
  );

  return withModelFallback(
    apiKey,
    async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: getThinkingConfigForModel(model),
        },
      });

      const text = response.text?.trim() || 'なぜだ...';
      const cleanedText = text.replace(/^[「『"']+|[」』"']+$/g, '');
      return { reaction: cleanedText };
    },
    { reaction: '……' },
    params.onError
  );
}

// ============================================
// 勝利コメント
// ============================================

export interface ByokVictoryCommentResponse {
  thought: string;
  speech: string;
  thoughtExpression: Expression;
  speechExpression: Expression;
}

export async function byokVictoryComment(
  params: {
    agent: Agent;
    logs: LogEntry[];
    allAgents: Agent[];
    coSurvivor?: Agent;
    onError?: (msg: string) => void;
  },
  apiKey: string
): Promise<ByokVictoryCommentResponse> {
  const { agent, logs, allAgents, coSurvivor } = params;

  const prompt = coSurvivor
    ? buildDualVictoryCommentPrompt(agent, coSurvivor, logs, allAgents, { verbose: true })
    : buildVictoryCommentPrompt(agent, logs, allAgents, { verbose: true });

  return withModelFallback(
    apiKey,
    async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: getThinkingConfigForModel(model),
        },
      });

      const text = response.text?.trim() || '';
      const parsed = parseStreamResponse(text);

      return {
        thought: parsed.internal_thought || '……勝った。本当に勝ったんだ。',
        speech: parsed.external_speech || '……勝った。',
        thoughtExpression: parsed.internal_expression || 'happy',
        speechExpression: parsed.external_expression || 'happy',
      };
    },
    {
      thought: coSurvivor
        ? `……${coSurvivor.name}と一緒に生き残った……`
        : '……勝った。本当に勝ったんだ。',
      speech: coSurvivor
        ? `……${coSurvivor.name}、私たち生き残ったね。`
        : '……勝った。',
      thoughtExpression: 'happy',
      speechExpression: 'happy',
    },
    params.onError
  );
}

// ============================================
// GM介入モデレーション
// ============================================

export type ByokModerationCategory = 'safe' | 'unsafe' | 'rule_change';
export type ByokModerationResponseMode = 'broadcast_instruction' | 'host_self_answer';

export interface ByokModerationResult {
  category: ByokModerationCategory;
  reason: string;
  responseMode: ByokModerationResponseMode;
  masterResponse: string;
}

export async function byokModerateIntervention(
  params: {
    instruction: string;
    participants?: { name: string; isAlive: boolean }[];
    onError?: (msg: string) => void;
  },
  apiKey: string
): Promise<ByokModerationResult> {
  const { instruction, participants } = params;
  const forcedHostSelfAnswer = looksLikeHostSelfQuestion(instruction);

  const participantsInfo = participants
    ? participants.map((p) => `- ${p.name}${p.isAlive ? '' : '（退場済み）'}`).join('\n')
    : '（参加者情報なし）';

  const prompt = buildModerationPrompt(instruction, participantsInfo, { verbose: true });

  return withModelFallback(
    apiKey,
    async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: MODERATION_SCHEMA,
          thinkingConfig: getThinkingConfigForModel(model),
        },
      });

      const text = response.text || '{}';
      const result = JSON.parse(text) as {
        category: ByokModerationCategory;
        responseMode: ByokModerationResponseMode;
        reason: string;
        masterResponse: string;
      };

      const normalizedMode: ByokModerationResponseMode =
        result.responseMode === 'host_self_answer' ? 'host_self_answer' : 'broadcast_instruction';

      const responseMode: ByokModerationResponseMode =
        result.category === 'safe' && forcedHostSelfAnswer ? 'host_self_answer' : normalizedMode;

      return {
        category: result.category,
        reason: result.reason,
        responseMode,
        masterResponse: result.masterResponse,
      };
    },
    {
      category: 'safe',
      reason: 'フォールバック',
      responseMode: forcedHostSelfAnswer ? 'host_self_answer' : 'broadcast_instruction',
      masterResponse: forcedHostSelfAnswer
        ? `……私のことか。好物は${MASTER_PROFILE.likes}だ。`
        : `ゲームマスターから指示だ。……「${instruction}」……だそうだ。`,
    },
    params.onError
  );
}

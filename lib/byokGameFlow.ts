/**
 * BYOK 議論フェーズの個別生成ロジック
 *
 * store.ts の processDiscussionTurn() から BYOK パスで呼ばれる。
 * 1人のエージェントの発言を生成し、ログに追加して UI を更新する。
 * discussionBatchQueue は使わず、毎タップ1APIコールで1人分を生成する。
 */

import { LogType, GamePhase } from './types';
import type { Expression } from './types';
import { MASTER_CHARACTER, MASTER_LINES } from './constants';
import { gameConfig } from './config';
import { useGameStore } from './store';

type GameStore = ReturnType<typeof useGameStore.getState>;
type SetFn = (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void;

const RECENT_LOGS_LIMIT_FOR_AI = 15;

/**
 * BYOK議論ターン処理（1人分の個別生成）
 *
 * @param get - Zustand store の get()
 * @param set - Zustand store の set()
 * @param signal - AbortSignal（キャンセル用）
 */
export async function byokProcessDiscussionTurn(
  get: () => GameStore,
  set: SetFn,
  signal?: AbortSignal
): Promise<void> {
  const {
    agents,
    logs,
    currentTurnIndex,
    phase,
    addLog,
    updateLogStream,
    finalizeLogStream,
    setAgentSpeaking,
    shuffleAgents,
  } = get();

  if (phase !== GamePhase.DISCUSSION) return;

  const aliveAgents = agents.filter((a) => a.isAlive);
  const turnsPerRound = gameConfig.getValue('turnsPerRound');
  const totalTurns = aliveAgents.length * turnsPerRound;

  // 全員が指定回数発言完了
  if (currentTurnIndex >= totalTurns) {
    set({ discussionComplete: true, isProcessing: false });
    return;
  }

  // ターン周回時（全員1回発言完了後）: 司会アナウンスを表示して return
  if (currentTurnIndex > 0 && currentTurnIndex % aliveAgents.length === 0) {
    const expectedTurnInRound = Math.floor(currentTurnIndex / aliveAgents.length) + 1;
    const { currentTurnInRound, byokGmInstruction } = get();

    if (currentTurnInRound < expectedTurnInRound) {
      set({ currentTurnInRound: expectedTurnInRound });
      addLog(LogType.MASTER, MASTER_LINES.NEXT_TURN(expectedTurnInRound), MASTER_CHARACTER.id);
      shuffleAgents();
      // ターン周回完了時に GM 指示をクリア（次の周回のログに含まれるため不要）
      if (byokGmInstruction) {
        set({ byokGmInstruction: null });
      }
      set({ isProcessing: false });
      return;
    }
  }

  // 話者を特定
  const speakerIndex = currentTurnIndex % aliveAgents.length;
  const speaker = aliveAgents[speakerIndex];
  if (!speaker) {
    set({ isProcessing: false });
    return;
  }

  // Placeholder ログ作成
  set({ isProcessing: true });
  const placeholderLogId = addLog(LogType.AGENT_TURN, '', speaker.id, {
    thought: '',
    speech: '',
    thoughtExpression: 'default' as Expression,
    speechExpression: 'default' as Expression,
    isStreaming: true,
    rawStreamText: '',
  });
  setAgentSpeaking(speaker.id, true);

  const removePlaceholder = () => {
    set((state) => ({
      logs: state.logs.filter((l) => l.id !== placeholderLogId),
    }));
  };

  try {
    if (signal?.aborted) {
      removePlaceholder();
      setAgentSpeaking(speaker.id, false);
      set({ isProcessing: false });
      return;
    }

    const { byokApiKey, byokGmInstruction } = get();
    if (!byokApiKey) {
      removePlaceholder();
      setAgentSpeaking(speaker.id, false);
      set({ isProcessing: false });
      return;
    }

    // プロンプトコンテキスト構築
    const promptContext = byokGmInstruction
      ? {
          gmInstructions: byokGmInstruction,
          specialRules: [] as string[],
          agentModifiers: {} as Record<string, string>,
          roundContext: '',
        }
      : undefined;

    const recentLogs = logs.slice(-RECENT_LOGS_LIMIT_FOR_AI);

    // 個別生成 API 呼び出し
    const { byokDiscussionTurn } = await import('./byokClient');
    const result = await byokDiscussionTurn(
      {
        agent: speaker,
        allAgents: agents,
        recentLogs,
        promptContext,
        onError: (msg: string) => get().setByokError(msg),
      },
      byokApiKey
    );

    // キャンセルチェック
    if (signal?.aborted) {
      removePlaceholder();
      setAgentSpeaking(speaker.id, false);
      set({ isProcessing: false });
      return;
    }

    // Placeholder を結果で更新
    const rawText = result.rawText || `[${result.thoughtExpression}]${result.thought}|||[${result.speechExpression}]${result.speech}`;
    updateLogStream(placeholderLogId, rawText);
    finalizeLogStream(placeholderLogId);
    setAgentSpeaking(speaker.id, false);

    // 状態更新
    const nextTurnIndex = currentTurnIndex + 1;
    const isDiscussionComplete = nextTurnIndex >= totalTurns;

    set((state) => ({
      currentTurnIndex: nextTurnIndex,
      isProcessing: false,
      isAnimating: true,
      currentAnimatingLogId: placeholderLogId,
      discussionComplete: isDiscussionComplete ? true : state.discussionComplete,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      removePlaceholder();
      setAgentSpeaking(speaker.id, false);
      set({ isProcessing: false });
      return;
    }

    // フォールバック: エラーテキストで placeholder 更新
    setAgentSpeaking(speaker.id, false);
    const errorRawText = '[default]……|||[default]……';
    updateLogStream(placeholderLogId, errorRawText);
    finalizeLogStream(placeholderLogId);

    const nextTurnIndex = currentTurnIndex + 1;
    const isDiscussionComplete = nextTurnIndex >= totalTurns;

    set((state) => ({
      currentTurnIndex: nextTurnIndex,
      isProcessing: false,
      isAnimating: true,
      currentAnimatingLogId: placeholderLogId,
      discussionComplete: isDiscussionComplete ? true : state.discussionComplete,
    }));
  }
}

'use client';

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { flushSync } from 'react-dom';
import { useGameStore } from '@/lib/store';
import { GamePhase, LogType, Expression, UserVote } from '@/lib/types';
import {
  isTapWait,
  isTyping as isTypingState,
  isThinking as isThinkingState,
  isVoteFetching,
  isExecuting,
  getStateName,
  getTypingCompleteState,
} from '@/lib/uiState';
import {
  MainScreen,
  LogScreen,
  MemberSelectionOverlay,
  GameOverScreen,
  DialogPhase,
  ContentPhase,
} from '@/components';
import { InterventionModal } from '@/components/InterventionModal';
import { UserVotingModal } from '@/components/UserVotingModal';
import { audioService } from '@/lib/audio';
import { MASTER_CHARACTER } from '@/lib/constants';
import { gameConfig } from '@/lib/config';
import { preloadCharacterImagesWithDecode } from '@/lib/imagePreloader';

/**
 * 画面フェーズ（UI遷移の状態管理）
 * - member-selection: 参加者選定画面
 * - game: ゲーム本編
 * - log: ログ閲覧
 * - game-over: ゲーム終了画面
 */
type ScreenPhase = 'member-selection' | 'game' | 'log' | 'game-over';

/**
 * ゲームページ
 * 疎結合設計: 明示的なフェーズ遷移
 * 先読み(prefetch)は廃止 - Gemini 3 Flashの高速化により不要
 */
export default function GamePage() {
  const router = useRouter();

  // ============================================
  // 全てのフックを条件分岐の前に配置（Reactのルール）
  // ============================================
  const {
    phase,
    round,
    currentTurnInRound,
    agents,
    logs,
    isProcessing,
    discussionComplete,
    votingFetchComplete,
    currentTurnIndex,
    voteResults,
    eliminationQueue,
    currentEliminationIndex,
    eliminationReactionsFetched,
    winnerIds,
    victoryCommentsFetched,
    currentVictoryIndex,
    initializeGame,
    startGame,
    processDiscussionTurn,
    advanceToVoting,
    advanceToResolution,
    advanceToNextRound,
    showNextVoteLog,
    showNextEliminationReaction,
    startElimination,
    finishElimination,
    executingAgentId,
    endGame,
    addLog,
    setAgentMouthOpen,
    shuffleSelectedAgents,
    // ユーザー投票関連
    setUserVote,
    showGmVoteLog,
    fetchAllVotesParallel,
    // 統一UI状態マシン
    uiState,
    setUIState,
    // BYOK エラー通知
    byokError,
    setByokError,
  } = useGameStore();

  // UI状態
  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('member-selection');
  const [previousScreenPhase, setPreviousScreenPhase] = useState<ScreenPhase>('game');
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  const [isInterventionOpen, setIsInterventionOpen] = useState(false);
  const [interventionUsedKey, setInterventionUsedKey] = useState<string>('');
  const [isFetchingVictoryComment, setIsFetchingVictoryComment] = useState(false);
  const [victoryCommentDisplayed, setVictoryCommentDisplayed] = useState(false);
  const [dialogPhase, setDialogPhase] = useState<DialogPhase>('idle');
  const [gmVoteAnimation, setGmVoteAnimation] = useState<{ targetId: string; addVotes: number } | null>(null);
  const [contentPhase, setContentPhase] = useState<ContentPhase>('speech');
  const [isAssetPreparing, setIsAssetPreparing] = useState(false);
  const [isNavigatingToTop, setIsNavigatingToTop] = useState(false);

  // ログ追跡用ref
  const prevLogsLengthRef = useRef(0);
  const hasStartedRef = useRef(false);
  const pendingLogIndexRef = useRef(-1); // ストリーム完了待ちのログインデックス

  // AbortController refs（キャンセル可能な操作用）
  const currentTurnAbortRef = useRef<AbortController | null>(null);

  // ============================================
  // UIState から派生する状態
  // ============================================
  const isTyping = isTypingState(uiState);
  const waitingForTap = isTapWait(uiState);
  const isThinking = isThinkingState(uiState);
  const isVoting = isVoteFetching(uiState);

  // agentIndexを取得するヘルパー
  const getAgentIndex = useCallback(() => {
    if ('agentIndex' in uiState) return uiState.agentIndex;
    return currentTurnIndex;
  }, [uiState, currentTurnIndex]);

  // 現在表示中のログ
  const currentLog = currentLogIndex >= 0 ? logs[currentLogIndex] : null;
  const isMasterLog = currentLog?.type === LogType.MASTER;
  const isEliminationReactionLog = currentLog?.type === LogType.ELIMINATION_REACTION;
  const isVictoryCommentLog = currentLog?.type === LogType.VICTORY_COMMENT;
  const currentAgent = currentLog?.agentId && !isMasterLog
    ? agents.find((a) => a.id === currentLog.agentId)
    : null;

  // 「考え中」または「投票中」の場合のエージェント
  const pendingAgent = pendingAgentId ? agents.find((a) => a.id === pendingAgentId) : null;
  // DISCUSSION_THINKING中は「次のログ（実際に生成されたAGENT_TURN）」から表示対象を決定する
  const discussionThinkingAgent = useMemo(() => {
    if (uiState.type !== 'DISCUSSION_THINKING') return null;

    const findAgentFromLog = (logIndex: number) => {
      if (logIndex < 0 || logIndex >= logs.length) return null;
      const log = logs[logIndex];
      if (!log || log.type !== LogType.AGENT_TURN || !log.agentId) return null;
      return agents.find((a) => a.id === log.agentId) ?? null;
    };

    // 1. 明示的に待機しているログインデックスがあればそれを最優先
    if (pendingLogIndexRef.current >= 0) {
      const agent = findAgentFromLog(pendingLogIndexRef.current);
      if (agent) return agent;
    }

    // 2. 現在表示中ログの次（= 生成済みの次話者ログ）を参照
    if (currentLogIndex >= 0 && currentLogIndex < logs.length - 1) {
      const agent = findAgentFromLog(currentLogIndex + 1);
      if (agent) return agent;
    }

    return null;
  }, [uiState.type, logs, currentLogIndex, agents]);

  // 勝利コメント取得中は、pendingAgentId反映前でも現在の勝者を表示対象にする
  const victoryFetchingAgent = useMemo(() => {
    if (uiState.type !== 'GAME_OVER_FETCHING') return null;
    const currentWinnerId = winnerIds[currentVictoryIndex];
    if (currentWinnerId) {
      const winner = agents.find((a) => a.id === currentWinnerId);
      if (winner) return winner;
    }
    // 稀にwinnerIds参照前のフレームがあるため、生存者の先頭にフォールバックしてLOADING表示を防ぐ
    return agents.find((a) => a.isAlive) ?? null;
  }, [uiState.type, winnerIds, currentVictoryIndex, agents]);

  const thinkingDisplayAgent = uiState.type === 'DISCUSSION_THINKING'
    ? discussionThinkingAgent
    : (pendingAgent ?? victoryFetchingAgent);

  // 処刑演出中のエージェント
  const executingAgent = executingAgentId ? agents.find((a) => a.id === executingAgentId) : null;

  // 現在表示データ（MASTERログの場合は司会キャラ情報を使用）
  // 「考え中」状態の場合は次のエージェント情報を表示
  // 「投票中」状態の場合はMASTER情報を表示
  // 「断末魔」ログの場合はエージェント情報 + painful表情
  // 「処刑演出中」の場合はfainted画像を表示
  const currentDisplay = executingAgent
    ? {
        // 処刑演出中: fainted画像を表示
        agentId: executingAgent.id,
        agentName: executingAgent.name,
        characterId: executingAgent.characterId,
        expression: 'fainted' as Expression,
        thought: '',
        speech: '',
        isAlive: false, // fainted画像を表示するためfalse
        isMaster: false,
        isEliminationReaction: false,
        isVictoryComment: false,
        isExecuting: true, // 処刑演出中フラグ
      }
    : isVoting
    ? {
        agentId: MASTER_CHARACTER.id,
        agentName: MASTER_CHARACTER.name,
        characterId: MASTER_CHARACTER.characterId,
        expression: 'default' as Expression,
        thought: '',
        speech: '',
        isAlive: true,
        isMaster: true,
        isEliminationReaction: false,
        isVictoryComment: false,
        isExecuting: false,
      }
    : isThinking && thinkingDisplayAgent
    ? {
        agentId: thinkingDisplayAgent.id,
        agentName: thinkingDisplayAgent.name,
        characterId: thinkingDisplayAgent.characterId,
        expression: (uiState.type === 'GAME_OVER_FETCHING' ? 'happy' : 'painful') as Expression,
        thought: '',
        speech: '',
        isAlive: thinkingDisplayAgent.isAlive,
        isMaster: false,
        isEliminationReaction: false,
        isVictoryComment: false,
        isExecuting: false,
      }
    : isThinking
    ? {
        // THINKING中に表示対象が未確定な瞬間は、前話者を再表示せずローディング表示にフォールバック
        agentId: null,
        agentName: null,
        characterId: null,
        expression: 'default' as Expression,
        thought: '',
        speech: '',
        isAlive: true,
        isMaster: false,
        isEliminationReaction: false,
        isVictoryComment: false,
        isExecuting: false,
      }
    : isVictoryCommentLog && currentAgent
    ? {
        // 勝利コメントログ: エージェント情報 + 思考+発言（AGENT_TURNと同じ形式）
        agentId: currentAgent.id,
        agentName: currentAgent.name,
        characterId: currentAgent.characterId,
        expression: (currentLog?.thoughtExpression ?? currentLog?.speechExpression ?? 'happy') as Expression,
        thought: currentLog?.thought ?? '',
        speech: currentLog?.speech ?? '',
        isAlive: true,
        isMaster: false,
        isEliminationReaction: false,
        isVictoryComment: true,
        isExecuting: false,
      }
    : isEliminationReactionLog && currentAgent
    ? {
        // 断末魔ログ: エージェント情報 + painful表情 + 発言のみ（思考なし）
        agentId: currentAgent.id,
        agentName: currentAgent.name,
        characterId: currentAgent.characterId,
        expression: 'painful' as Expression,
        thought: '', // 断末魔は思考なし
        speech: currentLog?.content ?? '',
        isAlive: true, // まだ生きている状態で表示
        isMaster: false,
        isEliminationReaction: true,
        isVictoryComment: false,
        isExecuting: false,
      }
    : isMasterLog
    ? {
        agentId: MASTER_CHARACTER.id,
        agentName: MASTER_CHARACTER.name,
        characterId: MASTER_CHARACTER.characterId,
        expression: 'default' as Expression,
        thought: '',
        speech: currentLog?.content ?? '',
        isAlive: true,
        isMaster: true,
        isEliminationReaction: false,
        isVictoryComment: false,
        isExecuting: false,
      }
    : {
        agentId: currentAgent?.id ?? null,
        agentName: currentAgent?.name ?? null,
        characterId: currentAgent?.characterId ?? null,
        // ダイアログフェーズに応じてログの表情を使用
        // thought/waitThought: thoughtExpression、speech/done: speechExpression
        expression: (
          dialogPhase === 'thought' || dialogPhase === 'waitThought'
            ? (currentLog?.thoughtExpression ?? 'default')
            : dialogPhase === 'speech' || dialogPhase === 'done'
            ? (currentLog?.speechExpression ?? 'default')
            : 'default'
        ) as Expression,
        thought: currentLog?.thought ?? '',
        speech: currentLog?.speech ?? '',
        isAlive: currentAgent?.isAlive ?? true,
        isMaster: false,
        isEliminationReaction: false,
        isVictoryComment: false,
        isExecuting: false,
      };

  // 初期化
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // BYOK初期化: sessionStorageからAPIキーを復元、なければ /byok にリダイレクト
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const byokKeyEncoded = sessionStorage.getItem('dg_byok_api_key');
    if (!byokKeyEncoded) {
      router.replace('/byok');
      return;
    }

    // 30分の自動失効チェック
    const tsStr = sessionStorage.getItem('dg_byok_api_key_ts');
    const BYOK_TTL_MS = 30 * 60 * 1000; // 30分
    if (tsStr && Date.now() - Number(tsStr) > BYOK_TTL_MS) {
      sessionStorage.removeItem('dg_byok_api_key');
      sessionStorage.removeItem('dg_byok_api_key_ts');
      router.replace('/byok');
      return;
    }

    // Base64 デコードして復元
    let byokKey: string;
    try {
      byokKey = atob(byokKeyEncoded);
    } catch {
      sessionStorage.removeItem('dg_byok_api_key');
      sessionStorage.removeItem('dg_byok_api_key_ts');
      router.replace('/byok');
      return;
    }

    // タイムスタンプを更新（プレイ開始 = 最終利用）
    sessionStorage.setItem('dg_byok_api_key_ts', String(Date.now()));
    useGameStore.getState().setByokMode(true, byokKey);
  }, [router]);

  // currentLogIndexが変わったときに、適切なcontentPhaseを設定
  useEffect(() => {
    if (currentLogIndex < 0 || !currentLog) return;
    const log = currentLog;

    // MASTERログや断末魔は思考がないのでspeechから開始
    // AGENT_TURNやVICTORY_COMMENTは思考がある場合thoughtから開始
    const hasThought = log.thought && log.thought.length > 0;
    const isMasterLog = log.type === LogType.MASTER;
    const isEliminationReaction = log.type === LogType.ELIMINATION_REACTION;

    if (isMasterLog || isEliminationReaction || !hasThought) {
      setContentPhase('speech');
    } else {
      setContentPhase('thought');
    }
  }, [currentLogIndex, currentLog?.id]);

  // タイプライター完了時
  const handleTypingComplete = useCallback(() => {

    // 思考タイピング完了時 → 発言タイピングへ切り替え
    if (contentPhase === 'thought') {
      // 発言があれば発言フェーズへ、なければTAP_WAIT
      const currentLog = currentLogIndex >= 0 ? logs[currentLogIndex] : null;
      const hasSpeech = currentLog?.speech && currentLog.speech.length > 0;

      if (hasSpeech) {
        setContentPhase('speech');
        // UIStateはTYPINGのまま維持（発言タイピング中）
        return;
      }
    }

    // 発言タイピング完了時（または思考なしの場合）→ TAP_WAIT
    const nextState = getTypingCompleteState(uiState);
    setUIState(nextState);
  }, [uiState, setUIState, contentPhase, currentLogIndex, logs]);

  // 口パク制御
  const handleMouthOpen = useCallback((open: boolean) => {
    setMouthOpen(open);
    if (currentAgent?.id) {
      setAgentMouthOpen(currentAgent.id, open);
    }
  }, [currentAgent?.id, setAgentMouthOpen]);

  // 今ターンで介入済みかどうか（「ラウンド-ターン」キーで判定）
  const displayTurnKey = `${round}-${currentTurnInRound}`;
  const interventionUsedThisTurn = interventionUsedKey === displayTurnKey;

  // ============================================
  // タップ時の処理（UIState駆動版）
  // ============================================
  const handleTap = useCallback(async () => {

    // TAP_WAIT状態またはEXECUTING状態以外はタップを無視
    if (!isTapWait(uiState) && !isExecuting(uiState)) {
      return;
    }

    // UIState.typeに基づいてswitch分岐
    switch (uiState.type) {
      // ============================================
      // 議論フェーズ: ゲーム開始セリフ後
      // ============================================
      case 'GAME_START_TAP_WAIT': {
        if (useGameStore.getState().isProcessing) break;
        if (useGameStore.getState().discussionComplete) {
          advanceToVoting();
          setTimeout(() => {
            const newLogsLength = useGameStore.getState().logs.length;
            setCurrentLogIndex(newLogsLength - 1);
            setUIState({ type: 'DISCUSSION_COMPLETE_TYPING' });
          }, 0);
          break;
        }
        // ターン頭: 介入モーダルを表示（未使用の場合のみ）
        if (!interventionUsedThisTurn) {
          setUIState({ type: 'INTERVENTION_WINDOW' });
          setIsInterventionOpen(true);
          break;
        }
        // 介入済み → バッチ生成へ直行
        setPendingAgentId(null);
        setUIState({ type: 'DISCUSSION_THINKING', agentIndex: 0 });
        const controller = new AbortController();
        currentTurnAbortRef.current = controller;
        processDiscussionTurn(controller.signal).finally(() => {
          if (currentTurnAbortRef.current === controller) {
            currentTurnAbortRef.current = null;
          }
        });
        break;
      }

      // ターン開始時の介入モーダル表示中（タップ無視）
      case 'INTERVENTION_WINDOW': {
        break;
      }

      // ============================================
      // 議論フェーズ: エージェント発言後
      // ============================================
      case 'DISCUSSION_TAP_WAIT': {
        // 次のログがあるか確認
        if (currentLogIndex < logs.length - 1) {
          const nextLog = logs[currentLogIndex + 1];
          if (!nextLog.isStreaming) {
            // ストリーム完了 → 即表示
            setCurrentLogIndex(currentLogIndex + 1);
            setUIState({ type: 'DISCUSSION_TYPING', agentIndex: uiState.agentIndex });
          } else {
            // まだストリーム中 → 考え中表示
            const nextAgentId = nextLog.agentId;
            if (nextAgentId) {
              setPendingAgentId(nextAgentId);
              setUIState({ type: 'DISCUSSION_THINKING', agentIndex: uiState.agentIndex + 1 });
              pendingLogIndexRef.current = currentLogIndex + 1;
            }
          }
        } else {
          // ログ終端 → 次の処理
          if (discussionComplete) {
            // 議論完了 → 投票フェーズへ
            advanceToVoting();
            setCurrentLogIndex(currentLogIndex + 1);
            setUIState({ type: 'DISCUSSION_COMPLETE_TYPING' });
          } else if (!useGameStore.getState().isProcessing) {
            // 次のターンを処理（二重呼び出し防止のため store から最新状態を取得）
            setPendingAgentId(null);
            setUIState({ type: 'DISCUSSION_THINKING', agentIndex: uiState.agentIndex + 1 });
            const controller = new AbortController();
            currentTurnAbortRef.current = controller;
            await processDiscussionTurn(controller.signal);
            currentTurnAbortRef.current = null;
          }
        }
        break;
      }

      // ============================================
      // 議論フェーズ: 投票開始セリフ後
      // ============================================
      case 'DISCUSSION_COMPLETE_TAP_WAIT': {
        // ユーザー投票モーダルへ
        setUIState({ type: 'VOTE_USER_MODAL' });
        break;
      }

      // ============================================
      // 投票フェーズ: 各投票結果表示後
      // ============================================
      case 'VOTE_REVEAL_TAP_WAIT': {
        const storeState = useGameStore.getState();

        // 投票完了フラグが立っていたら → 結果適用フェーズへ
        if (storeState.votingComplete) {
          advanceToResolution();
          setTimeout(() => {
            const newLogsLength = useGameStore.getState().logs.length;
            setCurrentLogIndex(newLogsLength - 1);
            setUIState({ type: 'RESOLUTION_ANNOUNCE_TYPING' });
          }, 0);
          return;
        }

        // 次の投票ログを表示
        const allVotesShown = showNextVoteLog();

        // 全エージェント投票表示完了 → GM投票へ
        if (allVotesShown) {
          // GM投票アニメーションはuseEffectで自動処理
          setUIState({ type: 'VOTE_GM_ANIMATING' });
          return;
        }

        // 次の投票結果表示
        setTimeout(() => {
          const storeAfterVote = useGameStore.getState();
          const newLogsLength = storeAfterVote.logs.length;
          setCurrentLogIndex(newLogsLength - 1);
          const nextVoteIdx = storeAfterVote.currentVoteIndex;
          setUIState({ type: 'VOTE_REVEAL_TYPING', voteIndex: nextVoteIdx });
        }, 0);
        break;
      }

      // ============================================
      // 投票フェーズ: GM投票ログ表示後
      // ============================================
      case 'VOTE_GM_TAP_WAIT': {
        // GM投票ログ表示後 → 結果適用フェーズへ
        advanceToResolution();
        setTimeout(() => {
          const storeState = useGameStore.getState();
          // 2人生き残りエンド（GAME_OVER済み）の場合はゲームオーバー演出へ
          if (storeState.phase === GamePhase.GAME_OVER) {
            // 2人生存エンドでは末尾がSYSTEMログになるため、アナウンス表示は最新のMASTERログを優先する
            const logs = storeState.logs;
            const lastMasterLogIndex = [...logs]
              .map((log, index) => ({ log, index }))
              .reverse()
              .find(({ log }) => log.type === LogType.MASTER)?.index;
            setCurrentLogIndex(lastMasterLogIndex ?? logs.length - 1);
            setUIState({ type: 'GAME_OVER_ANNOUNCE_TYPING' });
          } else {
            const newLogsLength = storeState.logs.length;
            setCurrentLogIndex(newLogsLength - 1);
            setUIState({ type: 'RESOLUTION_ANNOUNCE_TYPING' });
          }
        }, 0);
        break;
      }

      // ============================================
      // 結果発表フェーズ: 退場者発表後
      // ============================================
      case 'RESOLUTION_ANNOUNCE_TAP_WAIT': {
        if (gameConfig.getValue('debugMode')) {
          endGame();
          setUIState({ type: 'GAME_OVER_COMPLETE' });
          return;
        }

        // 断末魔APIフェッチ中（store側で自動開始済み）
        if (eliminationQueue.length > 0) {
          setPendingAgentId(eliminationQueue[0].agentId);
          setUIState({ type: 'RESOLUTION_FETCHING' });
        }
        break;
      }

      // ============================================
      // 結果発表フェーズ: 断末魔表示後
      // ============================================
      case 'RESOLUTION_REACTION_TAP_WAIT': {
        const state = useGameStore.getState();

        // 処刑演出中の場合は処刑完了処理
        if (executingAgentId) {
          finishElimination(executingAgentId);

          // 次の退場者がいるかチェック
          const nextElim = eliminationQueue.find((item) => {
            const agent = state.agents.find((a) => a.id === item.agentId);
            return agent && agent.isAlive && item.agentId !== executingAgentId;
          });

          if (nextElim) {
            // 次の断末魔へ
            showNextEliminationReaction();
            setTimeout(() => {
              const newLogsLength = useGameStore.getState().logs.length;
              setCurrentLogIndex(newLogsLength - 1);
              setPendingAgentId(null);
              setUIState({ type: 'RESOLUTION_REACTION_TYPING', elimIndex: (uiState.elimIndex || 0) + 1 });
            }, 0);
          } else {
            // 全員処刑完了 → 次のラウンドへ
            advanceToNextRound();
            setTimeout(() => {
              const finalLogsLength = useGameStore.getState().logs.length;
              setCurrentLogIndex(finalLogsLength - 1);
              const nextPhase = useGameStore.getState().phase;
              if (nextPhase === GamePhase.GAME_OVER) {
                setUIState({ type: 'GAME_OVER_FETCHING' });
              } else {
                setUIState({ type: 'RESOLUTION_NEXT_ROUND_TYPING' });
              }
            }, 0);
          }
          return;
        }

        // 次に処理するエージェントを特定
        const nextToProcess = eliminationQueue.find((item) => {
          const agent = state.agents.find((a) => a.id === item.agentId);
          return agent && agent.isAlive;
        });

        if (nextToProcess) {
          const reactionLog = state.logs.find(
            (log) => log.type === LogType.ELIMINATION_REACTION && log.agentId === nextToProcess.agentId
          );

          if (!reactionLog) {
            // 断末魔ログを追加
            showNextEliminationReaction();
            setTimeout(() => {
              const newLogsLength = useGameStore.getState().logs.length;
              setCurrentLogIndex(newLogsLength - 1);
              setPendingAgentId(null);
              const elimIdx = state.currentEliminationIndex || 0;
              setUIState({ type: 'RESOLUTION_REACTION_TYPING', elimIndex: elimIdx });
            }, 0);
            return;
          }

          // 処刑演出へ（音完了後に自動進行）
          audioService.playEliminationSound();
          startElimination(nextToProcess.agentId);
          setUIState({ type: 'RESOLUTION_EXECUTING', elimIndex: uiState.elimIndex || 0 });
          const agentToFinish = nextToProcess.agentId;
          setTimeout(() => {
            // 既にタップで処理済みなら何もしない
            const s = useGameStore.getState();
            if (!s.executingAgentId || s.executingAgentId !== agentToFinish) return;
            handleTapRef.current();
          }, 600);
          return;
        }

        // 全員処刑完了 → 次のラウンドへ
        advanceToNextRound();
        setTimeout(() => {
          const finalLogsLength = useGameStore.getState().logs.length;
          setCurrentLogIndex(finalLogsLength - 1);
          // 次ラウンド開始 or GAME_OVER
          const nextPhase = useGameStore.getState().phase;
          if (nextPhase === GamePhase.GAME_OVER) {
            setUIState({ type: 'GAME_OVER_FETCHING' });
          } else {
            setUIState({ type: 'RESOLUTION_NEXT_ROUND_TYPING' });
          }
        }, 0);
        break;
      }

      // ============================================
      // 結果発表フェーズ: 処刑演出中にタップ
      // ============================================
      case 'RESOLUTION_EXECUTING': {
        const state = useGameStore.getState();

        // 処刑完了処理
        if (executingAgentId) {
          finishElimination(executingAgentId);

          // 次の退場者がいるかチェック
          const nextElim = eliminationQueue.find((item) => {
            const agent = state.agents.find((a) => a.id === item.agentId);
            return agent && agent.isAlive && item.agentId !== executingAgentId;
          });

          if (nextElim) {
            // 次の断末魔へ
            showNextEliminationReaction();
            setTimeout(() => {
              const newLogsLength = useGameStore.getState().logs.length;
              setCurrentLogIndex(newLogsLength - 1);
              setPendingAgentId(null);
              setUIState({ type: 'RESOLUTION_REACTION_TYPING', elimIndex: (uiState.elimIndex || 0) + 1 });
            }, 0);
          } else {
            // 全員処刑完了 → 次のラウンドへ
            advanceToNextRound();
            setTimeout(() => {
              const finalLogsLength = useGameStore.getState().logs.length;
              setCurrentLogIndex(finalLogsLength - 1);
              const nextPhase = useGameStore.getState().phase;
              if (nextPhase === GamePhase.GAME_OVER) {
                setUIState({ type: 'GAME_OVER_FETCHING' });
              } else {
                setUIState({ type: 'RESOLUTION_NEXT_ROUND_TYPING' });
              }
            }, 0);
          }
        }
        break;
      }

      // ============================================
      // 結果発表フェーズ: 次ラウンド開始セリフ後
      // ============================================
      case 'RESOLUTION_NEXT_ROUND_TAP_WAIT': {
        const nextPhase = useGameStore.getState().phase;
        if (nextPhase === GamePhase.DISCUSSION) {
          // ラウンド頭: 介入モーダルを表示
          if (!interventionUsedThisTurn) {
            setUIState({ type: 'INTERVENTION_WINDOW' });
            setIsInterventionOpen(true);
            break;
          }
          if (!useGameStore.getState().isProcessing) {
            setPendingAgentId(null);
            setUIState({ type: 'DISCUSSION_THINKING', agentIndex: 0 });
            const controller = new AbortController();
            currentTurnAbortRef.current = controller;
            processDiscussionTurn(controller.signal).finally(() => {
              if (currentTurnAbortRef.current === controller) {
                currentTurnAbortRef.current = null;
              }
            });
          }
        } else if (nextPhase === GamePhase.GAME_OVER) {
          setUIState({ type: 'GAME_OVER_FETCHING' });
        }
        break;
      }

      // ============================================
      // ゲームオーバー: ゲーム終了アナウンス後
      // ============================================
      case 'GAME_OVER_ANNOUNCE_TAP_WAIT': {
        // 勝者がいれば勝利コメント取得へ、いなければ結果画面へ
        if (winnerIds.length > 0) {
          setUIState({ type: 'GAME_OVER_FETCHING' });
        } else {
          setVictoryCommentDisplayed(true);
          setUIState({ type: 'GAME_OVER_COMPLETE' });
        }
        break;
      }

      // ============================================
      // ゲームオーバー: 勝利コメント表示後
      // ============================================
      case 'GAME_OVER_VICTORY_TAP_WAIT': {
        // 次の勝者がいればそのコメントを取得、いなければ完了
        const nextIndex = currentVictoryIndex + 1;
        if (nextIndex < winnerIds.length) {
          // 次の勝者の勝利コメントを取得
          useGameStore.setState({ currentVictoryIndex: nextIndex });
          setUIState({ type: 'GAME_OVER_FETCHING' });
        } else {
          // 全員の勝利コメント表示完了 → ゲームオーバー画面へ
          setVictoryCommentDisplayed(true);
          setUIState({ type: 'GAME_OVER_COMPLETE' });
        }
        break;
      }

      default: {
        break;
      }
    }
  }, [
    uiState,
    contentPhase,
    currentLogIndex,
    logs,
    isProcessing,
    discussionComplete,
    eliminationQueue,
    interventionUsedThisTurn,
    executingAgentId,
    winnerIds,
    currentVictoryIndex,
    addLog,
    advanceToVoting,
    advanceToResolution,
    advanceToNextRound,
    showNextVoteLog,
    showNextEliminationReaction,
    startElimination,
    finishElimination,
    endGame,
    processDiscussionTurn,
    setUIState,
    phase,
    isTyping,
    waitingForTap,
  ]);

  // handleTapの最新参照（setTimeout等から安全に呼ぶため）
  const handleTapRef = useRef(handleTap);
  handleTapRef.current = handleTap;

  // 最新ログの isStreaming 状態を追跡
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const latestLogIsStreaming = latestLog?.isStreaming ?? false;
  const latestLogId = latestLog?.id ?? '';

  // ログが追加されたとき、またはストリーム完了を検知
  useEffect(() => {
    if (logs.length === 0) return;

    // 新しいログが追加された場合
    if (logs.length > prevLogsLengthRef.current) {
      prevLogsLengthRef.current = logs.length;
    }

    // 「考え中」状態で待機中のログがストリーム完了したかチェック
    if (uiState.type === 'DISCUSSION_THINKING' && pendingLogIndexRef.current >= 0) {
      const pendingLog = logs[pendingLogIndexRef.current];
      if (pendingLog && !pendingLog.isStreaming) {
        setCurrentLogIndex(pendingLogIndexRef.current);
        setPendingAgentId(null);
        pendingLogIndexRef.current = -1;

        // 直接UIState遷移
        const agentIndex = getAgentIndex();
        if (pendingLog.type === LogType.AGENT_TURN) {
          setUIState({ type: 'DISCUSSION_TYPING', agentIndex });
        } else if (pendingLog.type === LogType.MASTER) {
          // 司会者セリフの種類を判定
          if (phase === GamePhase.DISCUSSION) {
            setUIState({ type: 'GAME_START_TYPING' });
          } else {
            setUIState({ type: 'RESOLUTION_ANNOUNCE_TYPING' });
          }
        } else {
          setUIState({ type: 'DISCUSSION_TAP_WAIT', agentIndex });
        }
        return;
      }
    }

    // ストリーム完了時 - 「考え中」状態の解除
    // 次のログがあり、そのログがストリーム完了していれば表示
    if (uiState.type === 'DISCUSSION_THINKING' && pendingLogIndexRef.current < 0 && currentLogIndex < logs.length - 1) {
      const nextLog = logs[currentLogIndex + 1];
      if (!nextLog.isStreaming) {
        setCurrentLogIndex(currentLogIndex + 1);
        setPendingAgentId(null);

        // 直接UIState遷移
        const agentIndex = getAgentIndex();
        if (nextLog.type === LogType.AGENT_TURN) {
          setUIState({ type: 'DISCUSSION_TYPING', agentIndex });
        } else if (nextLog.type === LogType.MASTER) {
          if (phase === GamePhase.DISCUSSION) {
            setUIState({ type: 'GAME_START_TYPING' });
          } else {
            setUIState({ type: 'RESOLUTION_ANNOUNCE_TYPING' });
          }
        } else {
          setUIState({ type: 'DISCUSSION_TAP_WAIT', agentIndex });
        }
        return;
      }
    }
  }, [logs.length, latestLogIsStreaming, latestLogId, uiState.type, logs, currentLogIndex, phase, getAgentIndex, setUIState]);

  // 「投票中...」状態で並列フェッチ完了を監視
  useEffect(() => {
    if (uiState.type === 'VOTE_FETCHING' && votingFetchComplete) {
      // フェッチ完了後、最初の投票結果を表示
      showNextVoteLog();

      // ログ追加後に表示を更新
      setTimeout(() => {
        const newLogsLength = useGameStore.getState().logs.length;
        setCurrentLogIndex(newLogsLength - 1);
        setUIState({ type: 'VOTE_REVEAL_TYPING', voteIndex: 0 });
      }, 0);
    }
  }, [uiState.type, votingFetchComplete, showNextVoteLog, setUIState]);

  // GM投票公開フェーズを監視
  useEffect(() => {
    if (uiState.type === 'VOTE_GM_ANIMATING') {
      // ユーザー投票情報を取得
      const storeState = useGameStore.getState();
      const userVote = storeState.userVote;

      if (userVote && userVote.type !== 'watch' && userVote.targetId) {
        const addVotes = userVote.type === 'force_eliminate' ? 10 : 1;
        const targetId = userVote.targetId; // クロージャ用に保持

        // 1. 最初にログを表示（「GMは〇〇を強制退場」）
        showGmVoteLog();

        // 2. ログ表示後にアニメーション開始
        setTimeout(() => {
          // GM票をvoteResultsに反映（これによりreceivedVotesにGM票が含まれる）
          const currentVoteResults = useGameStore.getState().voteResults;
          const newResults = { ...currentVoteResults };
          if (!newResults[targetId]) {
            newResults[targetId] = { receivedVotes: 0 };
          }
          newResults[targetId].receivedVotes += addVotes;
          useGameStore.setState({ voteResults: newResults });

          // アニメーション開始
          setGmVoteAnimation({ targetId, addVotes });

          // ログ表示を更新（この時点ではまだアニメ中）
          const newLogsLength = useGameStore.getState().logs.length;
          setCurrentLogIndex(newLogsLength - 1);
          setUIState({ type: 'VOTE_GM_TYPING' });

          // アニメーション時間後に完了（+10の場合2.8秒、+1の場合0.5秒 + バッファ）
          const animationDuration = addVotes === 10 ? 3000 : 700;
          setTimeout(() => {
            setGmVoteAnimation(null);
          }, animationDuration);
        }, 100); // 少し待ってからアニメーション開始
      } else {
        // 見守る場合はアニメーションなしで即ログ表示
        showGmVoteLog();

        // ログ追加後に表示を更新
        setTimeout(() => {
          const newLogsLength = useGameStore.getState().logs.length;
          setCurrentLogIndex(newLogsLength - 1);
          setUIState({ type: 'VOTE_GM_TYPING' });
        }, 0);
      }
    }
  }, [uiState.type, showGmVoteLog, setUIState]);

  // 勝利コメント取得・表示を監視（複数勝者対応）
  useEffect(() => {
    // GAME_OVER_FETCHINGで、勝者がいて、現在の勝者のコメントがまだ取得されていない場合
    if (uiState.type !== 'GAME_OVER_FETCHING' || winnerIds.length === 0 || isFetchingVictoryComment) {
      return;
    }

    const currentWinnerId = winnerIds[currentVictoryIndex];
    if (!currentWinnerId || victoryCommentsFetched[currentWinnerId]) {
      return;
    }

    setIsFetchingVictoryComment(true);
    setPendingAgentId(currentWinnerId);

    const fetchVictoryComment = async () => {
      const proceedAfterFetchFailure = (failedWinnerId: string) => {
        const stateBeforeUpdate = useGameStore.getState();
        const nextFetched = {
          ...stateBeforeUpdate.victoryCommentsFetched,
          [failedWinnerId]: true,
        };
        useGameStore.setState({ victoryCommentsFetched: nextFetched });

        const nextWinnerIndex = winnerIds.findIndex((id) => !nextFetched[id]);
        if (nextWinnerIndex >= 0) {
          useGameStore.setState({ currentVictoryIndex: nextWinnerIndex });
          setUIState({ type: 'GAME_OVER_FETCHING' });
        } else {
          setVictoryCommentDisplayed(true);
          setUIState({ type: 'GAME_OVER_COMPLETE' });
        }
      };

      try {
        const winner = agents.find((a) => a.id === currentWinnerId);
        if (!winner) {
          setIsFetchingVictoryComment(false);
          setPendingAgentId(null);
          proceedAfterFetchFailure(currentWinnerId);
          return;
        }

        // 2人生き残りの場合、coSurvivorを設定
        const coSurvivor = winnerIds.length === 2
          ? agents.find((a) => a.id === winnerIds[currentVictoryIndex === 0 ? 1 : 0])
          : undefined;

        const { byokApiKey } = useGameStore.getState();
        let data: unknown = null;

        if (byokApiKey) {
          const { byokVictoryComment } = await import('@/lib/byokClient');
          data = await byokVictoryComment(
            { agent: winner, logs, allAgents: agents, coSurvivor },
            byokApiKey
          );
        }

        const fallbackThought = coSurvivor
          ? `……${coSurvivor.name}と一緒に生き残った……`
          : '……勝った。';
        const fallbackSpeech = coSurvivor
          ? `……${coSurvivor.name}、私たち生き残ったね。`
          : '……勝った。';
        const isVictoryComment = (v: unknown): v is { thought: string; speech: string; thoughtExpression: Expression; speechExpression: Expression } =>
          v !== null && typeof v === 'object' &&
          typeof (v as Record<string, unknown>).thought === 'string' &&
          typeof (v as Record<string, unknown>).speech === 'string';
        const parsed = isVictoryComment(data) ? data : null;
        const thought = parsed?.thought ?? fallbackThought;
        const speech = parsed?.speech ?? fallbackSpeech;
        const isExpressionValue = (value: unknown): value is Expression =>
          value === 'default' || value === 'painful' || value === 'happy' || value === 'fainted';
        const thoughtExpression: Expression = parsed && isExpressionValue(parsed.thoughtExpression) ? parsed.thoughtExpression : 'happy';
        const speechExpression: Expression = parsed && isExpressionValue(parsed.speechExpression) ? parsed.speechExpression : 'happy';

        // 勝利コメントをログに追加
        addLog(LogType.VICTORY_COMMENT, '', currentWinnerId, {
          thought,
          speech,
          thoughtExpression,
          speechExpression,
        });

        // ストアの状態を更新（この勝者のフェッチ完了をマーク）
        useGameStore.setState((state) => ({
          victoryCommentsFetched: {
            ...state.victoryCommentsFetched,
            [currentWinnerId]: true,
          },
        }));

        // 「考え中」状態を解除してログを表示
        setTimeout(() => {
          const newLogsLength = useGameStore.getState().logs.length;
          // ローカルstate反映を先に確定し、旧ログ（SYSTEM）での一瞬LOADING描画を防ぐ
          flushSync(() => {
            setCurrentLogIndex(newLogsLength - 1);
            setPendingAgentId(null);
            setIsFetchingVictoryComment(false);
          });
          setUIState({ type: 'GAME_OVER_VICTORY_TYPING' });
        }, 0);
      } catch (error) {
        setIsFetchingVictoryComment(false);
        setPendingAgentId(null);
        proceedAfterFetchFailure(currentWinnerId);
      }
    };

    fetchVictoryComment();
  }, [uiState.type, winnerIds, currentVictoryIndex, victoryCommentsFetched, isFetchingVictoryComment, agents, logs, addLog, setUIState]);

  // 断末魔API取得完了を監視
  useEffect(() => {
    // RESOLUTION_FETCHING状態で断末魔が取得完了したら遷移
    if (uiState.type === 'RESOLUTION_FETCHING' && eliminationReactionsFetched) {
      // 考え中状態を解除して、最初の断末魔を表示
      if (eliminationQueue.length > 0) {
        showNextEliminationReaction();

        setTimeout(() => {
          const newLogsLength = useGameStore.getState().logs.length;
          setCurrentLogIndex(newLogsLength - 1);
          setPendingAgentId(null);
          setUIState({ type: 'RESOLUTION_REACTION_TYPING', elimIndex: 0 });
        }, 0);
      }
    }
  }, [uiState.type, eliminationReactionsFetched, eliminationQueue.length, showNextEliminationReaction, setUIState]);

  // ログ画面切り替え
  const handleLogClick = useCallback(() => {
    // 現在の画面を記憶してからログ画面に遷移
    setPreviousScreenPhase(screenPhase);
    setScreenPhase('log');
  }, [screenPhase]);

  const handleBackFromLog = useCallback(() => {
    // 記憶した前の画面に戻る（game または game-over）
    setScreenPhase(previousScreenPhase);
  }, [previousScreenPhase]);

  // リセット（ランディングページに戻る）
  const handleReset = useCallback(() => {
    // 遷移前の中間描画が見えないようにマスクしてからトップへ戻す
    setIsNavigatingToTop(true);
    router.push('/');
    // 遷移開始後にストアを初期化（ブラウザバック時に前回状態が残らないようにする）
    setTimeout(() => {
      const store = useGameStore.getState();
      store.resetGame();
      store.initializeGame();
    }, 0);
  }, [router]);

  // ユーザー投票完了ハンドラ
  const handleUserVote = useCallback((vote: UserVote) => {
    setUserVote(vote);

    // UIStateをVOTE_FETCHINGに遷移
    setUIState({ type: 'VOTE_FETCHING' });

    // ユーザー投票後にエージェント投票を並列フェッチ開始
    fetchAllVotesParallel();
  }, [setUserVote, fetchAllVotesParallel, setUIState]);

  // 介入実行（ターン頭モーダルから呼ばれる）
  const handleInterventionSubmit = useCallback(async (text: string) => {
    const submitRound = round;
    const submitTurnInRound = currentTurnInRound;
    const submitTurnKey = `${submitRound}-${submitTurnInRound}`;

    const participants = agents.map((a) => ({ name: a.name, isAlive: a.isAlive }));

    // クライアントサイドでモデレーション実行
    const { byokApiKey } = useGameStore.getState();
    if (!byokApiKey) return;

    const { byokModerateIntervention } = await import('@/lib/byokClient');
    const result = await byokModerateIntervention(
      { instruction: text, participants },
      byokApiKey
    );

    setInterventionUsedKey(submitTurnKey);

    if (result.category === 'safe') {
      useGameStore.setState((state) => ({
        gameStats: {
          ...state.gameStats,
          interventionCount: state.gameStats.interventionCount + 1,
        },
      }));
      // broadcast_instruction: 次の議論バッチにGM指示を注入
      if (result.responseMode === 'broadcast_instruction') {
        useGameStore.getState().setByokGmInstruction(text);
      }
    }

    addLog(LogType.MASTER, result.masterResponse, MASTER_CHARACTER.id);
    setIsInterventionOpen(false);
    const newLogsLength = useGameStore.getState().logs.length;
    setCurrentLogIndex(newLogsLength - 1);
    setUIState({ type: 'GAME_START_TYPING' });
  }, [agents, currentTurnInRound, round, addLog, setUIState]);

  // 見守る（介入しない）→ 即座にバッチ生成開始
  const handleWatch = useCallback(() => {
    setIsInterventionOpen(false);
    setPendingAgentId(null);
    setUIState({ type: 'DISCUSSION_THINKING', agentIndex: 0 });
    const controller = new AbortController();
    currentTurnAbortRef.current = controller;
    processDiscussionTurn(controller.signal);
    currentTurnAbortRef.current = null;
  }, [processDiscussionTurn, setUIState]);

  const aliveCount = agents.filter((a) => a.isAlive).length;

  // エージェントデータの変換
  const agentData = agents.map((a) => ({
    id: a.id,
    characterId: a.characterId,
    name: a.name,
    isAlive: a.isAlive,
  }));

  // GAME_OVER + 勝利コメント表示完了で game-over 画面に遷移
  // 勝者がいない場合（全滅）か、勝利コメント表示完了時に遷移
  useEffect(() => {
    if (phase === GamePhase.GAME_OVER && (victoryCommentDisplayed || winnerIds.length === 0)) {
      setScreenPhase('game-over');
    }
  }, [phase, victoryCommentDisplayed, winnerIds.length]);

  // ゲーム画面を表示するかどうか（game/log/game-over時はMainScreenを維持）
  const showGameScreen = screenPhase === 'game' || screenPhase === 'log' || screenPhase === 'game-over';

  // 画面コンテンツをレンダリング
  const renderScreen = () => {
    switch (screenPhase) {
      case 'member-selection':
        return (
          <div className="h-full flex flex-col items-center justify-center bg-black">
            <h1 className="text-4xl md:text-6xl font-bold text-green-400 animate-pulse text-center mb-8">
              AIデスゲーム
            </h1>
            <MemberSelectionOverlay
              agents={agents}
              onShuffle={shuffleSelectedAgents}
              isPreparingAssets={isAssetPreparing}
              onStart={async () => {
                audioService.initialize();

                setIsAssetPreparing(true);

                try {
                  const result = await preloadCharacterImagesWithDecode(
                    agents.map((a) => a.characterId),
                    {
                      onProgress: (done, total, url) => {
                        if (done === total || done % 8 === 0) {
                        }
                      },
                    },
                  );


                  if (result.failed.length > 0) {
                  }

                  setScreenPhase('game');
                  audioService.playAlert();
                  startGame();
                  hasStartedRef.current = true;
                  setCurrentLogIndex(0);
                  // ゲーム開始: 最初のログ（司会者のゲーム開始セリフ）を表示
                  setUIState({ type: 'GAME_START_TYPING' });
                } finally {
                  setIsAssetPreparing(false);
                }
              }}
              onBackToTop={() => router.push('/')}
            />
          </div>
        );

      // game/log/game-over時はMainScreenを維持するため、ここでは返さない
      case 'game':
      case 'log':
      case 'game-over':
        return null;

      default:
        return null;
    }
  };

  // BYOK エラートースト自動消去（8秒後）
  useEffect(() => {
    if (!byokError) return;
    const timer = setTimeout(() => setByokError(null), 8000);
    return () => clearTimeout(timer);
  }, [byokError, setByokError]);

  return (
    <div className="h-dvh max-h-dvh overflow-hidden relative">
      {/* CRTオーバーレイ */}
      <div className="absolute inset-0 z-50 pointer-events-none crt-overlay opacity-30" />
      <div className="absolute inset-0 z-40 pointer-events-none bg-green-500/[0.02] mix-blend-overlay" />

      {/* BYOK API エラートースト */}
      {byokError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)]">
          <div className="border border-[#ff0055]/60 bg-[#1a0008]/95 px-4 py-3 text-sm text-[#ff4d6d] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-xs mb-1 text-[#ff0055]">BYOK API ERROR</p>
                <p className="text-[#ff4d6d]/80 text-xs leading-relaxed">{byokError}</p>
              </div>
              <button
                onClick={() => setByokError(null)}
                className="text-[#ff0055]/60 hover:text-[#ff0055] text-lg leading-none shrink-0"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メイン画面コンテンツ */}
      <div className="h-full relative z-10">
        {renderScreen()}

        {/* MainScreen: ゲーム開始後は常にマウント維持（ログ/ゲームオーバー画面でもアンマウントしない） */}
        {showGameScreen && (
          <MainScreen
            round={round}
            turn={currentTurnInRound}
            agents={agentData}
            currentDisplay={currentDisplay}
            contentPhase={contentPhase}
            contentKey={currentLog?.id ?? `log-${currentLogIndex}`}
            isTyping={isTyping}
            waitingForTap={waitingForTap}
            mouthOpen={mouthOpen}
            isThinking={isThinking}
            isVoting={isVoting}
            voteResults={voteResults}
            showVoteInfo={phase === GamePhase.VOTING || phase === GamePhase.RESOLUTION}
            gmVoteAnimation={gmVoteAnimation}
            onLogClick={handleLogClick}
            onTap={handleTap}
            onTypingComplete={handleTypingComplete}
            onMouthOpen={handleMouthOpen}
            onDialogPhaseChange={setDialogPhase}
          />
        )}

        {/* LogScreen: オーバーレイとして表示（MainScreenはアンマウントしない） */}
        {screenPhase === 'log' && (
          <div className="absolute inset-0 z-30">
            <LogScreen
              logs={logs}
              agents={agentData}
              onBack={handleBackFromLog}
            />
          </div>
        )}

        {/* GameOverScreen: オーバーレイとして表示 */}
        {screenPhase === 'game-over' && (
          <div className="absolute inset-0 z-30">
            <GameOverScreen
              onRestart={handleReset}
              onViewLog={handleLogClick}
            />
          </div>
        )}
      </div>

      {/* 介入モーダル */}
      <InterventionModal
        isOpen={isInterventionOpen}
        onClose={() => setIsInterventionOpen(false)}
        onSubmit={handleInterventionSubmit}
        onWatch={handleWatch}
      />

      {/* ユーザー投票モーダル */}
      <UserVotingModal
        isOpen={uiState.type === 'VOTE_USER_MODAL'}
        candidates={agents.filter((a) => a.isAlive)}
        onVote={handleUserVote}
      />

      {isNavigatingToTop && (
        <div className="absolute inset-0 z-[80] bg-black" />
      )}
    </div>
  );
}

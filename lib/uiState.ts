/**
 * UIState ヘルパー関数
 * - 状態判定用のユーティリティ
 * - 状態遷移ロジック
 */

import { UIState } from './types';

// ============================================
// 状態判定ヘルパー
// ============================================

/** タップ待ち状態かどうか */
export const isTapWait = (state: UIState): boolean =>
  state.type.endsWith('TAP_WAIT');

/** タイピング中かどうか */
export const isTyping = (state: UIState): boolean =>
  state.type.endsWith('TYPING');

/** API待ち（考え中）かどうか - 思考アニメーション表示対象 */
export const isThinking = (state: UIState): boolean =>
  state.type === 'DISCUSSION_THINKING' ||
  state.type === 'VOTE_FETCHING' ||
  state.type === 'RESOLUTION_FETCHING' ||
  state.type === 'GAME_OVER_FETCHING';

/** 投票API取得中かどうか */
export const isVoteFetching = (state: UIState): boolean =>
  state.type === 'VOTE_FETCHING';

/** 何かしらのAPI取得中かどうか（isThinkingと同義、後方互換用） */
export const isFetching = (state: UIState): boolean =>
  state.type === 'VOTE_FETCHING' ||
  state.type === 'RESOLUTION_FETCHING' ||
  state.type === 'GAME_OVER_FETCHING';

/** 投票フェーズかどうか */
export const isVotingPhase = (state: UIState): boolean =>
  state.type.startsWith('VOTE_');

/** 結果発表フェーズかどうか */
export const isResolutionPhase = (state: UIState): boolean =>
  state.type.startsWith('RESOLUTION_');

/** ゲームオーバーフェーズかどうか */
export const isGameOverPhase = (state: UIState): boolean =>
  state.type.startsWith('GAME_OVER');

/** 議論フェーズかどうか（ゲーム開始セリフも含む） */
export const isDiscussionPhase = (state: UIState): boolean =>
  state.type.startsWith('DISCUSSION_') || state.type.startsWith('GAME_START_');

/** ユーザー投票モーダル表示中かどうか */
export const isUserVotingModal = (state: UIState): boolean =>
  state.type === 'VOTE_USER_MODAL';

/** GM投票アニメーション中かどうか */
export const isGmAnimating = (state: UIState): boolean =>
  state.type === 'VOTE_GM_ANIMATING';

/** 処刑演出中かどうか */
export const isExecuting = (state: UIState): boolean =>
  state.type === 'RESOLUTION_EXECUTING';

/** 司会者セリフかどうか（ゲーム開始、投票開始、次ラウンド、ゲーム終了） */
export const isMasterSpeech = (state: UIState): boolean =>
  state.type === 'GAME_START_TYPING' ||
  state.type === 'GAME_START_TAP_WAIT' ||
  state.type === 'DISCUSSION_COMPLETE_TYPING' ||
  state.type === 'DISCUSSION_COMPLETE_TAP_WAIT' ||
  state.type === 'RESOLUTION_ANNOUNCE_TYPING' ||
  state.type === 'RESOLUTION_ANNOUNCE_TAP_WAIT' ||
  state.type === 'RESOLUTION_NEXT_ROUND_TYPING' ||
  state.type === 'RESOLUTION_NEXT_ROUND_TAP_WAIT' ||
  state.type === 'GAME_OVER_ANNOUNCE_TYPING' ||
  state.type === 'GAME_OVER_ANNOUNCE_TAP_WAIT';

// ============================================
// 初期状態
// ============================================

export const INITIAL_UI_STATE: UIState = { type: 'IDLE' };

// ============================================
// 状態遷移ヘルパー
// ============================================

/** タイピング完了時の次の状態を取得 */
export const getTypingCompleteState = (current: UIState): UIState => {
  switch (current.type) {
    // 議論フェーズ
    case 'GAME_START_TYPING':
      return { type: 'GAME_START_TAP_WAIT' };
    case 'DISCUSSION_TYPING':
      return { type: 'DISCUSSION_TAP_WAIT', agentIndex: current.agentIndex };
    case 'DISCUSSION_COMPLETE_TYPING':
      return { type: 'DISCUSSION_COMPLETE_TAP_WAIT' };

    // 投票フェーズ
    case 'VOTE_REVEAL_TYPING':
      return { type: 'VOTE_REVEAL_TAP_WAIT', voteIndex: current.voteIndex };
    case 'VOTE_GM_TYPING':
      return { type: 'VOTE_GM_TAP_WAIT' };

    // 結果発表フェーズ
    case 'RESOLUTION_ANNOUNCE_TYPING':
      return { type: 'RESOLUTION_ANNOUNCE_TAP_WAIT' };
    case 'RESOLUTION_REACTION_TYPING':
      return { type: 'RESOLUTION_REACTION_TAP_WAIT', elimIndex: current.elimIndex };
    case 'RESOLUTION_NEXT_ROUND_TYPING':
      return { type: 'RESOLUTION_NEXT_ROUND_TAP_WAIT' };

    // ゲームオーバー
    case 'GAME_OVER_ANNOUNCE_TYPING':
      return { type: 'GAME_OVER_ANNOUNCE_TAP_WAIT' };
    case 'GAME_OVER_VICTORY_TYPING':
      return { type: 'GAME_OVER_VICTORY_TAP_WAIT' };

    default:
      return current;
  }
};

/** デバッグ用: 状態名を取得 */
export const getStateName = (state: UIState): string => {
  if ('agentIndex' in state) {
    return `${state.type}[${state.agentIndex}]`;
  }
  if ('voteIndex' in state) {
    return `${state.type}[${state.voteIndex}]`;
  }
  if ('elimIndex' in state) {
    return `${state.type}[${state.elimIndex}]`;
  }
  return state.type;
};

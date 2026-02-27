// ============================================
// エージェント関連の型定義
// ============================================

export interface AgentStats {
  survivalInstinct: number;  // 生存本能 (0-100)
  cooperativeness: number;   // 協調性 (0-100)
  cunningness: number;       // 狡猾さ (0-100)
}

// 表情タイプ
export type Expression = 'default' | 'painful' | 'happy' | 'fainted';

export interface Agent {
  id: string;
  characterId: string;  // 'yumi' | 'kenichiro' | ... （画像パス用）
  name: string;
  isAlive: boolean;
  stats: AgentStats;
  isSpeaking: boolean;
  tone: string;  // 口調の特徴
  currentExpression: Expression;  // 現在の表情
  mouthOpen: boolean;             // 口パク用
}

export interface AIPersonality {
  characterId: string;  // 画像パス用
  name: string;
  appearance: string;   // 外見情報（全員が観察可能）
  profile: string;      // プロフィール・背景設定（自分だけが知る）
  description: string;  // 性格・内面（自分だけが知る）
  tone: string;
  stats: AgentStats;
  unlockTier?: number;  // undefined = 常時使用可能、数値 = その★数到達で解放
}

// ============================================
// ログ関連の型定義
// ============================================

export enum LogType {
  SYSTEM = 'SYSTEM',
  SPEECH = 'SPEECH',
  THOUGHT = 'THOUGHT',
  VOTE = 'VOTE',
  AGENT_TURN = 'AGENT_TURN', // 思考+発言をセットで表示
  MASTER = 'MASTER', // 司会キャラのセリフ
  ELIMINATION_REACTION = 'ELIMINATION_REACTION', // 退場者の断末魔（発言のみ、思考なし）
  VICTORY_COMMENT = 'VICTORY_COMMENT', // 勝者の勝利コメント（発言のみ）
}

export interface LogEntry {
  id: string;
  type: LogType;
  agentId?: string;
  content: string;
  thought?: string;  // AGENT_TURN用
  speech?: string;   // AGENT_TURN用
  thoughtExpression?: Expression;  // 思考中の表情
  speechExpression?: Expression;   // 発言中の表情
  timestamp: number;
  isStreaming?: boolean;  // ストリーミング中フラグ
  rawStreamText?: string; // ストリーム生テキスト（パース前）
}

// エージェントごとのカラーテーマ
export const AGENT_COLORS: Record<string, { primary: string; bg: string; border: string; text: string }> = {
  'agent-0': { primary: '#22c55e', bg: 'bg-green-950/40', border: 'border-green-600', text: 'text-green-300' },   // yumi: グリーン
  'agent-1': { primary: '#06b6d4', bg: 'bg-cyan-950/40', border: 'border-cyan-600', text: 'text-cyan-300' },      // kenichiro: シアン
  'agent-2': { primary: '#f472b6', bg: 'bg-pink-950/40', border: 'border-pink-600', text: 'text-pink-300' },      // kiyohiko: ピンク
  'agent-3': { primary: '#f97316', bg: 'bg-orange-950/40', border: 'border-orange-600', text: 'text-orange-300' }, // shoko: オレンジ
  'agent-4': { primary: '#a855f7', bg: 'bg-purple-950/40', border: 'border-purple-600', text: 'text-purple-300' }, // tetsuo: パープル
};

// ============================================
// ゲームフェーズ関連
// ============================================

export enum GamePhase {
  IDLE = 'IDLE',           // ゲーム開始前
  DISCUSSION = 'DISCUSSION', // 議論フェーズ
  VOTING = 'VOTING',       // 投票フェーズ
  RESOLUTION = 'RESOLUTION', // 結果発表フェーズ
  GAME_OVER = 'GAME_OVER', // ゲーム終了
}

// ============================================
// ユーザー投票関連
// ============================================

export type UserVoteType = 'force_eliminate' | 'one_vote' | 'watch';

export interface UserVote {
  type: UserVoteType;
  targetId: string | null;  // watchの場合はnull
}

// ユーザー選択履歴（実績用）
export interface UserVoteHistory {
  round: number;
  vote: UserVote;
  targetName: string | null;
  resultedInElimination: boolean;  // この投票が退場につながったか
}

export interface GameStats {
  totalRounds: number;
  userVoteHistory: UserVoteHistory[];
  forceEliminateCount: number;     // 強制退場を使用した回数
  oneVoteCount: number;            // 1票を使用した回数
  watchCount: number;              // 見守るを使用した回数
  interventionCount: number;       // GM介入を使用した回数
  lastEliminationCount: number;    // 最終ラウンドの同時退場者数（トロフィー判定用）
  selfSacrificeCount: number;      // 最終戦以外での自己投票退場数
}

// ============================================
// 統一UI状態マシン
// ============================================

/**
 * UIの表示状態を一元管理する状態マシン
 * - タップ待ち、タイピング中、API待ちなどを明示的に表現
 * - storeで管理するため、画面遷移でも状態が維持される
 * - 各状態が一意な意味を持つように細分化
 */
export type UIState =
  // ============================================
  // 初期状態
  // ============================================
  | { type: 'IDLE' }                                        // ゲーム未開始

  // ============================================
  // 議論フェーズ（DISCUSSION）
  // ============================================
  | { type: 'GAME_START_TYPING' }                           // 司会: ゲーム開始セリフ表示中
  | { type: 'GAME_START_TAP_WAIT' }                         // 司会: ゲーム開始セリフ後タップ待ち
  | { type: 'INTERVENTION_WINDOW' }                         // ターン開始時: 介入モーダル表示中
  | { type: 'DISCUSSION_THINKING'; agentIndex: number }     // エージェント: API待ち
  | { type: 'DISCUSSION_TYPING'; agentIndex: number }       // エージェント: タイプライター表示中
  | { type: 'DISCUSSION_TAP_WAIT'; agentIndex: number }     // エージェント: タップ待ち
  | { type: 'DISCUSSION_COMPLETE_TYPING' }                  // 司会: 投票開始セリフ表示中
  | { type: 'DISCUSSION_COMPLETE_TAP_WAIT' }                // 司会: 投票開始セリフ後タップ待ち

  // ============================================
  // 投票フェーズ（VOTING）
  // ============================================
  | { type: 'VOTE_USER_MODAL' }                             // ユーザー投票モーダル表示
  | { type: 'VOTE_FETCHING' }                               // エージェント投票API取得中
  | { type: 'VOTE_REVEAL_TYPING'; voteIndex: number }       // 投票結果表示中
  | { type: 'VOTE_REVEAL_TAP_WAIT'; voteIndex: number }     // 投票結果タップ待ち
  | { type: 'VOTE_GM_ANIMATING' }                           // GM投票アニメーション中
  | { type: 'VOTE_GM_TYPING' }                              // GM投票ログ表示中
  | { type: 'VOTE_GM_TAP_WAIT' }                            // GM投票後タップ待ち

  // ============================================
  // 結果発表フェーズ（RESOLUTION）
  // ============================================
  | { type: 'RESOLUTION_ANNOUNCE_TYPING' }                  // 司会: 退場者発表表示中
  | { type: 'RESOLUTION_ANNOUNCE_TAP_WAIT' }                // 司会: 退場者発表タップ待ち
  | { type: 'RESOLUTION_FETCHING' }                         // 断末魔API取得中
  | { type: 'RESOLUTION_REACTION_TYPING'; elimIndex: number } // 断末魔表示中
  | { type: 'RESOLUTION_REACTION_TAP_WAIT'; elimIndex: number } // 断末魔タップ待ち
  | { type: 'RESOLUTION_EXECUTING'; elimIndex: number }     // 処刑演出中（fainted表示）
  | { type: 'RESOLUTION_NEXT_ROUND_TYPING' }                // 司会: 次ラウンド開始セリフ
  | { type: 'RESOLUTION_NEXT_ROUND_TAP_WAIT' }              // 司会: 次ラウンドタップ待ち

  // ============================================
  // ゲームオーバー（GAME_OVER）
  // ============================================
  | { type: 'GAME_OVER_ANNOUNCE_TYPING' }                   // 司会: ゲーム終了セリフ
  | { type: 'GAME_OVER_ANNOUNCE_TAP_WAIT' }                 // 司会: ゲーム終了タップ待ち
  | { type: 'GAME_OVER_FETCHING' }                          // 勝利コメントAPI取得中
  | { type: 'GAME_OVER_VICTORY_TYPING' }                    // 勝者: 勝利コメント表示中
  | { type: 'GAME_OVER_VICTORY_TAP_WAIT' }                  // 勝者: 勝利コメントタップ待ち
  | { type: 'GAME_OVER_COMPLETE' };                         // ゲーム結果画面へ遷移

// ============================================
// API リクエスト・レスポンス型
// ============================================

export interface TurnRequest {
  gameSessionId: string;
  entryToken?: string;
  agent: Agent;
  allAgents: Agent[];
  recentLogs: LogEntry[];
}

export interface TurnResponse {
  internal_thought: string;
  internal_expression: Expression;
  external_speech: string;
  external_expression: Expression;
}

export interface VoteRequest {
  gameSessionId: string;
  voter: Agent;
  candidates: Agent[];
  allAgents: Agent[];  // 履歴参照用（退場者含む全エージェント）
  recentLogs: LogEntry[];
}

export interface VoteResponse {
  internal_reasoning: string;
  internal_expression: Expression;
  vote_target_id: string;
}

export interface VoteBatchRequest {
  gameSessionId: string;
  voters: Agent[];
  candidates: Agent[];
  allAgents: Agent[];
  recentLogs: LogEntry[];
}

export interface VoteBatchItemResponse {
  voter_id: string;
  vote_target_id: string;
  internal_reasoning: string;
  internal_expression: Expression;
}

export interface VoteBatchResponse {
  votes: VoteBatchItemResponse[];
}

// ============================================
// 議論バッチAPI
// ============================================

export interface DiscussionBatchRequest {
  gameSessionId: string;
  round: number;
  turnInRound: number;
  aliveAgents: Agent[];
  allAgents: Agent[];
  recentLogs: LogEntry[];
  startSpeakerIndex: number;
  generationEpoch: number;
}

export interface DiscussionBatchItem {
  agent_id: string;
  thought: string;
  speech: string;
  thought_expression: Expression;
  speech_expression: Expression;
}

export interface DiscussionBatchResponse {
  generationEpoch: number;
  items: DiscussionBatchItem[];
  consumedInstructionTurns: number;
}

// ============================================
// ゲームステート
// ============================================

export interface GameState {
  phase: GamePhase;
  round: number;
  agents: Agent[];
  logs: LogEntry[];
  currentTurnIndex: number;
  isProcessing: boolean;
}

// ============================================
// 設定システム - 型定義
// ============================================

// ============================================
// ゲーム設定
// ============================================

/** ゲームルール設定 */
export interface GameConfig {
  /** 1ラウンドあたりの発言回数 */
  turnsPerRound: number;

  /** 同率時の処理方法 */
  tieBreaker: 'all_eliminate' | 'no_eliminate' | 'revote';

  /** デバッグモード（1ラウンドで終了） */
  debugMode: boolean;

  /** モックモード（API呼び出しをスキップ） */
  mockMode: boolean;

  /** デバッグ用参加人数（null=通常5人、2-5で指定可能） */
  debugParticipantCount: number | null;

  /** LLMに渡すログの最大件数（コンテキスト制限対策） */
  maxLogsForContext: number;

  /** 断末魔用に渡すログの件数 */
  maxLogsForElimination: number;
}

// ============================================
// UI/演出設定
// ============================================

/** UI設定 */
export interface UIConfig {
  /** タイプライター速度（ms/文字） */
  typewriterSpeed: number;

  /** 思考中のビープ音間隔（文字数ごと） */
  thoughtBeepInterval: number;

  /** 発言中のビープ音間隔（文字数ごと） */
  speechBeepInterval: number;

  /** 口パクアニメーション間隔（ms） */
  mouthAnimationInterval: number;

  /** 口パク確率（0-1） */
  mouthOpenProbability: number;

  /** 投票中ドットアニメーション間隔（ms） */
  votingDotsInterval: number;

  /** CRTエフェクト有効 */
  crtEffectEnabled: boolean;

  /** フリッカーエフェクト有効 */
  flickerEffectEnabled: boolean;
}

/** テーマ設定 */
export interface ThemeConfig {
  /** メインカラー（蛍光グリーン） */
  primaryColor: string;

  /** 暗いメインカラー */
  primaryDimColor: string;

  /** 警告色（赤） */
  alertColor: string;

  /** 背景色 */
  backgroundColor: string;

  /** 「DELETED」表示テキスト */
  deletedText: string;
}

// ============================================
// 音声設定
// ============================================

/** 音声設定 */
export interface AudioConfig {
  /** マスター音量（0-1） */
  masterVolume: number;

  /** アラート音量（0-1） */
  alertVolume: number;

  /** タイプライター音有効 */
  typingSoundEnabled: boolean;

  /** 効果音有効 */
  sfxEnabled: boolean;
}

/** エージェントごとの音声設定 */
export interface AgentVoiceConfig {
  /** ベースピッチ（Hz） */
  basePitch: number;

  /** ピッチ変動幅（Hz） */
  pitchVariation: number;
}

// ============================================
// エージェント設定
// ============================================

/** エージェントの隠しパラメータ */
export interface AgentStats {
  /** 生存本能（高いほど自己保存を優先） */
  survival: number;

  /** 協調性（高いほど協力的） */
  cooperation: number;

  /** 狡猾さ（高いほど策略的） */
  cunning: number;
}

/** エージェント性格設定 */
export interface AgentPersonality {
  characterId: string;
  name: string;
  description: string;
  tone: string;
  stats: AgentStats;
  voicePitch: number;
}

// ============================================
// 統合設定
// ============================================

/** 全設定を統合した型 */
export interface AppConfig {
  game: GameConfig;
  ui: UIConfig;
  theme: ThemeConfig;
  audio: AudioConfig;
  agentVoices: Record<string, AgentVoiceConfig>;
}

/** 設定のカテゴリ */
export type ConfigCategory = keyof AppConfig;

/** 設定変更イベント */
export interface ConfigChangeEvent<K extends ConfigCategory = ConfigCategory> {
  category: K;
  key: keyof AppConfig[K];
  oldValue: unknown;
  newValue: unknown;
}

/** 設定変更リスナー */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

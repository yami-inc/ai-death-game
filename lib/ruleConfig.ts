// ============================================
// 動的ルール設定
// ゲーム中に変更可能なルールとプロンプト注入ポイント
// ============================================

import { DEFAULT_GAME_CONFIG } from './config';

// ============================================
// ゲームルール型定義
// ============================================

export interface GameRules {
  /** 1ラウンドあたりの発言回数 */
  turnsPerRound: number;

  /** 同率時の処理方法 */
  tieBreaker: 'all_eliminate' | 'no_eliminate' | 'revote';
}

// ============================================
// ゲームエフェクト（特殊効果）
// ============================================

export type GameEffectType =
  | 'immunity'              // 投票免除
  | 'vote_weight'           // 投票重み変更
  | 'custom';               // カスタム効果

export interface GameEffect {
  id: string;
  name: string;
  description: string;
  type: GameEffectType;
  targetAgentIds?: string[];  // 対象エージェント（未指定なら全員）
  value?: number;             // 効果の値
  expiresAtRound?: number;    // 有効期限（ラウンド）
}

// ============================================
// 動的プロンプトコンテキスト
// ============================================

export interface DynamicPromptContext {
  /** ゲームマスターからの指示（全エージェントに影響） */
  gmInstructions: string;

  /** 追加ルール（プロンプトに注入） */
  specialRules: string[];

  /** エージェント個別の指示 */
  agentModifiers: Record<string, string>;

  /** 現在のラウンドの特別なコンテキスト */
  roundContext: string;
}

// ============================================
// ルール設定ストア
// ============================================

export interface RuleConfigState {
  rules: GameRules;
  effects: GameEffect[];
  promptContext: DynamicPromptContext;

  /** GM指示の残り適用ターン数（0以下で自動クリア） */
  gmInstructionTurnsRemaining: number;

  /** 介入済みターンキー（`${round}-${turnInRound}`） */
  usedInterventionTurnKeys: string[];
}

export interface RuleConfigActions {
  /** ルールを更新 */
  updateRules: (updates: Partial<GameRules>) => void;

  /** エフェクトを追加 */
  addEffect: (effect: Omit<GameEffect, 'id'>) => string;

  /** エフェクトを削除 */
  removeEffect: (effectId: string) => void;

  /** 期限切れエフェクトをクリア */
  clearExpiredEffects: (currentRound: number) => void;

  /** GM指示を設定（turnsで適用ターン数を指定、0で永続） */
  setGMInstructions: (instructions: string, turns?: number) => void;

  /** GM指示をクリア */
  clearGMInstructions: () => void;

  /** GM指示の1ターン消費（0になったら自動クリア、クリアされたらtrueを返す） */
  consumeGMInstructionTurn: () => boolean;

  /** 特殊ルールを追加 */
  addSpecialRule: (rule: string) => void;

  /** 特殊ルールをクリア */
  clearSpecialRules: () => void;

  /** エージェント個別指示を設定 */
  setAgentModifier: (agentId: string, modifier: string) => void;

  /** ラウンドコンテキストを設定 */
  setRoundContext: (context: string) => void;

  /** すべてをリセット */
  reset: () => void;

  /** エージェントが免除されているか確認 */
  isAgentImmune: (agentId: string) => boolean;
}

// ============================================
// デフォルト値
// ============================================

export const createDefaultRules = (): GameRules => ({
  turnsPerRound: DEFAULT_GAME_CONFIG.turnsPerRound,
  tieBreaker: 'all_eliminate',
});

export const createDefaultPromptContext = (): DynamicPromptContext => ({
  gmInstructions: '',
  specialRules: [],
  agentModifiers: {},
  roundContext: '',
});

// ============================================
// ルール設定マネージャー
// ============================================

export interface RuleConfigManager extends RuleConfigState, RuleConfigActions {}

export const createRuleConfigManager = (): RuleConfigManager => {
  let state: RuleConfigState = {
    rules: createDefaultRules(),
    effects: [],
    promptContext: createDefaultPromptContext(),
    gmInstructionTurnsRemaining: 0,
    usedInterventionTurnKeys: [],
  };

  const generateEffectId = (): string => {
    return `effect-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  const manager: RuleConfigManager = {
    get rules() {
      return state.rules;
    },

    get effects() {
      return state.effects;
    },

    get promptContext() {
      return state.promptContext;
    },

    get gmInstructionTurnsRemaining() {
      return state.gmInstructionTurnsRemaining;
    },

    get usedInterventionTurnKeys() {
      return state.usedInterventionTurnKeys;
    },

    updateRules: (updates: Partial<GameRules>) => {
      state = {
        ...state,
        rules: { ...state.rules, ...updates },
      };
    },

    addEffect: (effect: Omit<GameEffect, 'id'>): string => {
      const id = generateEffectId();
      const newEffect: GameEffect = { ...effect, id };
      state = {
        ...state,
        effects: [...state.effects, newEffect],
      };
      return id;
    },

    removeEffect: (effectId: string) => {
      state = {
        ...state,
        effects: state.effects.filter((e) => e.id !== effectId),
      };
    },

    clearExpiredEffects: (currentRound: number) => {
      const before = state.effects.length;
      state = {
        ...state,
        effects: state.effects.filter(
          (e) => !e.expiresAtRound || e.expiresAtRound > currentRound
        ),
      };
      const removed = before - state.effects.length;
      if (removed > 0) {
      }
    },

    setGMInstructions: (instructions: string, turns: number = 0) => {
      state = {
        ...state,
        promptContext: { ...state.promptContext, gmInstructions: instructions },
        gmInstructionTurnsRemaining: turns,
      };
    },

    clearGMInstructions: () => {
      state = {
        ...state,
        promptContext: { ...state.promptContext, gmInstructions: '' },
        gmInstructionTurnsRemaining: 0,
      };
    },

    consumeGMInstructionTurn: () => {
      // GM指示がない、または永続（0）の場合は何もしない
      if (!state.promptContext.gmInstructions || state.gmInstructionTurnsRemaining <= 0) {
        return false;
      }

      const remaining = state.gmInstructionTurnsRemaining - 1;

      if (remaining <= 0) {
        // 残りターン0 → 自動クリア
        state = {
          ...state,
          promptContext: { ...state.promptContext, gmInstructions: '' },
          gmInstructionTurnsRemaining: 0,
        };
        return true;
      } else {
        state = {
          ...state,
          gmInstructionTurnsRemaining: remaining,
        };
        return false;
      }
    },

    addSpecialRule: (rule: string) => {
      state = {
        ...state,
        promptContext: {
          ...state.promptContext,
          specialRules: [...state.promptContext.specialRules, rule],
        },
      };
    },

    clearSpecialRules: () => {
      state = {
        ...state,
        promptContext: { ...state.promptContext, specialRules: [] },
      };
    },

    setAgentModifier: (agentId: string, modifier: string) => {
      state = {
        ...state,
        promptContext: {
          ...state.promptContext,
          agentModifiers: {
            ...state.promptContext.agentModifiers,
            [agentId]: modifier,
          },
        },
      };
    },

    setRoundContext: (context: string) => {
      state = {
        ...state,
        promptContext: { ...state.promptContext, roundContext: context },
      };
    },

    reset: () => {
      state = {
        rules: createDefaultRules(),
        effects: [],
        promptContext: createDefaultPromptContext(),
        gmInstructionTurnsRemaining: 0,
        usedInterventionTurnKeys: [],
      };
    },

    isAgentImmune: (agentId: string): boolean => {
      return state.effects.some(
        (e) =>
          e.type === 'immunity' &&
          (!e.targetAgentIds || e.targetAgentIds.includes(agentId))
      );
    },
  };

  return manager;
};

// シングルトンインスタンス
export const ruleConfig = createRuleConfigManager();

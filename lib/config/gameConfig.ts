// ============================================
// ゲーム設定
// ============================================

import type { GameConfig } from './types';

// ============================================
// デフォルト値
// ============================================

export const DEFAULT_GAME_CONFIG: GameConfig = {
  // 1ラウンドあたりの発言回数
  turnsPerRound: 2,

  // 同率時の処理（全員退場）
  tieBreaker: 'all_eliminate',

  // デバッグモード（本番はfalse）
  debugMode: false,

  // モックモード（本番はfalse）
  mockMode: false,

  // デバッグ用参加人数（null=通常5人）
  debugParticipantCount: 5,

  // LLMに渡すログの最大件数（投票ログまとめ後の件数）
  maxLogsForContext: 15,

  // 断末魔用に渡すログの件数
  maxLogsForElimination: 10,
};

// ============================================
// ゲーム設定マネージャー
// ============================================

class GameConfigManager {
  private config: GameConfig;
  private listeners: Set<(config: GameConfig) => void> = new Set();

  constructor() {
    this.config = { ...DEFAULT_GAME_CONFIG };
  }

  /** 現在の設定を取得 */
  get(): GameConfig {
    return { ...this.config };
  }

  /** 個別の設定値を取得 */
  getValue<K extends keyof GameConfig>(key: K): GameConfig[K] {
    return this.config[key];
  }

  /** 設定を更新 */
  update(updates: Partial<GameConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // 変更があった場合のみリスナーに通知
    if (JSON.stringify(oldConfig) !== JSON.stringify(this.config)) {
      this.notifyListeners();
    }
  }

  /** 個別の設定値を更新 */
  setValue<K extends keyof GameConfig>(key: K, value: GameConfig[K]): void {
    if (this.config[key] !== value) {
      this.config[key] = value;
      this.notifyListeners();
    }
  }

  /** デフォルトにリセット */
  reset(): void {
    this.config = { ...DEFAULT_GAME_CONFIG };
    this.notifyListeners();
  }

  /** 変更リスナーを登録 */
  subscribe(listener: (config: GameConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const config = this.get();
    this.listeners.forEach((listener) => listener(config));
  }

  /** 設定をJSONとしてエクスポート */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /** JSONから設定をインポート */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      // 型チェック（基本的なバリデーション）
      if (typeof parsed.turnsPerRound !== 'number') return false;
      if (!['all_eliminate', 'no_eliminate', 'revote'].includes(parsed.tieBreaker)) return false;

      this.update(parsed);
      return true;
    } catch {
      return false;
    }
  }
}

// シングルトンインスタンス
export const gameConfig = new GameConfigManager();

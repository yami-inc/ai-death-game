// ============================================
// 設定システム - 統合エクスポート
// ============================================

// 型定義
export type {
  GameConfig,
  UIConfig,
  ThemeConfig,
  AudioConfig,
  AgentVoiceConfig,
  AgentStats,
  AgentPersonality,
  AppConfig,
  ConfigCategory,
  ConfigChangeEvent,
  ConfigChangeListener,
} from './types';

// ゲーム設定
export { gameConfig, DEFAULT_GAME_CONFIG } from './gameConfig';

// UI/テーマ設定
export { uiConfig, DEFAULT_UI_CONFIG, DEFAULT_THEME_CONFIG } from './uiConfig';

// 音声設定
export { audioConfig, DEFAULT_AUDIO_CONFIG, DEFAULT_AGENT_VOICES } from './audioConfig';

// ============================================
// 統合設定マネージャー
// ============================================

import { gameConfig } from './gameConfig';
import { uiConfig } from './uiConfig';
import { audioConfig } from './audioConfig';

/**
 * 全設定を一括管理するファサード
 */
class ConfigManager {
  /** ゲーム設定 */
  get game() {
    return gameConfig;
  }

  /** UI設定 */
  get ui() {
    return uiConfig;
  }

  /** 音声設定 */
  get audio() {
    return audioConfig;
  }

  /** 全設定をリセット */
  resetAll(): void {
    gameConfig.reset();
    uiConfig.reset();
    audioConfig.reset();
  }

  /** 全設定をJSONとしてエクスポート */
  exportAll(): string {
    return JSON.stringify(
      {
        game: gameConfig.get(),
        ui: uiConfig.get(),
        theme: uiConfig.getTheme(),
        audio: audioConfig.get(),
      },
      null,
      2
    );
  }

  /** JSONから全設定をインポート */
  importAll(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (parsed.game) gameConfig.update(parsed.game);
      if (parsed.ui) uiConfig.update(parsed.ui);
      if (parsed.theme) uiConfig.updateTheme(parsed.theme);
      if (parsed.audio) audioConfig.update(parsed.audio);
      return true;
    } catch {
      return false;
    }
  }

  /** ローカルストレージに保存 */
  saveToLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('ai-deathgame-config', this.exportAll());
  }

  /** ローカルストレージから読み込み */
  loadFromLocalStorage(): boolean {
    if (typeof localStorage === 'undefined') return false;
    const saved = localStorage.getItem('ai-deathgame-config');
    if (!saved) return false;
    return this.importAll(saved);
  }
}

// シングルトンインスタンス
export const config = new ConfigManager();

// ============================================
// UI/演出設定
// ============================================

import type { UIConfig, ThemeConfig } from './types';

// ============================================
// デフォルト値
// ============================================

export const DEFAULT_UI_CONFIG: UIConfig = {
  // タイプライター速度（ms/文字）
  typewriterSpeed: 30,

  // 思考中のビープ音間隔（4文字ごと）
  thoughtBeepInterval: 4,

  // 発言中のビープ音間隔（2文字ごと）
  speechBeepInterval: 2,

  // 口パクアニメーション間隔（ms）
  mouthAnimationInterval: 100,

  // 口パク確率（50%）
  mouthOpenProbability: 0.5,

  // 投票中ドットアニメーション間隔（ms）
  votingDotsInterval: 300,

  // CRTエフェクト有効
  crtEffectEnabled: true,

  // フリッカーエフェクト有効
  flickerEffectEnabled: true,
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  // メインカラー（蛍光グリーン）
  primaryColor: '#33ff00',

  // 暗いメインカラー
  primaryDimColor: '#005500',

  // 警告色（赤）
  alertColor: '#ff0055',

  // 背景色
  backgroundColor: '#050505',

  // 「DELETED」表示テキスト
  deletedText: 'DELETED',
};

// ============================================
// UI設定マネージャー
// ============================================

class UIConfigManager {
  private config: UIConfig;
  private theme: ThemeConfig;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.config = { ...DEFAULT_UI_CONFIG };
    this.theme = { ...DEFAULT_THEME_CONFIG };
  }

  /** 現在のUI設定を取得 */
  get(): UIConfig {
    return { ...this.config };
  }

  /** 現在のテーマ設定を取得 */
  getTheme(): ThemeConfig {
    return { ...this.theme };
  }

  /** 個別のUI設定値を取得 */
  getValue<K extends keyof UIConfig>(key: K): UIConfig[K] {
    return this.config[key];
  }

  /** 個別のテーマ設定値を取得 */
  getThemeValue<K extends keyof ThemeConfig>(key: K): ThemeConfig[K] {
    return this.theme[key];
  }

  /** UI設定を更新 */
  update(updates: Partial<UIConfig>): void {
    this.config = { ...this.config, ...updates };
    this.notifyListeners();
  }

  /** テーマ設定を更新 */
  updateTheme(updates: Partial<ThemeConfig>): void {
    this.theme = { ...this.theme, ...updates };
    this.applyThemeToDOM();
    this.notifyListeners();
  }

  /** デフォルトにリセット */
  reset(): void {
    this.config = { ...DEFAULT_UI_CONFIG };
    this.theme = { ...DEFAULT_THEME_CONFIG };
    this.applyThemeToDOM();
    this.notifyListeners();
  }

  /** 変更リスナーを登録 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  /** テーマをDOMに適用（CSS変数更新） */
  private applyThemeToDOM(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--phosphor-green', this.theme.primaryColor);
    root.style.setProperty('--phosphor-dim', this.theme.primaryDimColor);
    root.style.setProperty('--alert-red', this.theme.alertColor);
    root.style.setProperty('--terminal-bg', this.theme.backgroundColor);
  }

  /** CRTエフェクトを切り替え */
  toggleCRTEffect(enabled?: boolean): void {
    const newValue = enabled ?? !this.config.crtEffectEnabled;
    this.config.crtEffectEnabled = newValue;
    this.notifyListeners();
  }

  /** フリッカーエフェクトを切り替え */
  toggleFlickerEffect(enabled?: boolean): void {
    const newValue = enabled ?? !this.config.flickerEffectEnabled;
    this.config.flickerEffectEnabled = newValue;
    this.notifyListeners();
  }

  /** 設定をJSONとしてエクスポート */
  export(): string {
    return JSON.stringify({ ui: this.config, theme: this.theme }, null, 2);
  }

  /** JSONから設定をインポート */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (parsed.ui) this.update(parsed.ui);
      if (parsed.theme) this.updateTheme(parsed.theme);
      return true;
    } catch {
      return false;
    }
  }
}

// シングルトンインスタンス
export const uiConfig = new UIConfigManager();

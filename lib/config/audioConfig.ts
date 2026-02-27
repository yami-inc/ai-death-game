// ============================================
// 音声設定
// ============================================

import type { AudioConfig, AgentVoiceConfig } from './types';

// ============================================
// デフォルト値
// ============================================

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  // マスター音量（0-1）
  masterVolume: 0.075,

  // アラート音量（0-1）
  alertVolume: 0.3,

  // タイプライター音有効
  typingSoundEnabled: true,

  // 効果音有効
  sfxEnabled: true,
};

/** エージェントごとの音声設定デフォルト */
export const DEFAULT_AGENT_VOICES: Record<string, AgentVoiceConfig> = {
  'agent-0': { basePitch: 120, pitchVariation: 20 }, // yumi: 高め
  'agent-1': { basePitch: 160, pitchVariation: 20 }, // kenichiro: やや高め
  'agent-2': { basePitch: 200, pitchVariation: 20 }, // kiyohiko: 高め
  'agent-3': { basePitch: 140, pitchVariation: 20 }, // shoko: 中程度
  'agent-4': { basePitch: 180, pitchVariation: 20 }, // tetsuo: やや高め
  'master': { basePitch: 80, pitchVariation: 10 },   // 司会者: 最も低い
};

// ============================================
// 音声設定マネージャー
// ============================================

class AudioConfigManager {
  private config: AudioConfig;
  private agentVoices: Record<string, AgentVoiceConfig>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.config = { ...DEFAULT_AUDIO_CONFIG };
    this.agentVoices = { ...DEFAULT_AGENT_VOICES };
  }

  /** 現在の設定を取得 */
  get(): AudioConfig {
    return { ...this.config };
  }

  /** 個別の設定値を取得 */
  getValue<K extends keyof AudioConfig>(key: K): AudioConfig[K] {
    return this.config[key];
  }

  /** エージェントの音声設定を取得 */
  getAgentVoice(agentId: string): AgentVoiceConfig {
    return this.agentVoices[agentId] ?? { basePitch: 150, pitchVariation: 20 };
  }

  /** 設定を更新 */
  update(updates: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...updates };
    this.notifyListeners();
  }

  /** マスター音量を設定（0-1） */
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.notifyListeners();
  }

  /** タイプライター音を切り替え */
  toggleTypingSound(enabled?: boolean): void {
    this.config.typingSoundEnabled = enabled ?? !this.config.typingSoundEnabled;
    this.notifyListeners();
  }

  /** 効果音を切り替え */
  toggleSFX(enabled?: boolean): void {
    this.config.sfxEnabled = enabled ?? !this.config.sfxEnabled;
    this.notifyListeners();
  }

  /** エージェントの音声設定を更新 */
  setAgentVoice(agentId: string, voice: Partial<AgentVoiceConfig>): void {
    const current = this.getAgentVoice(agentId);
    this.agentVoices[agentId] = { ...current, ...voice };
    this.notifyListeners();
  }

  /** デフォルトにリセット */
  reset(): void {
    this.config = { ...DEFAULT_AUDIO_CONFIG };
    this.agentVoices = { ...DEFAULT_AGENT_VOICES };
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

  /** ミュート状態かどうか */
  isMuted(): boolean {
    return this.config.masterVolume === 0;
  }

  /** ミュート切り替え */
  toggleMute(): void {
    if (this.isMuted()) {
      this.setMasterVolume(DEFAULT_AUDIO_CONFIG.masterVolume);
    } else {
      this.setMasterVolume(0);
    }
  }

  /** 設定をJSONとしてエクスポート */
  export(): string {
    return JSON.stringify(
      { audio: this.config, agentVoices: this.agentVoices },
      null,
      2
    );
  }

  /** JSONから設定をインポート */
  import(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (parsed.audio) this.update(parsed.audio);
      if (parsed.agentVoices) {
        Object.entries(parsed.agentVoices).forEach(([id, voice]) => {
          this.setAgentVoice(id, voice as Partial<AgentVoiceConfig>);
        });
      }
      return true;
    } catch {
      return false;
    }
  }
}

// シングルトンインスタンス
export const audioConfig = new AudioConfigManager();

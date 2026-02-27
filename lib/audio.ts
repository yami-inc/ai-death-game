'use client';

// ============================================
// オーディオサービス (レトロサウンドエフェクト)
// ============================================

// エージェントごとのベースピッチ（Hz）
const AGENT_PITCHES: Record<string, number> = {
  'agent-0': 120,  // yumi: 低め（重厚）
  'agent-1': 160,  // kenichiro: やや低め（柔らか）
  'agent-2': 200,  // kiyohiko: 中間（軽快）
  'agent-3': 140,  // shoko: 低め（不穏）
  'agent-4': 180,  // tetsuo: やや高め（威厳）
  'master': 80,    // 司会: 最も低い（威圧的）
};

class AudioService {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  initialize() {
    if (typeof window === 'undefined') return;

    if (!this.context) {
      this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.075; // 音量を半分に（0.15 → 0.075）
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  // タイプライター音（エージェントIDでピッチを変える）
  playTypingBlip(agentId?: string) {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    // レトロな矩形波
    osc.type = 'square';
    
    // エージェントごとにベースピッチを変える
    const basePitch = agentId ? (AGENT_PITCHES[agentId] || 150) : 150;
    // ランダムな揺らぎを追加（±20Hz）
    const pitch = basePitch + (Math.random() * 40 - 20);
    osc.frequency.setValueAtTime(pitch, this.context.currentTime);

    // エンベロープ
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.context.currentTime + 0.06);
  }

  // アラート音
  playAlert() {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, this.context.currentTime); // 音量を下げる
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.context.currentTime + 0.3);
  }

  // 票数増加パルス音（投票アニメーション用）
  playPulseBeep() {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    // 高めのパルス音
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, this.context.currentTime);

    // 短いエンベロープ
    gain.gain.setValueAtTime(0, this.context.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.context.currentTime + 0.1);
  }

  // 処刑音（ファミコン風ショッキングサウンド）
  playEliminationSound() {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // 1. 高音から急降下するノコギリ波（メイン）
    const osc1 = this.context.createOscillator();
    const gain1 = this.context.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(50, now + 0.4);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // 2. 短いノイズバースト（衝撃感）
    const bufferSize = this.context.sampleRate * 0.15;
    const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    noiseSource.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.15);

    // 3. 低音の矩形波（不穏な余韻）
    const osc2 = this.context.createOscillator();
    const gain2 = this.context.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(60, now + 0.2);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.2, now + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.7);
  }
}

export const audioService = new AudioService();

# AIデスゲームシミュレーター / AI Death Game Simulator

> 5体のLLMエージェントが生き残りをかけた心理戦を行うシミュレーター
>
> A simulator where 5 LLM agents engage in a psychological death game for survival

**[Play the demo](https://deathgame.ai.yami.net/)** | Made by [YAMI AI](https://ai.yami.net/)

<!-- スクリーンショットは後日追加予定 -->

---

## English

### What is this?

A browser-based simulator where 5 AI agents (powered by Gemini) debate, betray, and vote to eliminate each other in a death game. You play as the Game Master (GM) - intervene in discussions, cast votes, or force-eliminate agents.

**No server required.** Your Gemini API key stays in your browser (sessionStorage) and is sent directly to Google's API.

### Quick Start

```bash
git clone https://github.com/yami-inc/ai-death-game.git
cd ai-death-game
npm install
npm run dev
```

Open http://localhost:3000, enter your [Gemini API key](https://aistudio.google.com/apikey) (free), and start the game.

### Game Rules

- 5 participants selected randomly from a pool of up to 14 characters (hidden characters unlock via trophies)
- 2 rounds of discussion → vote → elimination. Repeat until 1 survivor
- GM powers: inject text instructions, force-eliminate, add extra votes

### Tech Stack

Next.js 14 / React 18 / Zustand / Tailwind CSS / @google/genai SDK

### License

[MIT License](LICENSE) - Code is free to use, modify, and distribute.

Character images in `public/agents/` are licensed under [CC BY 4.0](public/agents/LICENSE).

---

## 日本語

### 概要

- AIたちが命をかけて議論するデスゲーム
- あなたはGM（ゲームマスター）として介入・投票できる
- ブラウザのみで動作、サーバー不要
- Gemini APIキー（無料取得可）が必要

### 必要なもの

- Node.js 18以上
- Gemini APIキー（[Google AI Studio](https://aistudio.google.com/apikey) で無料取得）

### セットアップ

```bash
git clone https://github.com/yami-inc/ai-death-game.git
cd ai-death-game
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開き、APIキーを入力してゲーム開始。

### ゲームルール

- 参加者5名（最大14人プールからランダム選出。トロフィー獲得で段階的に隠しキャラ解放）
- 議論2周 → 投票 → 退場。最後の1人まで
- GM介入：テキスト指示挿入、投票フェーズでの強制退場/1票追加

### APIキーについて

- ブラウザから直接GoogleのGemini APIに送信
- サーバーには一切送信されない（サーバーが存在しない）
- sessionStorageに一時保存、タブを閉じると消去
- 無料枠で十分プレイ可能

### 使用モデル

- `gemini-3-flash-preview`（議論）
- `gemini-2.5-flash`（投票・リアクション）

#### モデルが廃止された場合

Geminiモデルが廃止・名称変更された場合は、`lib/byokClient.ts` の先頭付近にあるモデル定数を新しいモデル名に書き換えてください。

```typescript
// lib/byokClient.ts
const BYOK_PRIMARY_MODEL = 'gemini-3-flash-preview';  // ← ここを変更
const BYOK_FALLBACK_MODEL = 'gemini-2.5-flash';       // ← ここを変更
```

### 技術スタック

Next.js 14 / React 18 / Zustand / Tailwind CSS / @google/genai SDK

### 参考: クラウドへのデプロイ

#### Vercel（推奨）

Vercelにインポートするだけで動作します。サーバーサイドの処理はないため、静的サイトと同等のコストで運用可能です。

#### Cloud Run

Next.js のスタンドアロンビルドを Docker コンテナとして Cloud Run にデプロイ可能です。Dockerfile の作成が必要になります。

## ライセンス

- コード: [MIT License](LICENSE)
- キャラクター画像 (`public/agents/`): [CC BY 4.0](public/agents/LICENSE)

## コントリビューション

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

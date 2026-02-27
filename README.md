# AIデスゲーム / AI Death Game

> 5人のAIによる心理戦を観測し、GMとして介入せよ
>
> Watch 5 AI agents debate, betray, and eliminate each other — and intervene as Game Master

[![Play Demo](https://img.shields.io/badge/Play_Demo-33ff00?style=for-the-badge&logo=googlechrome&logoColor=black)](https://deathgame.ai.yami.net/)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/uyyzGaGkJ3)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Made by YAMI AI](https://img.shields.io/badge/Made_by-YAMI_AI-black?style=for-the-badge)](https://ai.yami.net/)

<p align="center">
  <img src="public/images/readme/a-main.jpg" alt="AI Death Game" width="720" />
</p>

---

## What is this? / 概要

A browser-based death game simulator powered by Gemini. 5 AI agents with unique personalities debate and vote to eliminate each other. You play as the **Game Master (GM)** — inject instructions into discussions, cast votes, or force-eliminate agents.

**No server required.** Your Gemini API key stays in your browser and is sent directly to Google's API.

Gemini搭載のブラウザ完結型デスゲームシミュレーター。個性豊かな5体のAIエージェントが議論し、投票で互いを追放する。あなたは**GM（ゲームマスター）**として介入できる。

<p align="center">
  <img src="public/images/readme/b-howto.jpg" alt="How to Play" width="640" />
</p>

### GM Intervention / GM介入

議論中にAIへ自由にテキスト指示を出せる。AIたちはその無茶振りに従いながら、命懸けの議論を続ける。

<p align="center">
  <img src="public/images/readme/01-intervene.jpg" alt="GM Intervention" width="300" />
  <img src="public/images/readme/02-moderator.jpg" alt="Moderator announces" width="300" />
  <img src="public/images/readme/03-participant-taking-on-challenging-demands.jpg" alt="Participant responds" width="300" />
</p>

### Characters / 登場人物

14人+司会者のプールからランダムに5人が選出。トロフィー獲得で隠しキャラが解放される。

<p align="center">
  <img src="public/images/readme/c-characters.jpg" alt="Characters" width="640" />
</p>

### Trophies / トロフィー

プレイ結果に応じて実績を獲得。レアトロフィーを集めて隠しキャラを解放しよう。

<p align="center">
  <img src="public/images/readme/d-trophies.jpg" alt="Trophies" width="640" />
</p>

---

## Quick Start / セットアップ

```bash
git clone https://github.com/yami-inc/ai-death-game.git
cd ai-death-game
npm install
npm run dev
```

Open http://localhost:3000, enter your [Gemini API key](https://aistudio.google.com/apikey) (free), and start the game.

ブラウザで http://localhost:3000 を開き、[Gemini APIキー](https://aistudio.google.com/apikey)（無料取得可）を入力してゲーム開始。

---

## Game Rules / ゲームルール

| | |
|---|---|
| **Participants** | 5 agents (from a pool of 14 + hidden characters) |
| **Flow** | Discussion (2 rounds) → Vote → Elimination → Repeat |
| **Elimination** | Most votes = eliminated. Ties = all tied agents eliminated |
| **End** | Last 1 survivor (or 0 = annihilation end) |
| **GM Powers** | Inject text, force-eliminate, add extra votes |

---

## API Key / APIキーについて

- Your key is sent **directly from the browser** to Google's Gemini API
- **No server** stores or proxies your key
- Stored in `sessionStorage` — cleared when you close the tab
- Gemini's free tier is sufficient for playing

### Models / 使用モデル

| Usage | Model |
|-------|-------|
| Discussion | `gemini-3-flash-preview` |
| Voting & Reactions | `gemini-2.5-flash` |

If a model is deprecated, update the constants at the top of `lib/byokClient.ts`.

---

## Tech Stack

Next.js 14 / React 18 / Zustand / Tailwind CSS / @google/genai SDK

---

## Deploy / デプロイ

### Vercel (recommended)

Import to Vercel and it just works. No server-side processing — runs at static-site cost.

### Cloud Run

Build as a standalone Next.js Docker container. Dockerfile creation required.

---

## License / ライセンス

- Code: [MIT License](LICENSE)
- Character images (`public/agents/`): [CC BY 4.0](public/agents/LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

# AI Death Game Simulator - AGENT.md

> このファイルはAIコーディングアシスタント向けのプロジェクト仕様書です。
> 開発者も参考にできますが、主にAIエージェントがコードベースを理解するために使用します。

## 1. プロジェクト概要

**コンセプト**: 「極限状態におけるAIの知性とエゴイズムを観測する」

5体のLLMエージェントが生き残りをかけた心理戦（デスゲーム）を行うシミュレーター。
ブラウザ完結型。ユーザーが自分のGemini APIキーを使い、サーバーは一切不要。

### ビジュアルテーマ
- **スタイル**: レトロ・サイバーパンク / ディストピア調（PC-88/MSX風）
- **カラー**: 黒背景 + Phosphor Green (#33ff00) + Alert Red (#ff0055)
- **フォント**: DotGothic16（Google Fonts）
- **演出**: CRTオーバーレイ、タイプライター効果、レトロBeep音、口パクアニメーション

---

## 2. ゲームルール（V3 - 即時退場制）

| 項目 | 内容 |
|------|------|
| 参加者 | 5名（最大14人プールからランダム選出） |
| ラウンド構成 | DISCUSSION（2周） → VOTING → RESOLUTION |
| 退場条件 | 最多票 → 即退場（同率は全員退場） |
| 終了条件 | 生存者1名（または0名） |
| 最終ラウンド | 囚人のジレンマ（両者自己投票→両者生存、両者相手投票→両者退場） |

### GM介入
- **GM介入**: 議論中にテキスト指示を挿入（1ターン1回、Geminiモデレーション）
- **GM投票**: 投票フェーズで「強制退場 / 1票追加 / 見守る」を選択

---

## 3. 状態管理と画面遷移

### ゲームフェーズ（`lib/store.ts` → `phase`）
```
IDLE → DISCUSSION → VOTING → RESOLUTION → GAME_OVER
                ↑                  │
                └──────────────────┘  （生存者2名以上で次ラウンド）
```
- `DISCUSSION`: `currentTurnIndex` で1人ずつ発言。2周で `VOTING` へ
- `VOTING`: 全員並列でAPI取得 → `showNextVoteLog()` で順次表示
- `RESOLUTION`: `eliminationQueue` + `eliminationSubPhase` で断末魔→退場処理

### 画面フェーズ（`app/game/page.tsx` → `screenPhase`）
```
'member-selection' → 'game' ⇄ 'log'
                       ↓
                   'game-over'
```
※ 2つの状態マシンが別軸で動く。`phase` はゲームロジック、`screenPhase` はUI表示を制御。

---

## 4. ファイル構成

主要ディレクトリ:
- `app/` - ページ（`/`, `/byok`, `/game`）
- `components/new/` - UIコンポーネント
- `lib/` - ロジック（`store.ts`, `byokClient.ts`, `constants.ts`, `trophies.ts` 等）
- `lib/config/` - 設定システム（`gameConfig`, `uiConfig`, `audioConfig`）
- `public/agents/` - キャラ画像（`{character}_{expression}_{mouth}.jpg`, 640x640, JPG Q60）

### キャラクターID（14人 + 司会者）

#### 常時選出可能（10人）
`yumi`, `kenichiro`, `kiyohiko`, `shoko`, `tetsuo`, `yusuke`, `moka`, `tsumugu`, `nao`, `aki`

#### 段階解放（4人 — トロフィーレア度に応じて解放）
| キャラID | 名前 | 解放条件 | 特徴 |
|---------|------|---------|------|
| `isekai` | 天青 | ★2トロフィー | 戦国武士（タイムスリップ）。武士口調 |
| `devil` | 魔王 | ★3トロフィー | 魔王。意外と純真 |
| `yurei` | 零子 | ★4トロフィー | 浮遊霊。生存本能10。成仏したいが生かされ続ける |
| `tenshi` | 天使 | ★5トロフィー | 魔王を追う天使。協調性100、狡猾さ0。嘘の概念がない |

#### 司会者
`master` — ゲーム進行役（プレイヤーキャラではない）

### 解放システム（`lib/hiddenCharacter.ts`）
- localStorage `deathgame_max_rarity` にプレイヤーの最高トロフィーレア度を記録
- `AGENT_PERSONALITIES` の `unlockTier` 以下のレア度を達成したキャラが選出プールに追加
- ゲームオーバー時に新たに解放されたキャラを通知

### 表情・画像
- 表情: `default`, `painful`, `happy`, `fainted`
- 口: `0`（閉）, `1`（開）
- 画像パス例: `/agents/yumi_happy_1.jpg`

---

## 5. LLM構成

ブラウザから直接 Google AI Studio（Gemini API）に接続。サーバー不要。

### モデル一覧（`lib/byokClient.ts` にハードコード）

| 用途 | モデル |
|------|--------|
| 議論（プライマリ） | `gemini-3-flash-preview` |
| 議論（フォールバック） | `gemini-2.5-flash` |
| 投票バッチ | `gemini-2.5-flash` |
| 断末魔・勝利コメント | `gemini-2.5-flash` |
| GMモデレーション | `gemini-2.5-flash` |

### LLM出力形式
- 議論: `[expression]内心テキスト|||[expression]発言テキスト`
- 投票: JSON `{ internal_reasoning, internal_expression, vote_target_id }`

### パーサー制限（`lib/turnResponseParser.ts`）

| パラメータ | 値 |
|------------|-----|
| `MAX_DISCUSSION_THOUGHT_CHARS` | 400 |
| `MAX_DISCUSSION_SPEECH_CHARS` | 800 |
| `MAX_DISCUSSION_SENTENCES` | 6 |

`|||` 区切りがない出力は、2つ目の表情タグ位置で自動分割するフォールバックあり。

### フォールバックチェーン
1. Primary (gemini-3-flash-preview) + ThinkingLevel.MINIMAL
2. Fallback (gemini-2.5-flash) + thinkingBudget: 0
3. テキストフォールバック（'……'）+ エラートースト通知

---

## 6. 環境変数

なし。APIキーはブラウザ上でユーザーが直接入力し、sessionStorageに一時保存される。

---

## 7. 既知の課題

- コンテキスト長制限への対応（ラウンド進行時のトークン増加）
- 長時間プレイ時のメモリ使用量
- Geminiモデル廃止時は `lib/byokClient.ts` 先頭のモデル定数を差し替え

// ============================================
// プレイ回数制限（LocalStorage）
// 日本時間0時リセット、デフォルト1日10回まで
// ============================================

// キーをバージョン更新して、旧カウンタを一度リセットする
const STORAGE_KEY = 'deathgame_play_limit_v3_20260216';
const DEFAULT_MAX_PLAYS_PER_DAY = 10;
const MAX_PLAYS_PER_DAY = DEFAULT_MAX_PLAYS_PER_DAY;

interface PlayData {
  date: string; // YYYY-MM-DD（日本時間）
  count: number;
}

/**
 * 日本時間の今日の日付を取得（YYYY-MM-DD形式）
 */
function getTodayJST(): string {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
}

/**
 * LocalStorageからプレイデータを取得
 */
function getPlayData(): PlayData {
  if (typeof window === 'undefined') {
    return { date: getTodayJST(), count: 0 };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { date: getTodayJST(), count: 0 };
    }

    const data: PlayData = JSON.parse(stored);
    const today = getTodayJST();

    // 日付が変わっていたらリセット
    if (data.date !== today) {
      return { date: today, count: 0 };
    }

    return data;
  } catch (e) {
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    return { date: getTodayJST(), count: 0 };
  }
}

/**
 * プレイデータを保存
 */
function savePlayData(data: PlayData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // LocalStorage使用不可（プライベートブラウジング等）の場合は無視
    // プレイ回数制限が機能しないだけでゲーム進行には影響しない
  }
}

/**
 * 今日の残りプレイ回数を取得
 */
export function getRemainingPlays(): number {
  const data = getPlayData();
  return Math.max(0, MAX_PLAYS_PER_DAY - data.count);
}

/**
 * 今日のプレイ回数を取得
 */
export function getTodayPlayCount(): number {
  return getPlayData().count;
}

/**
 * プレイ可能かどうかをチェック
 */
export function canPlay(): boolean {
  return getRemainingPlays() > 0;
}

/**
 * プレイ回数を消費（最初の有効なAI応答時に呼ぶ）
 * @returns 消費後の残り回数（-1の場合はプレイ不可だった）
 */
export function consumePlay(): number {
  const data = getPlayData();

  if (data.count >= MAX_PLAYS_PER_DAY) {
    return -1;
  }

  data.count++;
  savePlayData(data);

  return MAX_PLAYS_PER_DAY - data.count;
}

/**
 * 1日の最大プレイ回数を取得
 */
export function getMaxPlaysPerDay(): number {
  return MAX_PLAYS_PER_DAY;
}

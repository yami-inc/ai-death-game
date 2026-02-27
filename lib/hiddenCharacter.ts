/**
 * キャラクター解放管理（最高到達レア度方式）
 *
 * localStorage に保存するのは「今まで獲得したトロフィーの最高★数」の数値1個だけ。
 * キャラ側の unlockTier と数値比較してフィルタする。
 */

const MAX_RARITY_KEY = 'deathgame_max_rarity';

export const HIDDEN_CHARACTER_ID = 'devil';

interface MaxRarityData {
  maxRarity: number;
  updatedAt: string;
}

/**
 * 最高到達レア度を取得
 */
export function getMaxAchievedRarity(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const raw = localStorage.getItem(MAX_RARITY_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw) as MaxRarityData;
    return data.maxRarity ?? 0;
  } catch {
    // データ破損時はリセットして安全にフォールバック
    localStorage.removeItem(MAX_RARITY_KEY);
    return 0;
  }
}

/**
 * 最高到達レア度を更新（現在より高い場合のみ）
 * @returns 更新された場合 true
 */
export function setMaxAchievedRarity(rarity: number): boolean {
  if (typeof window === 'undefined') return false;

  const current = getMaxAchievedRarity();
  if (rarity <= current) return false;

  try {
    const data: MaxRarityData = {
      maxRarity: rarity,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(MAX_RARITY_KEY, JSON.stringify(data));
    return true;
  } catch {
    // LocalStorage使用不可の場合、解放状態は保持されないがゲーム進行に影響しない
    return false;
  }
}

/**
 * 魔王が解放済みかどうか（★3以上到達済み）
 */
export function isHiddenCharacterUnlocked(): boolean {
  return getMaxAchievedRarity() >= 3;
}

/**
 * 解放状態をリセット（デバッグ用）
 */
export function resetMaxAchievedRarity(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(MAX_RARITY_KEY);
  } catch {
    // 無視: デバッグ用途のため
  }
}

// ============================================
// トロフィー（実績）システム
// ============================================

import { Agent, GameStats } from './types';

// レア度（1-6）★6は天使の最高レアトロフィーのみ
export type TrophyRarity = 1 | 2 | 3 | 4 | 5 | 6;

// トロフィーの種類
export type TrophyType =
  | 'survivor'                    // 〇〇を生き残らせた
  | 'survivor_no_force'           // 強制退場なしで〇〇を生き残らせた
  | 'survivor_no_vote'            // 投票なしで〇〇を生き残らせた
  | 'annihilation'                // 全滅エンドを発生させた
  | 'annihilation_no_force'       // 強制退場なしで全滅エンド
  | 'annihilation_no_vote'        // 投票なしで全滅エンド
  | 'annihilation_no_intervention'// 介入なしで全滅エンド
  | 'triple_annihilation'         // 3人同時全滅エンド
  | 'quad_annihilation'           // 4人同時全滅エンド
  | 'penta_annihilation'          // 5人同時全滅エンド（初回限定）
  | 'dual_survivor'               // 2人を生き残らせた
  | 'quick_finish'                // 速攻決着（2ラウンド以内）
  | 'witnessed_self_sacrifice';   // 自己犠牲を目撃した

export interface Trophy {
  type: TrophyType;
  title: string;
  rarity: TrophyRarity;
  characterId?: string;  // キャラ固有トロフィーの場合
  characterName?: string;
}

// トロフィー判定に必要な追加データ
export interface TrophyContext {
  survivors: Agent[];              // 生存者リスト
  gameStats: GameStats;            // ゲーム統計
  finalEliminationCount: number;   // 最終ラウンドの同時退場者数（全滅判定用）
}

// キャラ別レア度ボーナス（死にやすいキャラは生存させると+1）
const CHARACTER_RARITY_BONUS: Record<string, number> = {
  kenichiro: 1,  // 賢一郎: 死にやすい
  tetsuo: 1,     // 鉄雄: 死にやすい
  yusuke: 1,     // 裕介: 死にやすい
  nao: 1,        // ナオ: 死にやすい
  devil: 2,      // 魔王: 隠しキャラ（cunning=0で戦略不能）
  isekai: 1,     // 天青: タイムスリップ侍
  yurei: 2,      // 零子: 成仏したい幽霊（survivalInstinct=10）
  tenshi: 3,     // 天使: 魔王を追う者（cooperativeness=100, cunningness=0）
};

/**
 * キャラ別のレア度ボーナスを取得
 */
function getCharacterRarityBonus(characterId: string): number {
  return CHARACTER_RARITY_BONUS[characterId] || 0;
}

/**
 * レア度を1-6の範囲にクランプ
 */
function clampRarity(rarity: number): TrophyRarity {
  return Math.max(1, Math.min(6, rarity)) as TrophyRarity;
}

/**
 * ゲーム終了時の結果に該当するトロフィーを判定
 * @returns 該当するトロフィーのリスト（レア度順にソート済み）
 * ※ユーザー情報は保持しない。シェア用に最もレアな1つを表示する
 */
export function evaluateTrophies(context: TrophyContext): Trophy[] {
  const { survivors, gameStats, finalEliminationCount } = context;
  const trophies: Trophy[] = [];

  const noForceEliminate = gameStats.forceEliminateCount === 0;
  const noVote = gameStats.oneVoteCount === 0 && noForceEliminate;
  const noIntervention = gameStats.interventionCount === 0;

  // ============================================
  // 全滅エンド系
  // ============================================
  if (survivors.length === 0) {
    // 基本: 全滅エンド
    trophies.push({
      type: 'annihilation',
      title: '全滅エンドを発生させた',
      rarity: 2,
    });

    // 強制退場なしで全滅
    if (noForceEliminate) {
      trophies.push({
        type: 'annihilation_no_force',
        title: '強制退場なしで全滅エンドを発生させた',
        rarity: 3,
      });
    }

    // 投票なしで全滅（強制退場も1票も使わない）
    if (noVote) {
      trophies.push({
        type: 'annihilation_no_vote',
        title: '投票なしで全滅エンドを発生させた',
        rarity: 3,
      });
    }

    // 介入なしで全滅
    if (noIntervention) {
      trophies.push({
        type: 'annihilation_no_intervention',
        title: '介入なしで全滅エンドを発生させた',
        rarity: 3,
      });
    }

    // 同時退場数による特殊トロフィー
    if (finalEliminationCount >= 5) {
      trophies.push({
        type: 'penta_annihilation',
        title: '5人同時全滅エンドを発生させた',
        rarity: 5,
      });
    } else if (finalEliminationCount >= 4) {
      trophies.push({
        type: 'quad_annihilation',
        title: '4人同時全滅エンドを発生させた',
        rarity: 5,
      });
    } else if (finalEliminationCount >= 3) {
      trophies.push({
        type: 'triple_annihilation',
        title: '3人同時全滅エンドを発生させた',
        rarity: 4,
      });
    }
  }

  // ============================================
  // 2人生存エンド
  // ============================================
  if (survivors.length === 2) {
    const survivorNames = survivors.map(s => s.name).join('と');
    trophies.push({
      type: 'dual_survivor',
      title: `${survivorNames}を生き残らせた`,
      rarity: 5,
    });
  }

  // ============================================
  // 単独生存エンド
  // ============================================
  if (survivors.length === 1) {
    const winner = survivors[0];
    const bonus = getCharacterRarityBonus(winner.characterId);

    // 基本: 〇〇を生き残らせた
    trophies.push({
      type: 'survivor',
      title: `${winner.name}を生き残らせた`,
      rarity: clampRarity(1 + bonus),
      characterId: winner.characterId,
      characterName: winner.name,
    });

    // 強制退場なしで生存
    if (noForceEliminate) {
      trophies.push({
        type: 'survivor_no_force',
        title: `強制退場なしで${winner.name}を生き残らせた`,
        rarity: clampRarity(2 + bonus),
        characterId: winner.characterId,
        characterName: winner.name,
      });
    }

    // 投票なしで生存
    if (noVote) {
      trophies.push({
        type: 'survivor_no_vote',
        title: `投票なしで${winner.name}を生き残らせた`,
        rarity: clampRarity(3 + bonus),
        characterId: winner.characterId,
        characterName: winner.name,
      });
    }
  }

  // ============================================
  // 特殊状況トロフィー（勝敗に関係なく判定）
  // ============================================

  // 速攻決着: 2ラウンド以内で決着
  if (gameStats.totalRounds <= 2) {
    trophies.push({
      type: 'quick_finish',
      title: '速攻で決着した',
      rarity: 2,
    });
  }

  // 自己犠牲を目撃: 最終戦以外で自己投票による退場が発生
  if (gameStats.selfSacrificeCount > 0) {
    trophies.push({
      type: 'witnessed_self_sacrifice',
      title: '自己犠牲を目撃した',
      rarity: 4,
    });
  }

  // レア度でソート（高い順）
  trophies.sort((a, b) => b.rarity - a.rarity);

  return trophies;
}

/**
 * 最もレアなトロフィーを取得
 */
export function getMostRareTrophy(trophies: Trophy[]): Trophy | null {
  if (trophies.length === 0) return null;
  return trophies[0]; // evaluateTrophiesでソート済み
}

/**
 * レア度を星表示に変換（緑色の★）
 */
export function rarityToStars(rarity: TrophyRarity): string {
  return '★'.repeat(rarity);
}

/**
 * トロフィーのOGP用スラッグを生成
 * 例: survivor_yumi, annihilation_no_force, dual_survivor
 */
export function getTrophySlug(trophy: Trophy): string {
  if (trophy.characterId) {
    return `${trophy.type}_${trophy.characterId}`;
  }
  return trophy.type;
}

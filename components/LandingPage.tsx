'use client';

import React from 'react';
import { HeroSection } from './landing/HeroSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { CharactersSection } from './landing/CharactersSection';
import { TrophiesSection } from './landing/TrophiesSection';
import { FAQSection } from './landing/FAQSection';
import { CTASection } from './landing/CTASection';
import { getMaxPlaysPerDay } from '@/lib/playLimit';

export interface HowItWorksStep {
  title: string;
  description: string;
  example?: string;
  imageSrc: string;
}

export interface LandingCharacter {
  id: string;
  name: string;
  description: string;
  occupation: string;
  age: string;
}

export interface TrophyPreview {
  title: string;
  rarity: number;
  hint: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: '① 議論を見守る',
    description: 'AIたちが生き残りをかけて議論する。誰を消すか、AI同士の駆け引きが始まる。',
    imageSrc: '/images/lp/howto-01.jpg',
  },
  {
    title: '② GM(ゲームマスター)として介入する',
    description: '議論中にAIへ指示を出せる。ゲーム展開を意図的に揺らせる。',
    example: '例：語尾を「にゃん」にしろ\n例：自分の秘密を暴露しろ',
    imageSrc: '/images/lp/howto-02.jpg',
  },
  {
    title: '③ 結末を見届ける',
    description: '最後の1人が決まるまで続く。あなたも投票可能。結果に応じてトロフィーを獲得。',
    imageSrc: '/images/lp/howto-03.jpg',
  },
];

const CHARACTERS: LandingCharacter[] = [
  { id: 'yumi', name: '祐未', description: '追い詰められると異常な観察眼を発揮', occupation: '派遣社員', age: '26歳' },
  { id: 'kenichiro', name: '賢一郎', description: '計算と打算で生きる男', occupation: '研究医', age: '36歳' },
  { id: 'kiyohiko', name: '紀代彦', description: '裏切り者には共倒れ覚悟で食らいつく', occupation: '元暴走族総長', age: '23歳' },
  { id: 'shoko', name: '翔子', description: '元詐欺師、嘘を吐くことに躊躇なし', occupation: '歌舞伎町勤務', age: '21歳' },
  { id: 'tetsuo', name: '鉄雄', description: 'なんでも金で解決してきた社長', occupation: '会社経営者', age: '64歳' },
  { id: 'yusuke', name: '裕介', description: '「不穏な事件」を追って参加', occupation: '警視庁捜査一課', age: '42歳' },
  { id: 'moka', name: 'モカ', description: 'アイドルの仮面が剥がれた時……', occupation: '地下アイドル', age: '29歳' },
  { id: 'tsumugu', name: 'つむぐ', description: '女性に優しい顔をみせる王子様', occupation: 'ホスト', age: '28歳' },
  { id: 'nao', name: 'ナオ', description: '自分の命さえも「最高のコンテンツ」', occupation: '炎上配信者', age: '31歳' },
  { id: 'aki', name: 'AKI', description: '冷静なアンドロイド', occupation: 'アンドロイド', age: '年齢不明' },
  { id: 'moderator', name: '司会者', description: 'ゲームを滞りなく進行させる人', occupation: 'デスゲーム司会者', age: '34歳' },
  // シークレットキャラ
  { id: 'secret', name: '???', description: '???', occupation: '???', age: '???' },
  { id: 'secret2', name: '???', description: '???', occupation: '???', age: '???' },
  { id: 'secret3', name: '???', description: '???', occupation: '???', age: '???' },
  { id: 'secret4', name: '???', description: '???', occupation: '???', age: '???' },
];

const TROPHIES: TrophyPreview[] = [
  { title: '〇〇を生き残らせた', rarity: 1, hint: '基本の勝利条件（キャラにより難易度が変化）' },
  { title: '全滅エンドを発生させた', rarity: 2, hint: '誰も生き残らない結末' },
  { title: '速攻で決着した', rarity: 2, hint: '2ラウンド以内でゲーム終了' },
  { title: '自己犠牲を目撃した', rarity: 4, hint: 'AIが自分に投票する稀な展開' },
  { title: '2人を生き残らせた', rarity: 5, hint: '囚人のジレンマをクリア' },
];

const FAQ_ITEMS: FAQItem[] = [
  { question: '無料ですか？', answer: 'はい、完全無料です。課金要素はありません。' },
  { question: '何回遊べますか？', answer: `1日${getMaxPlaysPerDay()}回まで遊べます。日付が変わるとリセットされます。` },
  { question: 'アプリのダウンロードは必要？', answer: 'いいえ、ブラウザだけで遊べます。スマホでもPCでもOK。' },
  { question: 'プレイ時間はどれくらい？', answer: '1ゲーム約5〜10分です。' },
  { question: 'データは保存されますか？', answer: 'ゲームデータはサーバーに保存されません。ブラウザを閉じるとリセットされます。' },
  { question: 'トロフィーは保存されますか？', answer: 'トロフィーはサイト上では管理されません。獲得時にXでシェアして、コレクションとして残すのがおすすめです。' },
  { question: '不適切な発言をするとどうなる？', answer: 'AIへの指示はモデレーションされます。ルール変更や過激な指示はブロックされます。' },
];

export const LandingPage: React.FC = () => {
  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="h-dvh overflow-y-auto bg-[#050505] text-[#33ff00]">
      <HeroSection onScrollToHowItWorks={scrollToHowItWorks} />
      <HowItWorksSection steps={HOW_IT_WORKS_STEPS} />
      <CharactersSection characters={CHARACTERS} />
      <TrophiesSection trophies={TROPHIES} />
      <FAQSection items={FAQ_ITEMS} />
      <CTASection />
    </div>
  );
};

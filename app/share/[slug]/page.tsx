import { Metadata } from 'next';
import ShareRedirectClient from './ShareRedirectClient';

interface OgpData {
  title: string;
  description: string;
  image: string;
}

const CHARACTER_NAMES: Record<string, string> = {
  yumi: '祐未',
  kenichiro: '賢一郎',
  kiyohiko: '紀代彦',
  shoko: '翔子',
  tetsuo: '鉄雄',
  yusuke: '裕介',
  moka: 'モカ',
  tsumugu: 'つむぐ',
  nao: 'ナオ',
  aki: 'AKI',
  devil: '魔王',
  isekai: '天青',
  yurei: '零子',
  tenshi: '天使',
};

function buildCharacterTrophyOgpData(): Record<string, OgpData> {
  const entries: Record<string, OgpData> = {};

  for (const [characterId, characterName] of Object.entries(CHARACTER_NAMES)) {
    entries[`survivor_${characterId}`] = {
      title: `${characterName}を生き残らせた`,
      description: `${characterName}が最後の生存者`,
      image: `/ogp/survivor_${characterId}.jpg`,
    };

    entries[`survivor_no_force_${characterId}`] = {
      title: `強制退場なしで${characterName}を生き残らせた`,
      description: '強制退場を使わずに勝利',
      image: `/ogp/survivor_no_force_${characterId}.jpg`,
    };

    entries[`survivor_no_vote_${characterId}`] = {
      title: `投票なしで${characterName}を生き残らせた`,
      description: 'GM投票を一切使わずに勝利',
      image: `/ogp/survivor_no_vote_${characterId}.jpg`,
    };
  }

  return entries;
}

const TROPHY_OGP_DATA: Record<string, OgpData> = {
  ...buildCharacterTrophyOgpData(),
  annihilation: { title: '全滅エンドを発生させた', description: '誰も生き残れなかった', image: '/ogp/annihilation.jpg' },
  annihilation_no_force: { title: '強制退場なしで全滅エンド', description: '強制退場を使わずに全滅', image: '/ogp/annihilation_no_force.jpg' },
  annihilation_no_vote: { title: '投票なしで全滅エンド', description: 'GM投票を一切使わずに全滅', image: '/ogp/annihilation_no_vote.jpg' },
  annihilation_no_intervention: { title: '介入なしで全滅エンド', description: '議論に一切介入せず全滅', image: '/ogp/annihilation_no_intervention.jpg' },
  triple_annihilation: { title: '3人同時全滅エンド', description: '3人が同票で同時退場', image: '/ogp/triple_annihilation.jpg' },
  quad_annihilation: { title: '4人同時全滅エンド', description: '4人が同票で同時退場', image: '/ogp/quad_annihilation.jpg' },
  penta_annihilation: { title: '5人同時全滅エンド', description: '全員が同票で一斉退場', image: '/ogp/penta_annihilation.jpg' },
  dual_survivor: { title: '2人を生き残らせた', description: '囚人のジレンマで両者生存エンド', image: '/ogp/dual_survivor.jpg' },
  quick_finish: { title: '速攻決着', description: '2ラウンド以内で決着', image: '/ogp/quick_finish.jpg' },
  witnessed_self_sacrifice: { title: '自己犠牲を目撃した', description: 'AIが自ら退場を選んだ', image: '/ogp/witnessed_self_sacrifice.jpg' },
};

const DEFAULT_OGP = {
  title: 'AIデスゲーム',
  description: 'AIたちが命をかけて議論するデスゲーム。GMとして介入せよ',
  image: '/ogp/default.jpg',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ogpData = TROPHY_OGP_DATA[slug] || DEFAULT_OGP;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  return {
    title: `${ogpData.title} | AIデスゲーム`,
    description: ogpData.description,
    openGraph: {
      title: `${ogpData.title} | AIデスゲーム`,
      description: ogpData.description,
      url: `${baseUrl}/share/${slug}`,
      images: [
        {
          url: `${baseUrl}${ogpData.image}`,
          width: 1280,
          height: 720,
          alt: ogpData.title,
        },
      ],
      type: 'website',
      siteName: 'AIデスゲーム',
      locale: 'ja_JP',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${ogpData.title} | AIデスゲーム`,
      description: ogpData.description,
      images: [`${baseUrl}${ogpData.image}`],
    },
  };
}

export default function SharePage() {
  return <ShareRedirectClient />;
}

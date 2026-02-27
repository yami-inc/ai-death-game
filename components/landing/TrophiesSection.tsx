'use client';

import React from 'react';
import type { TrophyPreview } from '../LandingPage';

interface Props {
  trophies: TrophyPreview[];
}

const MAX_STARS = 6;
const formatRarity = (rarity: number) => `${'★'.repeat(rarity)}${'☆'.repeat(Math.max(0, MAX_STARS - rarity))}`;

const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
  </svg>
);

export const TrophiesSection: React.FC<Props> = ({ trophies }) => {
  return (
    <section className="px-4 py-16 md:py-20 bg-[#081408]">
      <div className="max-w-5xl mx-auto">
        <h2 className="lp-jp-heading-flicker text-center text-[clamp(2.24rem,9.6vw,5.12rem)] font-black leading-none tracking-wide text-[#66ff33]">
          トロフィー
        </h2>
        <p className="mb-4 mt-[15px] text-center text-xs font-extrabold uppercase tracking-[0.42em] text-[#8cd779] md:text-sm">
          Trophies
        </p>
        <p className="mb-8 text-center text-base font-bold leading-relaxed text-[#95ef7f] md:text-xl">
          プレイ結果に応じて実績を獲得
          <br />
          数多くのトロフィーを集めろ
        </p>

        <div className="max-w-2xl mx-auto space-y-3">
          {trophies.map((trophy) => (
            <article
              key={trophy.title}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#0c240c] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm text-[#66ff33] md:text-base">
                  <TrophyIcon className="h-4 w-4 shrink-0 text-green-400" />
                  <span className="truncate">{trophy.title}</span>
                </p>
                <p className="text-xs text-[#76c861] mt-1">{trophy.hint}</p>
              </div>
              <span
                className={`text-sm tracking-widest ${
                  trophy.rarity >= 4 ? 'text-[#a6ff91] drop-shadow-[0_0_6px_rgba(102,255,51,0.55)]' : 'text-[#7bd566]'
                }`}
              >
                {formatRarity(trophy.rarity)}
              </span>
            </article>
          ))}
        </div>

        <p className="mt-6 text-center text-sm font-bold text-[#82d46d] md:text-base">※シェア機能でトロフィーを自慢しよう</p>
      </div>
    </section>
  );
};

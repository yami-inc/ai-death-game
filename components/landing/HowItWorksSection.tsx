'use client';

import React from 'react';
import Image from 'next/image';
import type { HowItWorksStep } from '../LandingPage';

interface Props {
  steps: HowItWorksStep[];
}

const VOTING_HIGHLIGHT_PATTERN = /あなたも投票(?:が)?可能。/;

const renderDescription = (description: string) => {
  const match = description.match(VOTING_HIGHLIGHT_PATTERN);
  if (!match || match.index === undefined) {
    return description;
  }

  const highlightPhrase = match[0];
  const highlightIndex = match.index;
  const before = description.slice(0, highlightIndex);
  const after = description.slice(highlightIndex + highlightPhrase.length);

  return (
    <>
      {before}
      <span className="mx-1 inline-block bg-[#33ff00] px-3 py-0.5 text-sm font-black text-black shadow-[0_0_12px_rgba(51,255,0,0.35)]">
        {highlightPhrase}
      </span>
      {after}
    </>
  );
};

export const HowItWorksSection: React.FC<Props> = ({ steps }) => {
  return (
    <section id="how-it-works" className="px-4 py-16 md:py-20 bg-[#081408]">
      <div className="max-w-5xl mx-auto">
        <h2 className="lp-jp-heading-flicker text-center text-[clamp(2.24rem,9.6vw,5.12rem)] font-black leading-none tracking-wide text-[#66ff33]">
          遊び方
        </h2>
        <p className="mb-10 mt-[15px] text-center text-xs font-extrabold uppercase tracking-[0.42em] text-[#8cd779] md:text-sm">
          How To Play
        </p>
        <p className="mb-10 text-center text-sm font-bold leading-relaxed text-[#95ef7f] md:text-xl">
          5人のAIによる心理戦を観測し、GMとして介入せよ
          <br />
          彼らの運命を操る、AIデスゲームシミュレーター
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="bg-[#0c240c] p-4 md:p-5 animate-fade-in"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="relative aspect-[4/3] border-2 border-[#2f8f2f] overflow-hidden mb-4">
                <Image
                  src={step.imageSrc}
                  alt={step.title}
                  fill
                  sizes="(max-width: 768px) 90vw, 28vw"
                  className="object-cover brightness-90 contrast-110"
                />
                <div className="absolute inset-0 crt-overlay opacity-40" />
                <div className="absolute inset-0 bg-[#33ff00]/[0.04] mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/35" />
              </div>
              <h3 className="text-lg font-bold text-[#66ff33] mb-2">{step.title}</h3>
              <p className="text-sm text-[#9dff80] leading-relaxed">{renderDescription(step.description)}</p>
              {step.example && (
                <div className="mt-3 flex flex-col items-start gap-2">
                  {step.example.split('\n').map((exampleLine) => (
                    <p
                      key={exampleLine}
                      className="inline-block rounded-full bg-[#33ff00] px-4 py-1.5 text-xs font-extrabold text-black shadow-[0_0_14px_rgba(51,255,0,0.35)]"
                    >
                      {exampleLine}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

'use client';

import React, { useState } from 'react';
import type { FAQItem } from '../LandingPage';

interface Props {
  items: FAQItem[];
}

export const FAQSection: React.FC<Props> = ({ items }) => {
  const [openIndexes, setOpenIndexes] = useState<number[]>([]);

  const handleOpen = (index: number) => {
    setOpenIndexes((prev) => (prev.includes(index) ? prev : [...prev, index]));
  };

  return (
    <section className="px-4 py-16 md:py-20">
      <div className="max-w-2xl mx-auto">
        <h2 className="lp-jp-heading-flicker text-center text-[clamp(2.24rem,9.6vw,5.12rem)] font-black leading-none tracking-wide text-[#66ff33]">
          FAQ
        </h2>
        <p className="mb-8 mt-[15px] text-center text-xs font-extrabold uppercase tracking-[0.42em] text-[#8cd779] md:text-sm">
          Frequently Asked Questions
        </p>

        <div className="space-y-2">
          {items.map((item, index) => {
            const isOpen = openIndexes.includes(index);
            return (
              <article key={item.question} className="border border-[#246f24] bg-black/45">
                <button
                  onClick={() => handleOpen(index)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#102910] transition-colors"
                >
                  <span className="text-sm md:text-base font-bold text-[#9dff80]">{item.question}</span>
                  <span className="text-[#66ff33] text-lg">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-[#246f24] px-4 py-3 bg-[#0c240c]">
                    <p className="text-sm text-[#86db71] leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

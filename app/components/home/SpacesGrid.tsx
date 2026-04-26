'use client';

import React from 'react';
import { SpacesGridProps } from '../../types/home';

export default function SpacesGrid({ spaces }: SpacesGridProps) {
  return (
    <section className="w-full pb-20">
      <div className="grid grid-cols-2 gap-4">
        {spaces.map((space) => (
          <button
            key={space.id}
            className="group flex flex-col items-start p-5 bg-white border border-stone-100 rounded-3xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 text-left"
          >
            <span className="text-2xl mb-3 bg-stone-50 p-3 rounded-2xl group-hover:bg-stone-100 transition-colors">
              {space.emoji}
            </span>
            <span className="font-semibold text-stone-800 text-base mb-1">
              {space.name}
            </span>
            {space.description && (
              <span className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                {space.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

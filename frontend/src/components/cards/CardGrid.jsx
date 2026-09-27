// ---------------------------------------------------------
// CONTENEDOR GRID RESPONSIVE CON SKELETON LOADERS
// ---------------------------------------------------------
import React from 'react';
import { CardItem } from './CardItem';

export function CardGrid({ cards, onSelectCard, loading = false, skeletonCount = 12 }) {
  // Render de esqueletos mientras se obtienen resultados
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4 animate-pulse">
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div
            key={`skeleton-${idx}`}
            className="flex flex-col bg-neutral-900/60 border border-neutral-800/80 rounded-xl overflow-hidden"
          >
            {/* Aspect ratio idéntico al de las cartas reales */}
            <div className="w-full aspect-[2.5/3.5] bg-neutral-800/40" />
            <div className="p-3 space-y-2 bg-neutral-900/80">
              <div className="h-3.5 bg-neutral-800 rounded w-3/4" />
              <div className="h-2.5 bg-neutral-800/60 rounded w-1/2" />
              <div className="pt-2 flex justify-between">
                <div className="h-3 w-8 bg-neutral-800/50 rounded" />
                <div className="h-3 w-12 bg-neutral-800/50 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 py-4">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          onSelect={onSelectCard}
        />
      ))}
    </div>
  );
}
// ---------------------------------------------------------
// 8. CONTENEDOR GRID RESPONSIVE
// ---------------------------------------------------------
import React from 'react';
import { CardItem } from './CardItem';

export function CardGrid({ cards, onSelectCard }) {
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
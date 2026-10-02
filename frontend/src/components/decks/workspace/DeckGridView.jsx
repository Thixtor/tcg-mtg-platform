// ---------------------------------------------------------
// COMPONENTE: VISTA EN CUADRÍCULA DE CARTAS DEL MAZO
// ---------------------------------------------------------
import React from 'react';
import CardGridItem from '@/components/common/CardGridItem';
import { SECTIONS_CONFIG } from '@/utils/mtgTypeResolver';

export default function DeckGridView({
  groupedCards,
  cardSize,
  hoveredCard,
  isOwner,
  isLightMode,
  onHoverCard,
  onOpenCard,
  onUpdateQuantity,
  onRemoveCard
}) {
  return (
    <div className="space-y-6">
      {SECTIONS_CONFIG.map(({ key, label, icon }) => {
        const group = groupedCards[key];
        if (!group || group.cards.length === 0) return null;

        return (
          <div key={key} className="space-y-2">
            <div className={`flex items-center justify-between pb-1 text-xs font-mono uppercase tracking-wider border-b ${
              isLightMode ? 'border-[#E0D8C8] text-neutral-700' : 'border-neutral-800 text-neutral-300'
            }`}>
              <span className="font-bold flex items-center gap-1.5">
                <span>{icon}</span>
                <span>{label}</span>
              </span>
              <span className="text-amber-500 font-bold">{group.totalQty} cartas</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {group.cards.map((card) => (
                <CardGridItem
                  key={card.deck_card_id || card.id}
                  card={card}
                  cardSize={cardSize}
                  isSelected={hoveredCard?.deck_card_id === card.deck_card_id}
                  isLightMode={isLightMode}
                  onHover={onHoverCard}
                  onClick={() => onOpenCard(card.card_catalog || card)}
                  onIncrement={isOwner ? () => onUpdateQuantity(card, 1) : undefined}
                  onRemove={isOwner ? () => onRemoveCard(card.deck_card_id) : undefined}
                  badgeTopLeft={card.category === 'commander' ? '👑 CMD' : card.status}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
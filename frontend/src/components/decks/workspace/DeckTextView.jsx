// ---------------------------------------------------------
// COMPONENTE: VISTA TEXTUAL EN 3 COLUMNAS CON AUDITORÍA FÍSICA
// ---------------------------------------------------------
import React from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import ManaCost from '@/components/common/ManaSymbol';
import { isCardColorIdentityLegal } from '@/utils/deckLegality';
import { SECTIONS_CONFIG } from '@/utils/mtgTypeResolver';
import { getCardPriceBySource } from '@/utils/pricing';

export default function DeckTextView({
  groupedCards,
  hoveredCard,
  commanders = [],
  commanderIdentity,
  isCommanderFormat,
  priceSource = 'tcgplayer',
  isOwner,
  isLightMode,
  onHoverCard,
  onOpenCard,
  onUpdateCategory,
  onUpdateQuantity,
  onRemoveCard
}) {
  return (
    <div className="columns-1 md:columns-2 xl:columns-3 gap-6 [column-fill:_balance]">
      {SECTIONS_CONFIG.map(({ key, label, icon }) => {
        const group = groupedCards[key];
        if (!group || group.cards.length === 0) return null;

        const sectionTotalPrice = group.cards.reduce((acc, card) => {
          const qty = card.quantity_needed || card.quantity || 1;
          const unitPrice = getCardPriceBySource(card.card_catalog || card, priceSource);
          return acc + (unitPrice * qty);
        }, 0);

        return (
          <div key={key} className="break-inside-avoid mb-6">
            <div className={`flex items-center justify-between pb-1.5 mb-2 font-mono border-b ${
              isLightMode ? 'border-[#E0D8C8] text-[#1F1C19]' : 'border-neutral-800 text-neutral-200'
            }`}>
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <span>{icon}</span>
                <span>{label}</span>
                <span className="opacity-70 font-semibold">({group.totalQty})</span>
              </span>

              {sectionTotalPrice > 0 && (
                <span className="text-[11px] font-bold text-emerald-400 font-mono">
                  ${sectionTotalPrice.toFixed(2)}
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {group.cards.map((card) => {
                const isColorLegal = !isCommanderFormat || commanders.length === 0 || isCardColorIdentityLegal(card, commanderIdentity);
                const cardCatalog = card.card_catalog || card;
                const manaCost = cardCatalog?.mana_cost || card.mana_cost || card.manaCost || '';
                const cardName = cardCatalog?.name || card.name || 'Carta';
                const cardQty = card.quantity_needed || card.quantity || 1;
                const unitPrice = getCardPriceBySource(cardCatalog, priceSource);

                // Información del estado físico
                const isAvailable = card.status === 'DISPONIBLE';
                const isInOther = card.status === 'EN_OTRO_MAZO';
                const otherDecksText = Array.isArray(card.assigned_other_decks) && card.assigned_other_decks.length > 0
                  ? `Ocupada en: ${card.assigned_other_decks.join(', ')}`
                  : 'En otro de tus mazos';

                return (
                  <div
                    key={card.deck_card_id || card.id}
                    onMouseEnter={() => onHoverCard(card)}
                    onClick={() => onOpenCard(cardCatalog)}
                    className={`py-1.5 px-2.5 rounded-xl flex items-center justify-between gap-3 transition group cursor-pointer ${
                      hoveredCard?.deck_card_id === card.deck_card_id
                        ? (isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-800/80')
                        : (isLightMode ? 'hover:bg-[#F2EDE2]' : 'hover:bg-neutral-900/60')
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-amber-500 w-4 shrink-0 text-left">
                        {cardQty}
                      </span>

                      {/* Indicador Semafórico: Verde, Naranja (con mazo origen), Rojo */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 transition ${
                          isAvailable
                            ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                            : isInOther
                            ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                            : 'bg-rose-500'
                        }`}
                        title={
                          isAvailable
                            ? 'Disponible en tu colección física'
                            : isInOther
                            ? otherDecksText
                            : 'Faltante: No la tienes en colección ni en otros mazos'
                        }
                      />

                      <span 
                        title={cardName}
                        className={`text-xs sm:text-sm font-medium leading-tight truncate transition ${
                          isLightMode ? 'text-[#1F1C19] group-hover:text-amber-700' : 'text-neutral-100 group-hover:text-amber-400'
                        }`}
                      >
                        {cardName}
                      </span>

                      {!isColorLegal && (
                        <span title="Fuera de la identidad de color del Comandante">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {unitPrice > 0 && (
                        <span className="font-mono text-[10px] text-neutral-400 group-hover:text-emerald-400 transition">
                          ${unitPrice.toFixed(2)}
                        </span>
                      )}

                      {manaCost && (
                        <div className="shrink-0 flex items-center">
                          <ManaCost costString={manaCost} size="text-[11px]" gap="gap-0.5" />
                        </div>
                      )}

                      {isOwner && (
                        <div 
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={card.category}
                            onChange={(e) => onUpdateCategory(card, e.target.value)}
                            className={`text-[10px] rounded-lg px-1.5 py-0.5 outline-none cursor-pointer border ${
                              isLightMode
                                ? 'bg-white text-neutral-800 border-neutral-300 hover:border-amber-500'
                                : 'bg-neutral-950 text-neutral-200 border-neutral-800 hover:border-amber-500'
                            }`}
                          >
                            <option value="mainboard">Main</option>
                            <option value="commander">👑 Cmd</option>
                            <option value="companion">🧭 Comp</option>
                            <option value="sideboard">Side</option>
                            <option value="maybeboard">Maybe</option>
                          </select>

                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onUpdateQuantity(card, 1); }} 
                            className="p-1 text-neutral-400 hover:text-amber-500 transition rounded hover:bg-white/5" 
                            title="Añadir copia"
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRemoveCard(card.deck_card_id); }} 
                            className="p-1 text-neutral-400 hover:text-rose-500 transition rounded hover:bg-white/5" 
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
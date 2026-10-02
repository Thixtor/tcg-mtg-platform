// ---------------------------------------------------------
// COMPONENTE: VISTA TEXTUAL EN COLUMNAS CON JERARQUÍA MTG
// ---------------------------------------------------------
import React from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import ManaCostSymbols from '@/components/common/ManaCostSymbols';
import { isCardColorIdentityLegal } from '@/utils/deckLegality';
import { SECTIONS_CONFIG } from '@/utils/mtgTypeResolver';

export default function DeckTextView({
  groupedCards,
  hoveredCard,
  commanders = [],
  commanderIdentity,
  isCommanderFormat,
  isOwner,
  isLightMode,
  onHoverCard,
  onOpenCard,
  onUpdateCategory,
  onUpdateQuantity,
  onRemoveCard
}) {
  return (
    <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6 [column-fill:_balance]">
      {SECTIONS_CONFIG.map(({ key, label, icon }) => {
        const group = groupedCards[key];
        if (!group || group.cards.length === 0) return null;

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
            </div>

            <div className="space-y-0.5">
              {group.cards.map((card) => {
                const isColorLegal = !isCommanderFormat || commanders.length === 0 || isCardColorIdentityLegal(card, commanderIdentity);
                const manaCost = card.mana_cost || card.manaCost || '';

                return (
                  <div
                    key={card.deck_card_id || card.id}
                    onMouseEnter={() => onHoverCard(card)}
                    onClick={() => onOpenCard(card.card_catalog || card)}
                    className={`py-1 px-2 rounded-lg flex items-center justify-between gap-1.5 transition group cursor-pointer ${
                      hoveredCard?.deck_card_id === card.deck_card_id
                        ? (isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-800/80')
                        : (isLightMode ? 'hover:bg-[#F2EDE2]' : 'hover:bg-neutral-900/60')
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-amber-500 w-4 shrink-0 text-left">
                        {card.quantity_needed || card.quantity || 1}
                      </span>

                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          card.status === 'DISPONIBLE'
                            ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]'
                            : card.status === 'EN_OTRO_MAZO'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        title={card.status || 'Estado'}
                      />

                      <span className={`truncate text-sm font-medium transition ${
                        isLightMode ? 'text-[#1F1C19] group-hover:text-amber-700' : 'text-neutral-100 group-hover:text-amber-400'
                      }`}>
                        {card.name}
                      </span>

                      {!isColorLegal && (
                        <span title="Fuera de la identidad de color del Comandante">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <ManaCostSymbols manaCost={manaCost} />

                      {isOwner && (
                        <div 
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={card.category}
                            onChange={(e) => onUpdateCategory(card, e.target.value)}
                            className={`text-[10px] rounded px-1 py-0.5 outline-none cursor-pointer ${
                              isLightMode
                                ? 'bg-white text-neutral-800 hover:border-amber-500'
                                : 'bg-neutral-950 text-neutral-200 hover:border-amber-500'
                            }`}
                          >
                            <option value="mainboard">Main</option>
                            <option value="commander">👑 Cmd</option>
                            <option value="companion">🧭 Comp</option>
                            <option value="sideboard">Side</option>
                            <option value="maybeboard">Maybe</option>
                          </select>

                          <button 
                            onClick={(e) => { e.stopPropagation(); onUpdateQuantity(card, 1); }} 
                            className="p-0.5 text-neutral-400 hover:text-amber-500" 
                            title="Añadir copia"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onRemoveCard(card.deck_card_id); }} 
                            className="p-0.5 text-neutral-400 hover:text-rose-500" 
                            title="Eliminar"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
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
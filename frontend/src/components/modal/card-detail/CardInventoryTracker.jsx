// ============================================================================
// COMPONENTE: AUDITORÍA DE INVENTARIO FÍSICO, MAZOS Y DEMANDA DE TRADE
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Posesión Física: Informa copias reales en binders sin duplicarlas.
// - Contador Rápido: Permite incrementar o decrementar copias por carpeta en 1 clic.
// - Asignación en Mazos: Muestra en cuántos mazos está planificada la carta.
// - Actividad en Trade: Notifica si la comunidad está ofertando copias.
// ============================================================================

import React, { useState } from 'react';
import { 
  Box, 
  Swords, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Plus,
  Minus
} from 'lucide-react';
import { updateCollectionCardApi, removeCardFromCollectionApi } from '@/api/collections';

export default function CardInventoryTracker({
  myInventory,
  tradeMetrics,
  onInventoryUpdated,
  isLightMode
}) {
  const [updatingCardId, setUpdatingCardId] = useState(null);

  // Manejador para sumar o restar copias de una carpeta
  const handleQuantityAdjust = async (detail, delta) => {
    if (updatingCardId) return;

    const currentQty = detail.quantity || 1;
    const nextQty = currentQty + delta;

    setUpdatingCardId(detail.user_card_id);

    try {
      if (nextQty <= 0) {
        // Si llega a 0, se remueve de la carpeta
        await removeCardFromCollectionApi(detail.collection_id, detail.user_card_id);
      } else {
        await updateCollectionCardApi(detail.collection_id, detail.user_card_id, {
          quantity: nextQty
        });
      }

      // Notificar al modal para recargar las copias en vivo
      if (typeof onInventoryUpdated === 'function') {
        onInventoryUpdated();
      }
    } catch (err) {
      console.error('[CardInventoryTracker] Error ajustando cantidad:', err);
      alert('No fue posible actualizar la cantidad de copias.');
    } finally {
      setUpdatingCardId(null);
    }
  };

  return (
    <div className="w-full space-y-2.5 font-sans">
      <div className={`w-full p-3 rounded-xl border text-xs transition-colors space-y-2.5 ${
        isLightMode ? 'bg-white border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
      }`}>
        {/* 1. Copias físicas reales en carpetas (Binders) */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold">En Colección Física (Binders)</span>
            </div>

            {myInventory.loading ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
            ) : myInventory.isLoggedIn ? (
              myInventory.totalCollection > 0 ? (
                <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px] font-mono">
                  <CheckCircle2 className="inline w-3 h-3 mr-1" />
                  {myInventory.totalCollection} en físico
                </span>
              ) : (
                <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  0 copias en físico
                </span>
              )
            ) : (
              <span className="text-[10px] font-mono text-neutral-400">Modo visitante</span>
            )}
          </div>

          {myInventory.isLoggedIn && myInventory.collectionDetails.length > 0 && (
            <div className="mt-2 space-y-1.5 text-[11px] font-mono">
              {myInventory.collectionDetails.map((d) => {
                const isItemUpdating = updatingCardId === d.user_card_id;

                return (
                  <div 
                    key={d.user_card_id} 
                    className={`flex items-center justify-between p-1.5 rounded-lg border transition ${
                      isLightMode 
                        ? 'bg-neutral-100/70 border-neutral-200' 
                        : 'bg-black/30 border-neutral-800/80'
                    }`}
                  >
                    <div className="truncate max-w-[140px] pr-2">
                      <span className="text-neutral-200 font-bold block truncate" title={d.collection_name}>
                        • {d.collection_name}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {d.condition || 'NM'} {d.is_foil ? <Sparkles className="inline w-2.5 h-2.5 text-amber-400 ml-0.5" /> : null}
                      </span>
                    </div>

                    {/* Control Rápido de Copias (- / Contador / +) */}
                    <div className="flex items-center gap-1 shrink-0 bg-neutral-950/60 border border-neutral-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        disabled={isItemUpdating}
                        onClick={() => handleQuantityAdjust(d, -1)}
                        className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-rose-400 hover:bg-rose-950/40 transition disabled:opacity-40 cursor-pointer"
                        title="Quitar una copia"
                      >
                        <Minus className="w-3 h-3 stroke-[2.5]" />
                      </button>

                      <span className="min-w-[22px] text-center font-bold text-xs text-[#E88B00]">
                        {isItemUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin inline text-[#E88B00]" />
                        ) : (
                          `${d.quantity}x`
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={isItemUpdating}
                        onClick={() => handleQuantityAdjust(d, +1)}
                        className="w-5 h-5 flex items-center justify-center rounded text-neutral-400 hover:text-[#E88B00] hover:bg-[#E88B00]/10 transition disabled:opacity-40 cursor-pointer"
                        title="Añadir una copia"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-800/60" />

        {/* 2. Mazos donde está asignada la carta */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-bold">Asignada en Mazos</span>
            </div>

            {myInventory.loading ? (
              <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            ) : myInventory.isLoggedIn ? (
              myInventory.totalInDecks > 0 ? (
                <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px] font-mono">
                  En {myInventory.totalInDecks} mazo{myInventory.totalInDecks > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/40 px-2 py-0.5 rounded border border-neutral-700/40">
                  Sin asignar
                </span>
              )
            ) : (
              <span className="text-[10px] font-mono text-neutral-400">—</span>
            )}
          </div>

          {myInventory.isLoggedIn && myInventory.deckDetails.length > 0 && (
            <div className="mt-1.5 pl-5 space-y-0.5 text-[11px] text-neutral-300 font-mono">
              {myInventory.deckDetails.map((d) => (
                <div key={d.deck_card_id} className="flex items-center justify-between">
                  <span className="truncate max-w-[160px]" title={d.deck_name}>
                    • {d.deck_name}
                  </span>
                  <span className="text-neutral-400 text-[10px]">
                    ({d.category})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Disponibilidad en Trade de la Comunidad */}
      <div className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs ${
        isLightMode ? 'bg-white border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
      }`}>
        <div className="flex items-center gap-2 font-mono">
          <ArrowLeftRight className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <span className="font-bold block">Disponibilidad en Trade</span>
            <span className="text-[10px] text-neutral-400">En la comunidad</span>
          </div>
        </div>

        {tradeMetrics.loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
        ) : tradeMetrics.copiesForTrade > 0 ? (
          <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {tradeMetrics.copiesForTrade} copia{tradeMetrics.copiesForTrade > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-neutral-400 bg-neutral-800/40 px-2 py-0.5 rounded border border-neutral-700/40 font-mono text-[11px]">
            <AlertCircle className="w-3.5 h-3.5" />
            Sin ofertas activas
          </span>
        )}
      </div>
    </div>
  );
}
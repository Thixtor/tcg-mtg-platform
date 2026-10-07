// ============================================================================
// COMPONENTE: PESTAÑA DE CARTAS DISPONIBLES PARA TRADE (ESPACIO PREVIO)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Despliega las cartas del inventario físico marcadas con is_for_trade == true.
// - Provee selección individual o múltiple mediante checkboxes.
// - Permite retirar la disponibilidad de trade o lanzar el modal de publicación.
// ============================================================================

import React from 'react';
import { ArrowLeftRight, CheckSquare, Square, Plus, Loader2 } from 'lucide-react';

export default function TradeAvailableTab({
  loading,
  tradeCards = [],
  selectedCards = [],
  onToggleSelect,
  onSelectAll,
  onOpenCreatePost,
  onRemoveFromTrade
}) {
  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
        <span>Cargando cartas disponibles para trade...</span>
      </div>
    );
  }

  if (tradeCards.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
        <ArrowLeftRight className="w-8 h-8 text-neutral-600 mx-auto" />
        <p className="text-neutral-300 font-bold uppercase">No tienes cartas en tu espacio de trade.</p>
        <p className="text-neutral-500 text-[11px]">
          Presiona el botón de Trade sobre cualquier carta de tus colecciones para agregarla aquí y publicarla en el mercado.
        </p>
      </div>
    );
  }

  const allSelected = selectedCards.length === tradeCards.length && tradeCards.length > 0;

  return (
    <div className="space-y-4 font-mono">
      {/* Barra de Acciones de Selección */}
      <div className="p-4 rounded-2xl bg-[#181622] border border-[#2A2733] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSelectAll}
            className="flex items-center gap-1.5 text-neutral-300 hover:text-white font-bold cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-[#E88B00]" />
            ) : (
              <Square className="w-4 h-4 text-neutral-500" />
            )}
            <span>Seleccionar todas ({tradeCards.length})</span>
          </button>
          {selectedCards.length > 0 && (
            <span className="text-[#E88B00] font-bold">
              • {selectedCards.length} elegida(s)
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={selectedCards.length === 0}
          onClick={() => onOpenCreatePost(selectedCards)}
          className="px-5 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#E88B00]/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Crear Publicación ({selectedCards.length})</span>
        </button>
      </div>

      {/* Grid de Cartas Disponibles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tradeCards.map((item) => {
          const cardName = item.card_catalog?.name || item.name || 'Carta MTG';
          const imgUrl = item.card_catalog?.image_url || item.image_url;
          const price = item.price_usd || item.price || 0;
          const isSelected = selectedCards.some((c) => c.id === item.id);

          return (
            <div
              key={item.id}
              onClick={() => onToggleSelect(item)}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition cursor-pointer ${
                isSelected
                  ? 'bg-[#E88B00]/15 border-[#E88B00] shadow-sm'
                  : 'bg-[#131217] border-[#2A2733] hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-[#E88B00] shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-600 shrink-0" />
                )}

                {imgUrl ? (
                  <img src={imgUrl} alt={cardName} className="w-10 h-14 object-cover rounded-lg shadow shrink-0" />
                ) : (
                  <div className="w-10 h-14 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center text-[10px] text-neutral-600 shrink-0">
                    MTG
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-white truncate" title={cardName}>{cardName}</h4>
                  <span className="text-[10px] text-neutral-400 block truncate">
                    {item.collection_name || 'Colección'} • {item.condition || 'NM'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                    ${parseFloat(price).toFixed(2)} USD ({item.quantity || 1}x)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromTrade(item);
                }}
                className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition cursor-pointer shrink-0"
                title="Quitar de trade"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// ============================================================================
// COMPONENTE: PESTAÑA DE GESTIÓN DE WISHLIST EN EL BLACK MARKET
// ============================================================================
// DESCRIPCIÓN:
// - Despliega todas las cartas faltantes sincronizadas automáticamente desde
//   los mazos del usuario o añadidas manualmente.
// - Visualización en tarjeta con arte oficial, tipo y etiqueta "Faltante en mazo".
// - Permite buscar ofertas inmediatas en el muro comunitario con un clic.
// - Provee eliminación unitaria sincronizada con el backend mediante `removeCardFromWishlistApi`.
// ============================================================================

import React from 'react';
import { Heart, Sparkles, Flame, Trash2, Loader2 } from 'lucide-react';

export default function TradeWishlistTab({
  loading,
  wishlist,
  onSearchCard,
  onRemoveItem
}) {
  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
        <span>Cargando cartas de tu Wishlist...</span>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
        <Heart className="w-8 h-8 text-neutral-600 mx-auto" />
        <p className="text-neutral-300 font-bold uppercase">Tu Wishlist está vacía.</p>
        <p className="text-neutral-500 text-[11px]">
          Sincroniza las cartas faltantes de tus mazos desde el constructor para encontrar ofertas disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 font-mono">
      {/* Banner Resumen de Wishlist */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-purple-300 font-bold">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Cartas Faltantes Registradas ({wishlist.length})</span>
        </div>
        <span className="text-neutral-400 text-[11px]">Haz clic en buscar para ver quién ofrece cada una</span>
      </div>

      {/* Grid de Cartas Deseadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {wishlist.map((item) => {
          const cardName = item.card_catalog?.name || item.name || 'Carta MTG';
          const imgUrl = item.card_catalog?.image_url || item.image_url;
          const typeLine = item.card_catalog?.type_line || item.type_line || 'MTG Card';

          return (
            <div
              key={item.id}
              className="bg-[#131217] border border-[#2A2733] hover:border-[#E88B00]/50 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                {imgUrl ? (
                  <img src={imgUrl} alt={cardName} className="w-12 h-16 object-cover rounded-lg shadow shrink-0" />
                ) : (
                  <div className="w-12 h-16 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center text-[10px] font-mono text-neutral-600 shrink-0">
                    MTG
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate" title={cardName}>{cardName}</h4>
                  <p className="text-[11px] font-mono text-neutral-400 truncate">{typeLine}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300">
                    Faltante en mazo
                  </span>
                </div>
              </div>

              {/* Acciones unitarias: Buscar oferta o eliminar */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSearchCard(cardName)}
                  className="px-3 py-1.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>Buscar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition cursor-pointer flex items-center justify-center"
                  title="Quitar de la Wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
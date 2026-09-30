// ---------------------------------------------------------
// MODAL: VISTA PREVIA DETALLADA DE CARTA MTG (ORACLE & ART)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, Check, Loader2, Heart } from 'lucide-react';
import { addCardToWishlistApi } from '@/api/wishlist';
import { isAuthenticated } from '@/services/session.service';
import { parseApiError } from '@/utils/apiErrors';

/**
 * Modal flotante de inspección visual, texto de reglas y adición a Wishlist.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.card - Objeto con datos de la carta (Scryfall / BD local)
 * @param {Function} [props.onWishlistUpdated] - Notificación tras mutar la Wishlist
 */
export function CardDetailModal({ isOpen, onClose, card, onWishlistUpdated }) {
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [wishlistSuccess, setWishlistSuccess] = useState(false);
  const [actionError, setActionError] = useState(null);

  if (!isOpen || !card) return null;

  const hasSession = isAuthenticated();

  const handleToggleWishlist = async () => {
    if (!hasSession) {
      setActionError('Debes iniciar sesión para guardar cartas en tu Wishlist.');
      return;
    }

    setAddingToWishlist(true);
    setActionError(null);

    try {
      await addCardToWishlistApi({
        scryfall_card_id: card.id,
        preferred_finish: card.is_foil ? 'foil' : 'nonfoil',
      });
      setWishlistSuccess(true);
      if (onWishlistUpdated) onWishlistUpdated();
      setTimeout(() => setWishlistSuccess(false), 2500);
    } catch (err) {
      setActionError(parseApiError(err, 'No fue posible agregar la carta a tu Wishlist.'));
    } finally {
      setAddingToWishlist(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-neutral-950/80 text-neutral-400 hover:text-white border border-neutral-800 z-10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Imagen de la Carta */}
        <div className="w-full md:w-1/2 bg-neutral-950 p-6 flex items-center justify-center">
          {card.image_url ? (
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full max-w-[260px] rounded-xl shadow-xl border border-neutral-800 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-56 aspect-[2.5/3.5] rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs text-neutral-500 font-mono">
              Sin imagen disponible
            </div>
          )}
        </div>

        {/* Metadatos y Reglas */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2 pr-6">
              <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
                {card.name}
              </h3>
            </div>
            
            <p className="text-xs font-mono text-amber-500">
              {(card.set_code || '---').toUpperCase()} · {card.category ? card.category.toUpperCase() : 'CATÁLOGO'}
            </p>

            {/* Mensajes de Feedback */}
            {actionError && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-[11px] text-rose-300">
                {actionError}
              </div>
            )}

            {wishlistSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-1.5 font-mono">
                <Check className="w-3.5 h-3.5" /> ¡Añadida a tu Wishlist comercial!
              </div>
            )}

            {/* Estado de disponibilidad física en inventario */}
            <div className="space-y-1.5">
              {card.status === 'DISPONIBLE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                  ● Copia disponible en inventario
                </span>
              )}
              {card.status === 'EN_OTRO_MAZO' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-950/60 border border-amber-800 text-amber-400">
                  ▲ Asignada a: {Array.isArray(card.assigned_other_decks) ? card.assigned_other_decks.join(', ') : 'Otro mazo'}
                </span>
              )}
              {card.status === 'FALTANTE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-950/60 border border-rose-800 text-rose-400">
                  ✕ Faltante para completar mazo físico
                </span>
              )}
            </div>

            {/* Botón de acción para Wishlist */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={addingToWishlist}
                className="w-full py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-700 hover:border-amber-500 text-neutral-200 hover:text-amber-400 text-xs font-mono font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {addingToWishlist ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                ) : (
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                )}
                <span>Añadir a mi Wishlist</span>
              </button>
            </div>
          </div>

          {/* Atribución Legal de WotC */}
          <div className="pt-4 border-t border-neutral-800/80 text-[10px] text-neutral-500 space-y-1">
            {card.artist && <p>Ilustración: {card.artist}</p>}
            <p>© Wizards of the Coast LLC · Magic: The Gathering</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// Export default para compatibilidad con CardModalContext
export default CardDetailModal;
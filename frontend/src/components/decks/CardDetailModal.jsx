// ---------------------------------------------------------
// MODAL: VISTA PREVIA DETALLADA DE CARTA MTG (ORACLE & ART)
// ---------------------------------------------------------
import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal flotante de inspección visual y texto de reglas de una carta.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.card - Objeto con datos de la carta (Scryfall / BD local)
 */
export default function CardDetailModal({ isOpen, onClose, card }) {
  if (!isOpen || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
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
            />
          ) : (
            <div className="w-56 aspect-[2.5/3.5] rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs text-neutral-500 font-mono">
              Sin imagen disponible
            </div>
          )}
        </div>

        {/* Metadatos y Reglas */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 pr-6">
              <h3 className="text-lg font-bold text-white tracking-tight">{card.name}</h3>
            </div>
            
            <p className="text-xs font-mono text-amber-500 mt-0.5">
              {(card.set_code || '---').toUpperCase()} · {card.category?.toUpperCase()}
            </p>

            {/* Estado de disponibilidad física en binders */}
            <div className="mt-3">
              {card.status === 'DISPONIBLE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                  ● Copia disponible en inventario
                </span>
              )}
              {card.status === 'EN_OTRO_MAZO' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-amber-950/60 border border-amber-800 text-amber-400">
                  ▲ Asignada a: {card.assigned_other_decks?.join(', ')}
                </span>
              )}
              {card.status === 'FALTANTE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-rose-950/60 border border-rose-800 text-rose-400">
                  ✕ Faltante para completar mazo físico
                </span>
              )}
            </div>
          </div>

          {/* Atribución Legal de WotC */}
          <div className="pt-4 border-t border-neutral-800/80 text-[10px] text-neutral-500 space-y-1">
            {card.artist && <p>Ilustración: {card.artist}[cite: 16]</p>}
            <p>© Wizards of the Coast LLC · Magic: The Gathering[cite: 15, 16]</p>
          </div>
        </div>

      </div>
    </div>
  );
}
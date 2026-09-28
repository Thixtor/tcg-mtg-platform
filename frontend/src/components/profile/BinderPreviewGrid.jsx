// ---------------------------------------------------------
// COMPONENTE: CUADRÍCULA DE CARTAS DEL BINDER (PERFIL)
// ---------------------------------------------------------
import React from 'react';

export default function BinderPreviewGrid({ cards }) {
  // Estado vacío alineado con el diseño translúcido
  if (!cards || cards.length === 0) {
    return (
      <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-xl p-10 text-center backdrop-blur-md">
        <p className="text-neutral-500 text-sm">No hay cartas en esta colección o no tienes binders creados.</p>
        <p className="text-[11px] text-neutral-600 mt-2">Selecciona un binder o crea uno nuevo para empezar a gestionar tu inventario.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        // Contenedor de la carta individual (alineado con los paneles interiores)
        <div 
          key={card.id} 
          className="group relative bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex flex-col space-y-2 hover:border-amber-500/50 transition-colors"
        >
          {/* 
            REGLA DE SCRYFALL: aspect-[2.5/3.5] para mantener proporción oficial.
            object-cover evita distorsión. Sin filtros que alteren el arte.
          */}
          <div className="relative aspect-[2.5/3.5] w-full rounded overflow-hidden bg-neutral-900">
            <img 
              src={card.img || card.image_url} 
              alt={card.name} 
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
            />

            {/* Badges superpuestos en la esquina superior (lejos del borde inferior de copyright) */}
            <div className="absolute top-1.5 right-1.5">
              {card.isForTrade || card.is_for_trade ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/90 border border-emerald-800/40 text-emerald-400 backdrop-blur-sm shadow-sm">
                  FOR TRADE
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-900/90 border border-neutral-700/50 text-neutral-400 backdrop-blur-sm shadow-sm">
                  PERSONAL
                </span>
              )}
            </div>
          </div>

          {/* Información de la carta debajo de la imagen */}
          <div className="space-y-1.5 px-0.5">
            <div>
              <h4 className="text-xs font-bold text-white truncate" title={card.name}>{card.name}</h4>
              <p className="text-[10px] text-neutral-500 truncate">{card.set}</p>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800/80">
              <div className="flex items-center gap-1.5 text-[9px] font-mono">
                {/* Badge de Condición (NM, LP, etc.) */}
                <span className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {card.condition || 'NM'}
                </span>
                {/* Opcional: Badge Foil si aplica */}
                {(card.isFoil || card.is_foil) && (
                  <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    FOIL
                  </span>
                )}
              </div>
              
              {/* Precio formateado con fuente mono */}
              <span className="text-[11px] font-bold font-mono text-amber-400">
                ${card.price?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
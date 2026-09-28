// ---------------------------------------------------------
// COMPONENTE: CUADRÍCULA DE CARTAS DEL BINDER (PERFIL)
// ---------------------------------------------------------
import React from 'react';

export default function BinderPreviewGrid({ cards }) {
  if (!cards || cards.length === 0) {
    return (
      <div className="bg-neutral-900/60 border border-dashed border-neutral-800 rounded-xl p-10 text-center backdrop-blur-md">
        <p className="text-neutral-400 text-sm font-medium">No hay cartas en este binder.</p>
        <p className="text-[11px] text-neutral-500 mt-1">
          Busca cartas en el Catálogo para agregarlas a esta carpeta con su condición física y notas de cambio.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map((item) => {
        // Tolerante: puede ser UserCard anidado (card_catalog) o modelo directo
        const catalog = item.card_catalog || item;
        const name = catalog.name || item.name || 'Carta Desconocida';
        const imageUrl = catalog.image_url || item.image_url || item.img;
        const setCode = catalog.set_code || catalog.set || item.set || 'MTG';
        const price = catalog.price_usd || item.price || 0;
        const isFoil = item.is_foil ?? item.isFoil ?? false;
        const isForTrade = item.is_for_trade ?? item.isForTrade ?? false;
        const condition = item.condition || 'NM';
        const quantity = item.quantity || 1;

        return (
          <div 
            key={item.id} 
            className="group relative bg-neutral-950 border border-neutral-800 rounded-lg p-2 flex flex-col space-y-2 hover:border-amber-500/50 transition-colors"
          >
            {/* Aspect Ratio 2.5:3.5 oficial Scryfall */}
            <div className="relative aspect-[2.5/3.5] w-full rounded overflow-hidden bg-neutral-900">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={name} 
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs text-center p-2">
                  Sin Imagen
                </div>
              )}

              {/* Badges superiores */}
              <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 items-end">
                {isForTrade ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/90 border border-emerald-800/60 text-emerald-400 backdrop-blur-sm shadow-sm">
                    FOR TRADE
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-900/90 border border-neutral-700/60 text-neutral-400 backdrop-blur-sm shadow-sm">
                    PERSONAL
                  </span>
                )}

                {quantity > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-neutral-950/90 border border-neutral-800 text-amber-400 backdrop-blur-sm">
                    x{quantity}
                  </span>
                )}
              </div>
            </div>

            {/* Metadatos */}
            <div className="space-y-1.5 px-0.5">
              <div>
                <h4 className="text-xs font-bold text-white truncate" title={name}>{name}</h4>
                <p className="text-[10px] text-neutral-500 truncate uppercase font-mono">{setCode}</p>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-neutral-800/80">
                <div className="flex items-center gap-1.5 text-[9px] font-mono">
                  <span className="px-1 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold">
                    {condition}
                  </span>
                  {isFoil && (
                    <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                      FOIL
                    </span>
                  )}
                </div>
                
                <span className="text-[11px] font-bold font-mono text-amber-400">
                  ${Number(price).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
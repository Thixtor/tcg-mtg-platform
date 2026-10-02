// ---------------------------------------------------------
// COMPONENTE: SLIDER TOP 10 MAZOS (ESTILO CRUNCHYROLL / CINE)
// ---------------------------------------------------------
import React, { useRef } from 'react';
import { Flame, ChevronLeft, ChevronRight, Loader2, ThumbsUp, Eye } from 'lucide-react';

const DEFAULT_COMMANDER_BG = "https://images.ctfassets.net/s5n2t79q9icq/5nE8pQoF2W64qskegW2O4m/d0dbd4b29bb60ad4adca2fa13e8b15d2/MTG_Generic_Crop.jpg";

export default function TopDecksSlider({ topDecks = [], loading = false, onSelectDeck }) {
  const sliderRef = useRef(null);

  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-4 relative select-none">
      
      {/* CABECERA DE LA SECCIÓN */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            Top 10 Mazos Más Votados
          </h2>
        </div>

        {topDecks.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-8 h-8 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-8 h-8 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Cargando barajas más votadas...</span>
        </div>
      ) : topDecks.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 border border-neutral-800 bg-neutral-900/30">
          Aún no hay barajas comunitarias registradas. ¡Sé el primero en publicar una!
        </div>
      ) : (
        <div className="relative group/slider">
          
          {/* Flecha Flotante Izquierda */}
          <button
            onClick={() => handleScroll('left')}
            className="hidden md:flex absolute -left-4 top-1/3 -translate-y-1/2 z-30 w-10 h-16 bg-neutral-950/90 border border-neutral-800 hover:border-amber-500 text-white items-center justify-center transition opacity-0 group-hover/slider:opacity-100 cursor-pointer shadow-xl backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5 text-amber-400" />
          </button>

          {/* Carrusel Deslizable */}
          <div
            ref={sliderRef}
            className="flex items-start gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {topDecks.map((deck, index) => {
              // Resolución profunda de la imagen del Comandante idéntica a Decks
              const cardItem = deck.cards?.[0] || deck.commander;
              const cardCatalog = cardItem?.card_catalog || cardItem;
              
              const commanderArt = deck.commander_image_url
                || deck.commander_art_url 
                || deck.featured_card_url
                || deck.image_url
                || cardCatalog?.image_uris?.art_crop
                || cardCatalog?.image_uris?.normal
                || cardCatalog?.card_faces?.[0]?.image_uris?.art_crop
                || cardCatalog?.card_faces?.[0]?.image_uris?.normal
                || cardCatalog?.image_url 
                || cardItem?.image_url 
                || DEFAULT_COMMANDER_BG;

              const votes = deck.upvotes_count ?? deck.likes_count ?? 0;

              return (
                <div
                  key={deck.id}
                  onClick={() => onSelectDeck?.(deck.id)}
                  className="group/card min-w-[190px] sm:min-w-[210px] md:min-w-[225px] snap-start cursor-pointer flex flex-col space-y-2.5 transition duration-200"
                >
                  {/* PÓSTER VERTICAL CON SCOPE AISLADO */}
                  <div className="relative aspect-[2/3] w-full bg-neutral-950 border border-neutral-800 group-hover/card:border-amber-500 overflow-hidden transition-all duration-300 shadow-md">
                    
                    {/* Imagen del Comandante */}
                    <img 
                      src={commanderArt} 
                      alt={deck.name} 
                      className="w-full h-full object-cover object-center group-hover/card:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_COMMANDER_BG;
                      }}
                    />
                    
                    {/* Degradado Cinematográfico */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/30 pointer-events-none" />

                    {/* Medalla de Ranking */}
                    <div className="absolute top-0 left-0 z-10 bg-amber-500 text-neutral-950 font-black text-xs px-2.5 py-1 tracking-tighter shadow-md">
                      #{index + 1}
                    </div>

                    {/* Votos */}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 border border-neutral-700 text-[10px] font-mono font-bold text-amber-400">
                      <ThumbsUp className="w-3 h-3 text-amber-400" />
                      <span>{votes}</span>
                    </div>

                    {/* Botón flotante al hacer hover en esta tarjeta */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center p-4 z-20">
                      <span className="px-4 py-2 bg-amber-500 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:bg-amber-400 transition">
                        <Eye className="w-4 h-4" />
                        <span>Inspeccionar</span>
                      </span>
                    </div>

                    {/* Metadatos inferiores del póster */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono font-bold text-neutral-300 pointer-events-none z-10">
                      <span className="uppercase text-amber-400">{deck.format || 'COMMANDER'}</span>
                      <span>{deck.total_cards || 100} cartas</span>
                    </div>
                  </div>

                  {/* Texto inferior de la tarjeta */}
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-white group-hover/card:text-amber-400 transition truncate">
                      {deck.name}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-mono truncate">
                      {deck.commander_name || deck.description || 'Estrategia de Comunidad'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flecha Flotante Derecha */}
          <button
            onClick={() => handleScroll('right')}
            className="hidden md:flex absolute -right-4 top-1/3 -translate-y-1/2 z-30 w-10 h-16 bg-neutral-950/90 border border-neutral-800 hover:border-amber-500 text-white items-center justify-center transition opacity-0 group-hover/slider:opacity-100 cursor-pointer shadow-xl backdrop-blur-md"
          >
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      )}
    </section>
  );
}
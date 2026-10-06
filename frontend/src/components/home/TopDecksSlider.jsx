// ---------------------------------------------------------
// COMPONENTE: SLIDER TOP 10 MAZOS (HOMOLOGADO CON TOP CARTAS)
// ---------------------------------------------------------
import React, { useRef } from 'react';
import { Flame, ChevronLeft, ChevronRight, Loader2, ThumbsUp, Eye } from 'lucide-react';

const MTG_CARD_BACK_FALLBACK = "https://cards.scryfall.io/back.png";

export default function TopDecksSlider({ topDecks = [], loading = false, onSelectDeck }) {
  const sliderRef = useRef(null);

  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-4 relative select-none">
      
      {/* 1. Cabecera de la Sección */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-500" />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Top 10 Mazos Más Votados
          </h2>
        </div>

        {topDecks.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleScroll('left')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500 text-neutral-300 hover:text-white transition cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Contenido del Slider */}
      {loading ? (
        <div className="flex gap-4 overflow-x-hidden py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[170px] sm:min-w-[200px] h-[280px] rounded-xl animate-pulse border bg-neutral-900/60 border-neutral-800"
            />
          ))}
        </div>
      ) : topDecks.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 border border-neutral-800 rounded-xl bg-neutral-900/30">
          Aún no hay barajas comunitarias registradas. ¡Sé el primero en publicar una!
        </div>
      ) : (
        <div className="relative group/slider">
          
          {/* Flecha Flotante Izquierda */}
          <button
            onClick={() => handleScroll('left')}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-14 rounded-r-xl bg-neutral-950/90 border border-neutral-800 hover:border-amber-500 text-white items-center justify-center transition opacity-0 group-hover/slider:opacity-100 cursor-pointer shadow-xl backdrop-blur-md"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
          </button>

          {/* Carrusel Deslizable Homologado */}
          <div
            ref={sliderRef}
            className="flex items-start gap-4 sm:gap-6 overflow-x-auto pt-3 pb-6 px-1 scrollbar-thin scrollbar-thumb-neutral-700 snap-x snap-mandatory"
          >
            {topDecks.map((deck, index) => {
              const cardImage = 
                deck.cover_image_url ||
                deck.commander_image_url ||
                deck.commander_art_url ||
                deck.featured_card_url ||
                deck.image_url ||
                deck.commander?.image_uris?.art_crop ||
                deck.commander?.image_uris?.normal ||
                deck.commander?.image_url ||
                deck.cards?.[0]?.image_url ||
                MTG_CARD_BACK_FALLBACK;

              const votes = deck.upvotes_count ?? deck.likes_count ?? 0;

              return (
                <div
                  key={deck.id || index}
                  onClick={() => onSelectDeck?.(deck.id)}
                  className="relative flex-shrink-0 w-[170px] sm:w-[200px] group cursor-pointer transition-all duration-300 ease-out hover:scale-108 hover:-translate-y-2 hover:z-30 origin-center snap-start"
                >
                  {/* Badge Circular de Ranking (#1, #2, etc.) */}
                  <div className="absolute top-2 left-2 z-20 w-7 h-7 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/80 text-amber-400 font-extrabold text-xs flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:border-amber-400">
                    #{index + 1}
                  </div>

                  {/* Badge de Votos en la esquina superior derecha */}
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-neutral-700 text-[10px] font-mono font-bold text-amber-400 shadow-md">
                    <ThumbsUp className="w-3 h-3 text-amber-400" />
                    <span>{votes}</span>
                  </div>

                  {/* Marco de Imagen con Aspect Ratio de Carta MTG (2.5 / 3.5) */}
                  <div className="relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-md transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-amber-500/25 group-hover:border-amber-500/60 border border-neutral-800 bg-neutral-900">
                    <img 
                      src={cardImage} 
                      alt={deck.name} 
                      loading="lazy"
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = MTG_CARD_BACK_FALLBACK;
                      }}
                    />

                    {/* Degradado Cinematográfico */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                    {/* Overlay al hacer hover con botón 'Inspeccionar' */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 z-10">
                      <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-neutral-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-lg hover:bg-amber-400 transition">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspeccionar</span>
                      </span>
                    </div>

                    {/* Metadatos inferiores de la carta (Formato y Cantidad) */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono font-bold text-neutral-300 pointer-events-none z-10">
                      <span className="uppercase text-amber-400 truncate max-w-[90px]">{deck.format || 'COMMANDER'}</span>
                      <span className="shrink-0">{deck.total_cards || 100} cartas</span>
                    </div>
                  </div>

                  {/* Metadatos Inferiores Alineados */}
                  <div className="mt-2 px-1 transition-colors duration-200">
                    <h3 className="text-xs sm:text-sm font-semibold truncate group-hover:text-amber-500 transition-colors">
                      {deck.name}
                    </h3>
                    <p className="text-[11px] truncate text-neutral-400 font-mono">
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
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-14 rounded-l-xl bg-neutral-950/90 border border-neutral-800 hover:border-amber-500 text-white items-center justify-center transition opacity-0 group-hover/slider:opacity-100 cursor-pointer shadow-xl backdrop-blur-md"
          >
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}
    </section>
  );
}
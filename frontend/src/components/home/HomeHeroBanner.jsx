// ---------------------------------------------------------
// COMPONENTE: HERO BANNER CINEMATOGRÁFICO CON BUSCADOR SCRYFALL
// ---------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Search, ArrowRight, User, Shield, FolderPlus, X, Loader2 } from 'lucide-react';
import ManaCost from '@/components/common/ManaSymbol';

const HERO_ART_URL = "https://images.ctfassets.net/s5n2t79q9icq/5nE8pQoF2W64qskegW2O4m/d0dbd4b29bb60ad4adca2fa13e8b15d2/MTG_Generic_Crop.jpg";

export default function HomeHeroBanner({
  currentUser,
  isLightMode,
  onNavigateToCatalog,
  onOpenAuthModal,
  onOpenCreateDeckModal,
  onOpenCreateCollectionModal,
  onOpenCard
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // Consulta en vivo a Scryfall con debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(searchQuery.trim());
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data?.slice(0, 20) || []);
          setIsDropdownOpen(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error('[Home Search] Error en autocompletado:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    onNavigateToCatalog?.(searchQuery.trim() || undefined);
  };

  return (
    <section className="relative w-full overflow-hidden">
      <div className={`w-full relative min-h-[420px] md:min-h-[460px] px-6 sm:px-12 py-12 flex flex-col justify-center ${
        isLightMode ? 'bg-[#EAE4D7]' : 'bg-[#111113]'
      }`}>
        
        {/* Arte Panorámico */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-full md:w-3/4 bg-cover bg-center pointer-events-none transition-opacity ${
            isLightMode ? 'opacity-30 filter brightness-105 contrast-105' : 'opacity-40 filter brightness-90 contrast-125'
          }`}
          style={{
            backgroundImage: `url(${HERO_ART_URL})`,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)'
          }}
        />

        <div className={`absolute inset-0 pointer-events-none ${
          isLightMode 
            ? 'bg-gradient-to-r from-[#EAE4D7] via-[#EAE4D7]/90 md:via-[#EAE4D7]/75 to-transparent' 
            : 'bg-gradient-to-r from-[#111113] via-[#111113]/90 md:via-[#111113]/75 to-transparent'
        }`} />

        <div className={`absolute bottom-0 left-0 right-0 h-16 pointer-events-none ${
          isLightMode ? 'bg-gradient-to-t from-[#FAF7F2] to-transparent' : 'bg-gradient-to-t from-[#0B0B0B] to-transparent'
        }`} />

        {/* Textos y Acciones */}
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 font-mono text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plataforma Comunitaria & Marketplace P2P</span>
          </div>

          <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-none ${
            isLightMode ? 'text-[#1F1C19]' : 'text-white drop-shadow-md'
          }`}>
            Construye, Audita e Intercambia
          </h1>

          <p className={`text-xs sm:text-sm md:text-base max-w-2xl leading-relaxed ${
            isLightMode ? 'text-neutral-700' : 'text-neutral-300'
          }`}>
            Consulta legalidad oficial de formatos, audita barajas contra tu inventario físico de colecciones y conecta con otros coleccionistas para realizar trade local sin intermediarios.
          </p>

          {/* Buscador */}
          <div className="relative pt-2 max-w-2xl" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="w-4 h-4 text-neutral-400 absolute left-4 pointer-events-none z-10" />
              <input
                id="hero-scryfall-search"
                name="scryfallQuery"
                type="text"
                placeholder="Buscar carta por nombre o comandante en Scryfall..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setIsDropdownOpen(true); }}
                className={`w-full pl-11 pr-24 py-3 text-xs sm:text-sm outline-none transition shadow-2xl backdrop-blur-md border ${
                  isLightMode 
                    ? 'bg-white/95 border-[#D8CEBC] text-neutral-900 placeholder:text-neutral-500 focus:border-amber-500' 
                    : 'bg-neutral-900/90 border-neutral-700/80 text-white placeholder:text-neutral-400 focus:border-amber-500'
                }`}
              />

              <div className="absolute right-2 flex items-center gap-1.5 z-10">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setIsDropdownOpen(false); }}
                    className="p-1 text-neutral-400 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1 transition shadow-md active:scale-95"
                >
                  <span>Buscar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Dropdown Predictivo con Scroll y Mana Font */}
            {isDropdownOpen && (
              <div className={`absolute top-full left-0 right-0 mt-2 shadow-2xl rounded-b-lg overflow-hidden z-50 border backdrop-blur-xl ${
                isLightMode ? 'bg-white/95 border-[#E2DBD0] text-[#1F1C19]' : 'bg-[#141416]/95 border-neutral-800 text-neutral-100'
              }`}>
                {isSearching ? (
                  <div className="p-4 text-center font-mono text-xs text-neutral-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Consultando cartas...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="max-h-[340px] sm:max-h-[380px] overflow-y-auto divide-y divide-neutral-800/40 scrollbar-thin scrollbar-thumb-neutral-700">
                      {searchResults.map((card) => {
                        const img = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
                        const price = card.prices?.usd ? `$${card.prices.usd}` : null;
                        return (
                          <div
                            key={card.id}
                            onClick={() => { setIsDropdownOpen(false); onOpenCard?.(card); }}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                              isLightMode ? 'hover:bg-[#F2EDE2]' : 'hover:bg-neutral-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-11 bg-neutral-950 shrink-0 border border-neutral-700/50 overflow-hidden rounded-sm">
                                {img ? <img src={img} alt={card.name} className="w-full h-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold truncate group-hover:text-amber-500">{card.name}</h4>
                                <p className="text-[10px] text-neutral-400 truncate font-mono">{card.type_line}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <ManaCost costString={card.mana_cost || ''} size="text-[11px]" gap="gap-0.5" />
                              {price && <span className="text-[11px] font-mono font-bold text-emerald-400">{price}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div 
                      onClick={handleSearchSubmit}
                      className={`p-2.5 text-center text-xs font-mono font-bold cursor-pointer transition border-t ${
                        isLightMode 
                          ? 'bg-[#EAE4D7] text-amber-800 hover:bg-[#E2DBD0] border-[#D8CEBC]' 
                          : 'bg-neutral-900 text-amber-400 hover:bg-neutral-800 border-neutral-800'
                      }`}
                    >
                      Ver todos los resultados en el Catálogo &rarr;
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {!currentUser?.id ? (
              <>
                <button
                  onClick={onOpenAuthModal}
                  className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-neutral-700/60"
                >
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  <span>Iniciar Sesión / Registro</span>
                </button>
                <span className="text-xs text-neutral-400 font-mono">
                  Acceso completo al catálogo y barajas públicas
                </span>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={onOpenCreateDeckModal}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Crear Nuevo Mazo</span>
                </button>
                <button
                  onClick={onOpenCreateCollectionModal}
                  className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 text-xs font-bold transition flex items-center gap-1.5 border border-neutral-700/60 shadow-sm active:scale-95"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Crear Colección</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
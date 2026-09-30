// ---------------------------------------------------------
// PÁGINA: HOME / COMUNIDAD Y VITRINA CENTRAL (CINEMATOGRÁFICA)
// ---------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Shield, 
  Layers, 
  ArrowLeftRight, 
  Search, 
  ArrowRight, 
  Copy, 
  User, 
  Loader2,
  Globe,
  X
} from 'lucide-react';

import { getPublicDecksApi } from '@/api/decks.api';
import { useTheme } from '@/context/ThemeContext';
import { useCardModal } from '@/context/CardModalContext';
import ManaCostSymbols from '@/components/common/ManaCostSymbols';
import { parseApiError } from '@/utils/apiErrors';

export default function HomePage({
  currentUser,
  onNavigateToCatalog,
  onNavigateToTradeWall,
  onSelectDeck,
  onNavigateToUserProfile,
  onOpenAuthModal,
  onOpenCreateDeckModal
}) {
  const { isLightMode } = useTheme();
  const { openCard } = useCardModal();

  const [publicDecks, setPublicDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  // Estados del Buscador Sencillo en Vivo
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // 1. Cargar mazos públicos de la comunidad
  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingDecks(true);

    getPublicDecksApi({ limit: 6 }, { signal: ctrl.signal })
      .then((data) => {
        setPublicDecks(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Home] Error cargando mazos públicos:', parseApiError(err));
        }
      })
      .finally(() => setLoadingDecks(false));

    return () => ctrl.abort();
  }, []);

  // 2. Buscador en vivo hacia Scryfall con autocompletado
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
          setSearchResults(data.data?.slice(0, 6) || []);
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

  // Cerrar sugerencias al hacer clic fuera
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
    if (searchQuery.trim()) {
      onNavigateToCatalog?.(searchQuery.trim());
    } else {
      onNavigateToCatalog?.();
    }
  };

  const handleSelectCardResult = (card) => {
    setIsDropdownOpen(false);
    openCard(card);
  };

  // Arte panorámico de ambientación (Black Lotus / Commander Art Crop de alta definición)
  const heroArtUrl = "https://images.ctfassets.net/s5n2t79q9icq/5nE8pQoF2W64qskegW2O4m/d0dbd4b29bb60ad4adca2fa13e8b15d2/MTG_Generic_Crop.jpg";

  return (
    <div className={`min-h-[calc(100vh-4rem)] transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      
      {/* 1. HERO BANNER CINEMATOGRÁFICO SIN BORDES */}
      <section className="relative w-full overflow-hidden select-none">
        <div className={`w-full relative min-h-[420px] md:min-h-[460px] px-6 sm:px-12 py-12 flex flex-col justify-center ${
          isLightMode ? 'bg-[#EAE4D7]' : 'bg-[#111113]'
        }`}>
          
          {/* Arte Panorámico con máscara de fusión */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-full md:w-3/4 bg-cover bg-center pointer-events-none transition-opacity ${
              isLightMode ? 'opacity-30 filter brightness-105 contrast-105' : 'opacity-40 filter brightness-90 contrast-125'
            }`}
            style={{
              backgroundImage: `url(${heroArtUrl})`,
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)'
            }}
          />

          {/* Degradado lateral continuo */}
          <div className={`absolute inset-0 pointer-events-none ${
            isLightMode 
              ? 'bg-gradient-to-r from-[#EAE4D7] via-[#EAE4D7]/90 md:via-[#EAE4D7]/75 to-transparent' 
              : 'bg-gradient-to-r from-[#111113] via-[#111113]/90 md:via-[#111113]/75 to-transparent'
          }`} />

          {/* Fusión inferior hacia el cuerpo de la página */}
          <div className={`absolute bottom-0 left-0 right-0 h-16 pointer-events-none ${
            isLightMode 
              ? 'bg-gradient-to-t from-[#FAF7F2] to-transparent' 
              : 'bg-gradient-to-t from-[#0B0B0B] to-transparent'
          }`} />

          {/* Contenido Frontal del Hero */}
          <div className="relative z-10 max-w-3xl space-y-4">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 backdrop-blur-md">
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
              Consulta legalidad oficial de formatos, audita barajas contra tu inventario físico de carpetas y conecta con otros coleccionistas para realizar trade local sin fricciones.
            </p>

            {/* BUSCADOR SENCILLO EN VIVO CON AUTOCOMPLETADO */}
            <div className="relative pt-2 max-w-2xl" ref={searchContainerRef}>
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-4 pointer-events-none z-10" />
                
                <input
                  type="text"
                  placeholder="Buscar carta por nombre o comandante en Scryfall..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0) setIsDropdownOpen(true); }}
                  className={`w-full pl-11 pr-24 py-3 rounded-2xl text-xs sm:text-sm outline-none transition shadow-2xl backdrop-blur-md border ${
                    isLightMode 
                      ? 'bg-white/95 border-[#D8CEBC] text-neutral-900 placeholder:text-neutral-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20' 
                      : 'bg-neutral-900/90 border-neutral-700/80 text-white placeholder:text-neutral-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
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
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1 transition shadow-md active:scale-95"
                  >
                    <span>Buscar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Menú Flotante de Resultados en Vivo */}
              {isDropdownOpen && (
                <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-50 border backdrop-blur-xl ${
                  isLightMode 
                    ? 'bg-white/95 border-[#E2DBD0] text-[#1F1C19]' 
                    : 'bg-[#141416]/95 border-neutral-800 text-neutral-100'
                }`}>
                  {isSearching ? (
                    <div className="p-4 text-center font-mono text-xs text-neutral-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                      <span>Consultando base oficial de Scryfall...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y divide-neutral-800/40">
                      {searchResults.map((card) => {
                        const img = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
                        const price = card.prices?.usd ? `$${card.prices.usd}` : null;

                        return (
                          <div
                            key={card.id}
                            onClick={() => handleSelectCardResult(card)}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                              isLightMode ? 'hover:bg-[#F2EDE2]' : 'hover:bg-neutral-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-11 rounded overflow-hidden bg-neutral-950 shrink-0 border border-neutral-700/50">
                                {img ? (
                                  <img src={img} alt={card.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] text-neutral-500">N/A</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold truncate group-hover:text-amber-500">
                                  {card.name}
                                </h4>
                                <p className="text-[10px] text-neutral-400 truncate font-mono">
                                  {card.type_line}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <ManaCostSymbols manaCost={card.mana_cost || ''} />
                              {price && (
                                <span className="text-xs font-mono font-bold text-emerald-400">
                                  {price}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div 
                        onClick={handleSearchSubmit}
                        className={`p-2.5 text-center text-xs font-mono font-bold cursor-pointer transition ${
                          isLightMode ? 'bg-[#EAE4D7] text-amber-800 hover:bg-[#E2DBD0]' : 'bg-neutral-900 text-amber-400 hover:bg-neutral-800'
                        }`}
                      >
                        Ver todos los resultados en el Catálogo &rarr;
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Acciones directas para visitantes o usuarios */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {!currentUser?.id ? (
                <>
                  <button
                    onClick={onOpenAuthModal}
                    className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-neutral-700/60"
                  >
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    <span>Iniciar Sesión / Registro</span>
                  </button>
                  <span className="text-xs text-neutral-400 font-mono">
                    Catálogo abierto y exploración sin registro forzoso
                  </span>
                </>
              ) : (
                <button
                  onClick={onOpenCreateDeckModal}
                  className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-neutral-700/60 shadow-sm"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Crear Nuevo Mazo</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 2. CONTENIDO PRINCIPAL: MAZOS COMUNITARIOS Y ACCESOS RÁPIDOS */}
      <div className="max-w-[1920px] mx-auto px-6 sm:px-12 py-8 space-y-10">

        {/* VITRINA DE MAZOS COMUNITARIOS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <span>Barajas Comunitarias Destacadas</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Explora la composición, haz playtest y clona las listas públicas creadas por la comunidad.
              </p>
            </div>
          </div>

          {loadingDecks ? (
            <div className="py-16 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Cargando barajas de la comunidad...</span>
            </div>
          ) : publicDecks.length === 0 ? (
            <div className={`py-12 text-center text-xs rounded-2xl border border-dashed ${
              isLightMode ? 'bg-[#EAE4D7] border-[#D9D0BE] text-neutral-600' : 'bg-neutral-900/20 border-neutral-800 text-neutral-500'
            }`}>
              Aún no hay barajas comunitarias registradas. ¡Sé el primero en publicar una!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {publicDecks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => onSelectDeck?.(deck.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-4 group shadow-md hover:scale-[1.01] ${
                    isLightMode 
                      ? 'bg-white border-[#E8E2D5] hover:border-amber-500/80 hover:bg-[#FAF7F2]' 
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-amber-500/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[9px] uppercase tracking-wider">
                        {deck.format || 'COMMANDER'}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-emerald-400" />
                        <span>Público</span>
                      </span>
                    </div>

                    <h3 className={`text-base font-black truncate group-hover:text-amber-500 transition ${
                      isLightMode ? 'text-[#1F1C19]' : 'text-white'
                    }`}>
                      {deck.name}
                    </h3>

                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {deck.description || 'Sin notas descriptivas en la baraja.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-500">{deck.total_cards || 100} cartas</span>
                    <span className="text-amber-500 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                      <Copy className="w-3 h-3" />
                      <span>Inspeccionar & Clonar</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ACCESOS DIRECTOS A COLECCIONES Y MURO DE TRADE */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 shadow-lg ${
            isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-neutral-900/50 border-neutral-800'
          }`}>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Colecciones & Binders Físicos</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Organiza tus carpetas físicas, audita cartas faltantes en tus barajas y marca ejemplares para intercambio comunitario.
              </p>
            </div>
            <div>
              <button
                onClick={() => onNavigateToCatalog?.()}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-500 hover:underline"
              >
                <span>Explorar cartas en el catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 shadow-lg ${
            isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-neutral-900/50 border-neutral-800'
          }`}>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Muro de Intercambio P2P</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Descubre qué jugadores locales buscan las cartas que tienes disponibles y coordina trades justos con cotizaciones actualizadas.
              </p>
            </div>
            <div>
              <button
                onClick={onNavigateToTradeWall}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 hover:underline"
              >
                <span>Ir al Muro de Trade</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
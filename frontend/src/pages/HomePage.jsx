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
  User, 
  Loader2, 
  Globe, 
  X, 
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';

import { getPublicDecksApi, getMyDecksApi } from '@/api/decks.api';
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
  onOpenCreateDeckModal,
  onOpenCreateCollectionModal
}) {
  const { isLightMode } = useTheme();
  const { openCard } = useCardModal();

  const [publicDecks, setPublicDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);

  // Referencia para el slide deslizable
  const sliderRef = useRef(null);

  // Estados del Buscador Sencillo en Vivo
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  // 1. Cargar barajas públicas comunitarias
  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingDecks(true);

    getPublicDecksApi({ limit: 12 }, { signal: ctrl.signal })
      .then(async (data) => {
        let list = Array.isArray(data) ? data : (data?.data || data?.items || []);
        
        // Fallback a mazos propios si la comunidad aún no tiene listas públicas
        if (list.length === 0) {
          try {
            const myDecks = await getMyDecksApi({ signal: ctrl.signal });
            const myDecksList = Array.isArray(myDecks) ? myDecks : (myDecks?.data || []);
            list = myDecksList.filter((d) => d.is_public !== false);
          } catch {
            // Mantener lista vacía si falla o no hay sesión
          }
        }

        setPublicDecks(list);
      })
      .catch(async (err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Home] Fallback en carga de barajas:', parseApiError(err));
          try {
            const myDecks = await getMyDecksApi({ signal: ctrl.signal });
            const myDecksList = Array.isArray(myDecks) ? myDecks : [];
            setPublicDecks(myDecksList);
          } catch {
            setPublicDecks([]);
          }
        }
      })
      .finally(() => setLoadingDecks(false));

    return () => ctrl.abort();
  }, []);

  // 2. Consulta en vivo hacia Scryfall
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

  // Controles de desplazamiento para el Slider
  const handleScroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
          
          {/* Arte Panorámico con máscara de fusión progresiva */}
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

          <div className={`absolute inset-0 pointer-events-none ${
            isLightMode 
              ? 'bg-gradient-to-r from-[#EAE4D7] via-[#EAE4D7]/90 md:via-[#EAE4D7]/75 to-transparent' 
              : 'bg-gradient-to-r from-[#111113] via-[#111113]/90 md:via-[#111113]/75 to-transparent'
          }`} />

          <div className={`absolute bottom-0 left-0 right-0 h-16 pointer-events-none ${
            isLightMode 
              ? 'bg-gradient-to-t from-[#FAF7F2] to-transparent' 
              : 'bg-gradient-to-t from-[#0B0B0B] to-transparent'
          }`} />

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

            {/* BUSCADOR SENCILLO EN VIVO */}
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

              {/* Menú Flotante de Resultados */}
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

            {/* Acciones principales */}
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
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={onOpenCreateDeckModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Crear Nuevo Mazo</span>
                  </button>

                  <button
                    onClick={onOpenCreateCollectionModal}
                    className="px-4 py-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-neutral-700/60 shadow-sm active:scale-95"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                    <span>Crear Carpeta</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 2. CARRUSEL DESLIZABLE CINEMATOGRÁFICO DE BARAJAS COMUNITARIAS */}
      <div className="max-w-[1920px] mx-auto px-6 sm:px-12 py-10 space-y-12">

        <section className="space-y-5 relative">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-amber-500" />
                <span>Barajas Comunitarias Destacadas</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-mono">
                Explora la composición, haz playtest y descubre la estrategia de la comunidad.
              </p>
            </div>

            {/* Flechas de Navegación del Slide en Cabecera */}
            {publicDecks.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleScroll('left')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition border backdrop-blur-md ${
                    isLightMode 
                      ? 'bg-white hover:bg-neutral-100 border-[#E0D8C8] text-neutral-800 shadow-sm' 
                      : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-white'
                  }`}
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleScroll('right')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition border backdrop-blur-md ${
                    isLightMode 
                      ? 'bg-white hover:bg-neutral-100 border-[#E0D8C8] text-neutral-800 shadow-sm' 
                      : 'bg-neutral-900/80 hover:bg-neutral-800 border-neutral-800 hover:border-amber-500/50 text-neutral-300 hover:text-white'
                  }`}
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {loadingDecks ? (
            <div className="py-20 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Cargando barajas comunitarias...</span>
            </div>
          ) : publicDecks.length === 0 ? (
            <div className={`py-12 text-center text-xs rounded-2xl border border-dashed ${
              isLightMode ? 'bg-[#EAE4D7] border-[#D9D0BE] text-neutral-600' : 'bg-neutral-900/20 border-neutral-800 text-neutral-500'
            }`}>
              Aún no hay barajas comunitarias registradas. ¡Sé el primero en publicar una!
            </div>
          ) : (
            <div className="relative group">

              {/* Botón flotante extremo izquierdo */}
              <button
                onClick={() => handleScroll('left')}
                className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-amber-500 text-white shadow-2xl items-center justify-center backdrop-blur-md transition opacity-0 group-hover:opacity-100 hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5 text-amber-400" />
              </button>

              {/* CONTENEDOR SLIDER HORIZONTAL */}
              <div
                ref={sliderRef}
                className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {publicDecks.map((deck) => {
                  const commanderArt = deck.commander_art_url 
                    || deck.cards?.[0]?.card_catalog?.image_url 
                    || deck.cards?.[0]?.image_url 
                    || '';

                  return (
                    <div
                      key={deck.id}
                      onClick={() => onSelectDeck?.(deck.id)}
                      className={`min-w-[300px] sm:min-w-[340px] md:min-w-[360px] snap-start rounded-3xl cursor-pointer transition flex flex-col justify-between p-6 group relative overflow-hidden shadow-xl hover:-translate-y-1 duration-300 border ${
                        isLightMode 
                          ? 'bg-white border-[#E8E2D5] hover:border-amber-500' 
                          : 'bg-[#121214] border-neutral-800/90 hover:border-amber-500/80 hover:shadow-amber-500/5'
                      }`}
                    >
                      {/* Fondo cinematográfico con arte panorámico integrado */}
                      {commanderArt && (
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-3/4 bg-cover bg-center pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                          style={{
                            backgroundImage: `url(${commanderArt})`,
                            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)'
                          }}
                        />
                      )}

                      {/* Degradado para legibilidad del texto */}
                      <div className={`absolute inset-0 pointer-events-none ${
                        isLightMode 
                          ? 'bg-gradient-to-r from-white via-white/90 to-transparent' 
                          : 'bg-gradient-to-r from-[#121214] via-[#121214]/90 to-transparent'
                      }`} />

                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-neutral-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                            {deck.format || 'COMMANDER'}
                          </span>

                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Público</span>
                          </span>
                        </div>

                        <div>
                          <h3 className={`text-lg font-black tracking-tight group-hover:text-amber-400 transition truncate ${
                            isLightMode ? 'text-[#1F1C19]' : 'text-white'
                          }`}>
                            {deck.name}
                          </h3>

                          <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                            {deck.description || 'Baraja comunitaria sin notas descriptivas.'}
                          </p>
                        </div>
                      </div>

                      {/* Pie de tarjeta: solo botón INSPECCIONAR */}
                      <div className="pt-4 mt-6 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono relative z-10">
                        <span className="text-neutral-500">{deck.total_cards || 100} cartas</span>
                        
                        <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspeccionar</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón flotante extremo derecho */}
              <button
                onClick={() => handleScroll('right')}
                className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-2xl bg-neutral-950/80 border border-neutral-800 hover:border-amber-500 text-white shadow-2xl items-center justify-center backdrop-blur-md transition opacity-0 group-hover:opacity-100 hover:scale-105"
              >
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </button>

            </div>
          )}
        </section>

        {/* 3. ACCESOS DIRECTOS A CARPETAS Y MURO DE TRADE */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className={`p-8 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl transition hover:border-amber-500/50 ${
            isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-[#121214] border-neutral-800'
          }`}>
            <div className="space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Carpetas & Inventario Físico</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-mono">
                Organiza tus carpetas físicas, audita cartas faltantes en tus barajas y marca ejemplares para intercambio comunitario.
              </p>
            </div>
            <div>
              <button
                onClick={() => onNavigateToCatalog?.()}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-amber-500 hover:underline"
              >
                <span>Explorar cartas en el catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className={`p-8 rounded-3xl border flex flex-col justify-between space-y-4 shadow-xl transition hover:border-emerald-500/50 ${
            isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-[#121214] border-neutral-800'
          }`}>
            <div className="space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Muro de Intercambio P2P</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-mono">
                Descubre qué jugadores locales buscan las cartas que tienes disponibles y coordina trades justos con cotizaciones actualizadas.
              </p>
            </div>
            <div>
              <button
                onClick={onNavigateToTradeWall}
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 hover:underline"
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
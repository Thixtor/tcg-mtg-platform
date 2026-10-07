// ---------------------------------------------------------
// PÁGINA: BLACK MARKET / TRADE WALL (INTEGRADO CON WISHLIST)
// ---------------------------------------------------------
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Heart, 
  Compass, 
  Layers, 
  Users, 
  CheckCircle2, 
  Loader2, 
  MapPin,
  TrendingUp,
  Skull,
  ArrowRight,
  Trash2,
  Sparkles,
  Flame
} from 'lucide-react';

import SimpleCreateTradeModal from '@/components/trade/SimpleCreateTradeModal';
import TradeProposalModal from '@/components/trade/TradeProposalModal';
import { useCardModal } from '@/context/CardModalContext';
import { getTradeMarketApi } from '@/api/trade';
import { getMyWishlistApi, removeCardFromWishlistApi } from '@/api/wishlist';

const HERO_BACKGROUND_ART = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920&auto=format&fit=crop';

export default function TradeWallPage({
  currentUser,
  onNavigateToCatalog,
  onOpenAuthModal,
  initialTab = 'explore',
  initialSearchQuery = ''
}) {
  const cardModal = useCardModal ? useCardModal() : null;
  const openCard = cardModal?.openCard || (() => {});

  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposalPost, setSelectedProposalPost] = useState(null);

  const [posts, setPosts] = useState([]);
  const [myTradeCards, setMyTradeCards] = useState([]);
  const [myWishlist, setMyWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  // Sincronizar búsqueda inicial si cambia desde navegación externa
  useEffect(() => {
    if (initialSearchQuery) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // 1. Cargar publicaciones del Mercado
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getTradeMarketApi?.({ limit: 40 })
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: item.user_card_id || `post-${idx}`,
            author: { 
              id: item.owner_username || 'user', 
              username: item.owner_username || 'Comunidad',
              reputation_score: item.owner_reputation || 100
            },
            location: item.location || 'Medellín / Área Metropolitana',
            wanted_cards: [{ name: 'Cartas formato Commander / Staples', condition: 'Cualquiera' }],
            offered_cards: [{ 
              name: item.card_name || 'Carta MTG', 
              condition: item.condition || 'NM',
              image_url: item.image_url,
              price_usd: item.price_usd || 0
            }],
            preferred_usd_rate: 3200,
            notes: item.trade_notes || 'Intercambio presencial sugerido en LGS.'
          }));
          setPosts(mapped);
        }
      })
      .catch((err) => {
        console.warn('[BlackMarket] Usando datos de muestra:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // 2. Cargar Wishlist personal si el usuario está autenticado
  const fetchWishlist = useCallback(async () => {
    if (!currentUser) return;
    setLoadingWishlist(true);
    try {
      const data = await getMyWishlistApi();
      setMyWishlist(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Wishlist] Error cargando wishlist:', err);
    } finally {
      setLoadingWishlist(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // 3. Eliminar carta de Wishlist
  const handleRemoveWishlistCard = async (wishlistId) => {
    try {
      await removeCardFromWishlistApi(wishlistId);
      setMyWishlist((prev) => prev.filter((item) => item.id !== wishlistId));
    } catch (err) {
      alert('Error eliminando la carta de tu Wishlist.');
    }
  };

  // Nombres canónicos de cartas en wishlist para matching rápido
  const wishlistCardNames = useMemo(() => {
    return new Set(
      myWishlist.map((item) => (item.card_catalog?.name || item.name || '').trim().toLowerCase()).filter(Boolean)
    );
  }, [myWishlist]);

  // Filtrado de posts del muro
  const filteredPosts = useMemo(() => {
    if (!Array.isArray(posts)) return [];
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => {
      const matchWanted = (p.wanted_cards || []).some((c) => (c.name || '').toLowerCase().includes(q));
      const matchOffered = (p.offered_cards || []).some((c) => (c.name || '').toLowerCase().includes(q));
      const matchAuthor = (p.author?.username || p.author_username || '').toLowerCase().includes(q);
      return matchWanted || matchOffered || matchAuthor;
    });
  }, [posts, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0C0B0E] text-neutral-100 font-sans pb-24 selection:bg-[#E88B00] selection:text-black">
      
      {/* ---------------------------------------------------------
          1. HERO BANNER CINEMATOGRÁFICO REDONDEADO
      --------------------------------------------------------- */}
      <section className="relative w-full min-h-[460px] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#18130E] via-[#0E0C10] to-[#0C0B0E] border-b border-[#242129]">
        
        <div 
          className="absolute right-0 top-0 bottom-0 w-full md:w-3/4 lg:w-2/3 bg-cover bg-center pointer-events-none opacity-35 mix-blend-screen transition-opacity duration-700"
          style={{
            backgroundImage: `url(${HERO_BACKGROUND_ART})`,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0B0E] via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0B0E] via-[#0C0B0E]/90 to-transparent pointer-events-none" />

        <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-10 relative z-10 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1F170E] border border-[#E88B00]/40 text-[#E88B00] font-mono text-xs font-bold tracking-wider uppercase rounded-full">
            <Skull className="w-3.5 h-3.5" />
            <span>Plataforma Comunitaria & Marketplace P2P</span>
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]">
              BLACK MARKET, <br />
              <span className="text-[#E88B00]">INTERCAMBIA Y CONECTA</span>
            </h1>
            <p className="text-sm font-normal text-neutral-300 max-w-2xl leading-relaxed">
              Consulta legalidad oficial de formatos, audita barajas contra tu inventario físico de colecciones y conecta con otros coleccionistas para realizar trade local sin intermediarios.
            </p>
          </div>

          {/* Buscador Redondeado */}
          <div className="pt-2 max-w-2xl">
            <div className="flex items-center bg-[#131217] border border-[#2A2733] focus-within:border-[#E88B00] transition rounded-2xl overflow-hidden p-1">
              <div className="pl-3 text-neutral-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar carta por nombre o comandante..."
                className="w-full px-3 py-2.5 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 outline-none"
              />
              <button
                type="button"
                className="px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 shrink-0 rounded-xl transition cursor-pointer"
              >
                <span>Buscar</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (!currentUser && onOpenAuthModal) onOpenAuthModal();
                else setIsCreateModalOpen(true);
              }}
              className="px-6 py-3 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black text-xs font-mono tracking-wider flex items-center gap-2 rounded-xl transition shadow-lg shadow-[#E88B00]/10 cursor-pointer active:translate-y-0.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>OFRECER CARTA</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wishlist')}
              className={`px-6 py-3 border font-bold text-xs font-mono tracking-wider flex items-center gap-2 rounded-xl transition cursor-pointer ${
                activeTab === 'wishlist'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                  : 'bg-[#131217] hover:bg-[#1A1820] border-[#2A2733] hover:border-neutral-500 text-neutral-200'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>MI WISHLIST ({myWishlist.length})</span>
            </button>
          </div>

        </div>

        {/* KPIs */}
        <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pb-8 pt-8 relative z-10">
          <div className="flex flex-wrap items-center gap-4">
            
            <div className="min-w-[160px] px-5 py-3.5 bg-[#131217]/90 border border-[#2A2733] flex flex-col justify-between rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                TRATOS ACTIVOS
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">
                {filteredPosts.length}
              </span>
            </div>

            <div className="min-w-[160px] px-5 py-3.5 bg-[#131217]/90 border border-[#2A2733] flex flex-col justify-between rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                EN MI WISHLIST
              </span>
              <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono leading-none">
                {myWishlist.length}
              </span>
            </div>

            <div className="min-w-[190px] px-5 py-3.5 bg-[#131217]/90 border border-[#2A2733] flex flex-col justify-between rounded-2xl">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                TASA LOCAL ACORDADA
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#E88B00] font-mono leading-none">
                  $3.200
                </span>
                <span className="text-[10px] font-mono text-neutral-400">COP / 1 USD</span>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ---------------------------------------------------------
          2. ESPACIO DE TRABAJO (PESTAÑAS Y CONTENIDO)
      --------------------------------------------------------- */}
      <main className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-8 space-y-6">
        
        {/* Selector de Pestañas */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs border-b border-[#242129] pb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'explore', label: 'Explorar Ofertas', icon: Compass },
              { id: 'my-posts', label: 'Mis Ofertas', icon: Layers },
              { id: 'wishlist', label: `Wishlist (${myWishlist.length})`, icon: Heart },
              { id: 'my-trades', label: 'Mis Intercambios', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition cursor-pointer rounded-xl border ${
                    isActive
                      ? 'bg-[#E88B00] text-black border-[#E88B00] font-black'
                      : 'bg-[#131217] text-neutral-400 border-[#2A2733] hover:text-white hover:border-neutral-500'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono">
            <span className="text-[11px] uppercase tracking-wider">Mostrando:</span>
            <span className="text-white font-bold">
              {activeTab === 'wishlist' ? `${myWishlist.length} cartas deseadas` : `${filteredPosts.length} ofertas activas`}
            </span>
          </div>
        </div>

        {/* CONTENIDO SEGÚN LA PESTAÑA */}
        <div className="max-w-4xl mx-auto space-y-4 pt-2">
          
          {/* PESTAÑA: WISHLIST (CARTAS FALTANTES SINCRONIZADAS) */}
          {activeTab === 'wishlist' ? (
            loadingWishlist ? (
              <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                <span>Cargando cartas de tu Wishlist...</span>
              </div>
            ) : myWishlist.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
                <Heart className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-neutral-300 font-bold uppercase">Tu Wishlist está vacía.</p>
                <p className="text-neutral-500 text-[11px]">
                  Sincroniza las cartas faltantes de tus mazos desde la pantalla de construcción para verlas listadas aquí y encontrar jugadores con esas copias.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-purple-300 font-bold">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Cartas Faltantes Registradas ({myWishlist.length})</span>
                  </div>
                  <span className="text-neutral-400 text-[11px]">Haz clic en buscar para ver quién ofrece cada una</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myWishlist.map((item) => {
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
                            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono">
                              Faltante en mazo
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery(cardName);
                              setActiveTab('explore');
                            }}
                            className="px-3 py-1.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
                            title="Buscar ofertas de esta carta"
                          >
                            <Flame className="w-3.5 h-3.5 fill-current" />
                            <span>Buscar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveWishlistCard(item.id)}
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
            )
          ) : (
            /* PESTAÑA: EXPLORAR OFERTAS DEL FEED COMUNITARIO */
            loading ? (
              <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
                <span>Inspeccionando ofertas en el Black Market...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
                <p className="text-neutral-300 font-bold uppercase">No se encontraron propuestas con esa carta.</p>
                <p className="text-neutral-500 text-[11px]">Prueba buscando otro nombre o publica qué buscas para recibir propuestas.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase text-xs font-mono tracking-wider transition cursor-pointer rounded-xl"
                >
                  Ver todas las ofertas
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => {
                // Chequear coincidencia con la Wishlist del usuario
                const matchesWishlist = (post.offered_cards || []).some((offered) =>
                  wishlistCardNames.has((offered.name || '').trim().toLowerCase())
                );

                return (
                  <article
                    key={post.id}
                    className={`bg-[#131217] border p-6 space-y-4 transition rounded-2xl ${
                      matchesWishlist 
                        ? 'border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40' 
                        : 'border-[#2A2733] hover:border-[#E88B00]/60'
                    }`}
                  >
                    {/* Encabezado del Trader */}
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#1A1822] border border-[#373344] flex items-center justify-center font-black text-[#E88B00] text-xs rounded-xl">
                          {((post.author?.username || post.author_username || 'U')).slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white text-xs block">
                            @{post.author?.username || post.author_username || 'Usuario'}
                          </span>
                          <span className="text-neutral-500 text-[10px] flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-neutral-400" />
                            {post.location || 'Medellín / Área Metropolitana'}
                          </span>
                        </div>
                      </div>

                      {matchesWishlist && (
                        <span className="px-3 py-1 text-[10px] font-bold font-mono bg-purple-950/80 border border-purple-500/50 text-purple-300 flex items-center gap-1.5 rounded-full shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Está en tu Wishlist
                        </span>
                      )}
                    </div>

                    {/* Cajas Comparativas: BUSCA ⇄ OFRECE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                      
                      {/* Caja BUSCA */}
                      <div className="p-4 bg-[#0A0F0D] border border-emerald-950 space-y-2 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                          BUSCA
                        </span>
                        <div className="space-y-1.5">
                          {(post.wanted_cards || []).map((c, i) => (
                            <div key={i} className="text-white font-bold text-xs truncate flex items-center justify-between">
                              <span>• {c.name}</span>
                              <span className="text-[10px] text-neutral-500">{c.condition || 'NM'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Caja OFRECE */}
                      <div className="p-4 bg-[#140F08] border border-[#E88B00]/20 space-y-2 rounded-xl">
                        <span className="text-[10px] font-bold text-[#E88B00] uppercase tracking-wider block">
                          OFRECE
                        </span>
                        <div className="space-y-1.5">
                          {(post.offered_cards || []).map((c, i) => (
                            <div key={i} className="text-white font-bold text-xs truncate flex items-center justify-between">
                              <span>• {c.name}</span>
                              <span className="text-[10px] text-[#E88B00] font-bold">
                                {c.price_usd ? `$${parseFloat(c.price_usd).toFixed(2)}` : 'NM'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {post.notes && (
                      <p className="text-[11px] font-mono text-neutral-400 bg-[#0C0B0E] px-3.5 py-2.5 border border-[#242129] rounded-xl">
                        <span className="text-[#E88B00] font-bold">Nota:</span> {post.notes}
                      </p>
                    )}

                    {/* Botón de acción */}
                    <div className="flex items-center justify-end pt-2 border-t border-[#242129]">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser && onOpenAuthModal) onOpenAuthModal();
                          else setSelectedProposalPost(post);
                        }}
                        className="px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-mono font-black text-xs uppercase tracking-wider transition cursor-pointer rounded-xl active:translate-y-0.5"
                      >
                        Proponer cambio
                      </button>
                    </div>

                  </article>
                );
              })
            )
          )}

        </div>

      </main>

      {/* Modales */}
      {isCreateModalOpen && (
        <SimpleCreateTradeModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          currentUserTradeCards={myTradeCards}
          onTradeCreated={() => {}}
        />
      )}

      {Boolean(selectedProposalPost) && (
        <TradeProposalModal
          isOpen={Boolean(selectedProposalPost)}
          onClose={() => setSelectedProposalPost(null)}
          targetPost={selectedProposalPost}
          currentUserInventory={myTradeCards}
          onProposalSuccess={() => {}}
        />
      )}

    </div>
  );
}
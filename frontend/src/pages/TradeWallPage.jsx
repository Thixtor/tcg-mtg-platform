// ---------------------------------------------------------
// PÁGINA: BLACK MARKET (ESTILO MODERNO / BORDES REDONDEADOS)
// ---------------------------------------------------------
import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';

import SimpleCreateTradeModal from '@/components/trade/SimpleCreateTradeModal';
import TradeProposalModal from '@/components/trade/TradeProposalModal';
import { useCardModal } from '@/context/CardModalContext';
import { getTradeMarketApi } from '@/api/trade';

const HERO_BACKGROUND_ART = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920&auto=format&fit=crop';

export default function TradeWallPage({
  currentUser,
  onNavigateToCatalog,
  onOpenAuthModal,
}) {
  const cardModal = useCardModal ? useCardModal() : null;
  const openCard = cardModal?.openCard || (() => {});

  const [activeTab, setActiveTab] = useState('explore');
  const [searchQuery, setSearchQuery] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposalPost, setSelectedProposalPost] = useState(null);

  const [posts, setPosts] = useState([
    {
      id: 'demo-1',
      author: { id: 'u1', username: 'Carlos', reputation_score: 98 },
      location: 'Medellín',
      wanted_cards: [{ name: 'Rhystic Study', condition: 'NM', price_usd: 38.0 }],
      offered_cards: [{ name: 'Cyclonic Rift', condition: 'NM', price_usd: 35.0 }],
      preferred_usd_rate: 3200,
      notes: 'Disponible para trade en Dragon Hobby Bello.'
    },
    {
      id: 'demo-2',
      author: { id: 'u2', username: 'Laura', reputation_score: 95 },
      location: 'Bogotá',
      wanted_cards: [{ name: 'Mana Crypt', condition: 'NM', price_usd: 180.0 }],
      offered_cards: [{ name: 'Ancient Tomb', condition: 'NM', price_usd: 90.0 }],
      preferred_usd_rate: 3200,
      notes: 'Acepto compensar la diferencia en efectivo.'
    },
    {
      id: 'demo-3',
      author: { id: 'u3', username: 'KikeMTG', reputation_score: 100 },
      location: 'Envigado',
      wanted_cards: [{ name: 'Jeweled Lotus', condition: 'NM', price_usd: 75.0 }],
      offered_cards: [
        { name: 'Sol Ring', condition: 'NM', price_usd: 18.0 },
        { name: 'Doubling Season', condition: 'NM', price_usd: 45.0 }
      ],
      preferred_usd_rate: 3200,
      notes: 'Cotejo precios TCGplayer Market.'
    }
  ]);

  const [myTradeCards, setMyTradeCards] = useState([]);
  const [loading, setLoading] = useState(false);

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
            location: item.location || 'Área Metropolitana',
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
        
        {/* Arte Panorámico con Fusión */}
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

        {/* Contenido Principal */}
        <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-10 relative z-10 space-y-6">
          
          {/* Badge Píldora Superior */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1F170E] border border-[#E88B00]/40 text-[#E88B00] font-mono text-xs font-bold tracking-wider uppercase rounded-full">
            <Skull className="w-3.5 h-3.5" />
            <span>Plataforma Comunitaria & Marketplace P2P</span>
          </div>

          {/* Título en Blanco Sólido */}
          <div className="max-w-3xl space-y-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]">
              BLACK MARKET, <br />
              <span className="text-[#E88B00]">INTERCAMBIA Y CONECTA</span>
            </h1>
            <p className="text-sm font-normal text-neutral-300 max-w-2xl leading-relaxed">
              Consulta legalidad oficial de formatos, audita barajas contra tu inventario físico de colecciones y conecta con otros coleccionistas para realizar trade local sin intermediarios.
            </p>
          </div>

          {/* Buscador Redondeado con Botón Integrado */}
          <div className="pt-2 max-w-2xl">
            <div className="flex items-center bg-[#131217] border border-[#2A2733] focus-within:border-[#E88B00] transition rounded-2xl overflow-hidden p-1">
              <div className="pl-3 text-neutral-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar carta por nombre o comandante en Scryfall..."
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

          {/* Botones de Acción Redondeados */}
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
              className="px-6 py-3 bg-[#131217] hover:bg-[#1A1820] border border-[#2A2733] hover:border-neutral-500 text-neutral-200 font-bold text-xs font-mono tracking-wider flex items-center gap-2 rounded-xl transition cursor-pointer"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              <span>MI WISHLIST</span>
            </button>
          </div>

        </div>

        {/* KPIs Redondeados */}
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
          2. ESPACIO DE TRABAJO (PESTAÑAS Y FEED REDONDEADOS)
      --------------------------------------------------------- */}
      <main className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-8 space-y-6">
        
        {/* Pestañas Redondeadas */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs border-b border-[#242129] pb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'explore', label: 'Explorar Ofertas', icon: Compass },
              { id: 'my-posts', label: 'Mis Ofertas', icon: Layers },
              { id: 'wishlist', label: 'Wishlist', icon: Heart },
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
            <span className="text-white font-bold">{filteredPosts.length} ofertas activas</span>
          </div>
        </div>

        {/* FEED DE TRATOS REDONDEADOS */}
        <div className="max-w-4xl mx-auto space-y-4 pt-2">
          
          {loading ? (
            <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
              <span>Inspeccionando ofertas en el Black Market...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
              <p className="text-neutral-300 font-bold uppercase">No se encontraron propuestas con esa carta.</p>
              <p className="text-neutral-500 text-[11px]">Publica qué buscas o qué ofreces para activar coincidencias con otros jugadores.</p>
              <button
                type="button"
                onClick={() => {
                  if (!currentUser && onOpenAuthModal) onOpenAuthModal();
                  else setIsCreateModalOpen(true);
                }}
                className="mt-2 px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase text-xs font-mono tracking-wider transition cursor-pointer rounded-xl"
              >
                + Publicar primera oferta
              </button>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const hasWanted = myTradeCards.some((myCard) =>
                (post.wanted_cards || []).some(
                  (w) => ((myCard.card_catalog?.name || myCard.name) || '').toLowerCase() === (w.name || '').toLowerCase()
                )
              );

              return (
                <article
                  key={post.id}
                  className="bg-[#131217] border border-[#2A2733] hover:border-[#E88B00]/60 p-6 space-y-4 transition rounded-2xl"
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

                    {hasWanted && (
                      <span className="px-3 py-1 text-[10px] font-bold font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Coincide con tu colección
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
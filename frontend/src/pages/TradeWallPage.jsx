// ============================================================================
// PÁGINA: ORQUESTADOR PRINCIPAL DEL BLACK MARKET / TRADE WALL (MODULAR)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Desacoplado en submódulos especializados en @/components/trade/:
//   * TradeHeroBanner: Encabezado cinemático, estadísticas y barra de búsqueda.
//   * TradeWallPostCard: Renderizado de publicaciones en el feed público.
//   * TradeAvailableTab: Gestión de cartas marcadas con is_for_trade == true.
//   * TradeWishlistTab: Cartas faltantes sincronizadas o deseadas.
//   * TradeMyPostsTab: Publicaciones abiertas por el usuario autenticado.
//   * TradeMyProposalsTab: Propuestas de intercambio P2P (recibidas / enviadas).
// - Maneja selección múltiple para crear publicaciones en lote sin publicar de golpe.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Compass, Layers, Heart, Users, ArrowLeftRight, Loader2 } from 'lucide-react';

import TradeHeroBanner from '@/components/trade/TradeHeroBanner';
import TradeWallPostCard from '@/components/trade/TradeWallPostCard';
import TradeWishlistTab from '@/components/trade/TradeWishlistTab';
import TradeAvailableTab from '@/components/trade/TradeAvailableTab';
import TradeMyPostsTab from '@/components/trade/TradeMyPostsTab';
import TradeProposalsTab from '@/components/trade/TradeMyProposalsTab';
import SimpleCreateTradeModal from '@/components/trade/SimpleCreateTradeModal';
import TradeProposalModal from '@/components/trade/TradeProposalModal';

import { 
  getTradeMarketApi, 
  getMyTradePostsApi, 
  getMyTradeProposalsApi, 
  respondTradeProposalApi 
} from '@/api/trade';
import { getMyWishlistApi, removeCardFromWishlistApi } from '@/api/wishlist';
import { getMyCollectionsApi, getCollectionCardsApi, updateCollectionCardApi } from '@/api/collections';

export default function TradeWallPage({
  currentUser,
  onOpenAuthModal,
  initialTab = 'explore',
  initialSearchQuery = ''
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProposalPost, setSelectedProposalPost] = useState(null);

  const [posts, setPosts] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [myTradeCards, setMyTradeCards] = useState([]);
  const [myWishlist, setMyWishlist] = useState([]);
  const [selectedForPostCards, setSelectedForPostCards] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [loadingTradeCards, setLoadingTradeCards] = useState(false);

  useEffect(() => {
    if (initialSearchQuery) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // 1. Cargar Feed del Mercado
  const fetchMarketPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeMarketApi({ limit: 40 });
      if (Array.isArray(data)) {
        setPosts(data.map((item, idx) => ({
          id: item.user_card_id || item.id || `post-${idx}`,
          author: { 
            id: item.owner_id || item.owner_username || 'user', 
            username: item.owner_username || 'Comunidad',
            reputation_score: item.owner_reputation || 100
          },
          location: item.location || 'Medellín / Área Metropolitana',
          wanted_cards: item.wanted_cards || [{ name: 'Cartas Commander / Staples', condition: 'Cualquiera' }],
          offered_cards: item.offered_cards || [{ 
            name: item.card_name || 'Carta MTG', 
            condition: item.condition || 'NM',
            image_url: item.image_url,
            price_usd: item.price_usd || 0
          }],
          preferred_usd_rate: item.preferred_usd_rate || 3200,
          notes: item.notes || item.trade_notes || 'Intercambio presencial local.'
        })));
      }
    } catch (err) {
      console.warn('[BlackMarket] Error consultando feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketPosts();
  }, [fetchMarketPosts]);

  // 2. Cargar Wishlist
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

  // 3. Cargar inventario disponible para trade (is_for_trade === true)
  const fetchUserTradeInventory = useCallback(async () => {
    if (!currentUser) return;
    setLoadingTradeCards(true);
    try {
      const cols = await getMyCollectionsApi();
      let tradeCards = [];
      for (const col of cols || []) {
        const cards = await getCollectionCardsApi(col.id);
        if (Array.isArray(cards)) {
          const available = cards
            .filter((c) => Boolean(c.is_for_trade))
            .map((c) => ({ ...c, collection_id: col.id, collection_name: col.name }));
          tradeCards.push(...available);
        }
      }
      setMyTradeCards(tradeCards);
    } catch (err) {
      console.warn('[BlackMarket] Error inventario trade:', err);
    } finally {
      setLoadingTradeCards(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUserTradeInventory();
  }, [fetchUserTradeInventory]);

  // 4. Cargar ofertas y propuestas propias
  const fetchMyTradesData = useCallback(() => {
    if (!currentUser) return;
    setLoadingProposals(true);
    Promise.allSettled([getMyTradePostsApi(), getMyTradeProposalsApi()])
      .then(([postsRes, propRes]) => {
        if (postsRes.status === 'fulfilled') setMyPosts(postsRes.value || []);
        if (propRes.status === 'fulfilled') setMyProposals(propRes.value || []);
      })
      .finally(() => setLoadingProposals(false));
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'my-posts' || activeTab === 'my-trades') {
      fetchMyTradesData();
    }
  }, [activeTab, fetchMyTradesData]);

  // Acciones sobre cartas de trade
  const handleRemoveFromTrade = async (item) => {
    try {
      await updateCollectionCardApi(item.collection_id, item.id, { is_for_trade: false });
      setMyTradeCards((prev) => prev.filter((c) => c.id !== item.id));
      setSelectedForPostCards((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err) {
      alert('Error retirando carta de la disponibilidad de trade.');
    }
  };

  const handleToggleSelectCard = (card) => {
    setSelectedForPostCards((prev) =>
      prev.some((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  };

  const handleSelectAllTradeCards = () => {
    if (selectedForPostCards.length === myTradeCards.length) {
      setSelectedForPostCards([]);
    } else {
      setSelectedForPostCards([...myTradeCards]);
    }
  };

  const handleOpenCreateModal = (preselected = []) => {
    if (!currentUser && onOpenAuthModal) {
      onOpenAuthModal();
      return;
    }
    setSelectedForPostCards(preselected);
    setIsCreateModalOpen(true);
  };

  const handleRespondProposal = async (proposalId, statusAction) => {
    try {
      await respondTradeProposalApi(proposalId, statusAction);
      fetchMyTradesData();
    } catch (err) {
      alert('Error al responder la propuesta de trade.');
    }
  };

  const wishlistCardNames = useMemo(() => {
    return new Set(myWishlist.map((c) => (c.card_catalog?.name || c.name || '').trim().toLowerCase()).filter(Boolean));
  }, [myWishlist]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => 
      (p.wanted_cards || []).some((c) => (c.name || '').toLowerCase().includes(q)) ||
      (p.offered_cards || []).some((c) => (c.name || '').toLowerCase().includes(q)) ||
      (p.author?.username || '').toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0C0B0E] text-neutral-100 font-sans pb-24 selection:bg-[#E88B00] selection:text-black">
      
      {/* 1. Header Banner */}
      <TradeHeroBanner
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCreate={() => handleOpenCreateModal(myTradeCards)}
        wishlistCount={myWishlist.length}
        activeTradesCount={filteredPosts.length}
      />

      {/* 2. Workspace & Pestañas */}
      <main className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs border-b border-[#242129] pb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'explore', label: 'Explorar Ofertas', icon: Compass },
              { id: 'available-trade', label: `Para Trade (${myTradeCards.length})`, icon: ArrowLeftRight },
              { id: 'wishlist', label: `Wishlist (${myWishlist.length})`, icon: Heart },
              { id: 'my-posts', label: `Mis Ofertas (${myPosts.length})`, icon: Layers },
              { id: 'my-trades', label: `Mis Intercambios (${myProposals.length})`, icon: Users },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-5 py-2.5 font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition cursor-pointer rounded-xl border ${
                  activeTab === id
                    ? 'bg-[#E88B00] text-black border-[#E88B00] font-black'
                    : 'bg-[#131217] text-neutral-400 border-[#2A2733] hover:text-white hover:border-neutral-500'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="text-neutral-400 text-xs font-mono">
            {activeTab === 'available-trade'
              ? `${myTradeCards.length} cartas disponibles para cambio`
              : activeTab === 'wishlist'
              ? `${myWishlist.length} cartas deseadas`
              : `${filteredPosts.length} ofertas activas`}
          </div>
        </div>

        {/* 3. Vistas Centrales Modularizadas */}
        <div className="max-w-4xl mx-auto space-y-4 pt-2">
          
          {/* Pestaña: Para Trade (Disponibles físicamente) */}
          {activeTab === 'available-trade' && (
            <TradeAvailableTab
              loading={loadingTradeCards}
              tradeCards={myTradeCards}
              selectedCards={selectedForPostCards}
              onToggleSelect={handleToggleSelectCard}
              onSelectAll={handleSelectAllTradeCards}
              onOpenCreatePost={handleOpenCreateModal}
              onRemoveFromTrade={handleRemoveFromTrade}
            />
          )}

          {/* Pestaña: Wishlist */}
          {activeTab === 'wishlist' && (
            <TradeWishlistTab
              loading={loadingWishlist}
              wishlist={myWishlist}
              onSearchCard={(name) => { setSearchQuery(name); setActiveTab('explore'); }}
              onRemoveItem={async (id) => {
                await removeCardFromWishlistApi(id);
                setMyWishlist((prev) => prev.filter((i) => i.id !== id));
              }}
            />
          )}

          {/* Pestaña: Mis Ofertas Publicadas */}
          {activeTab === 'my-posts' && (
            <TradeMyPostsTab
              loading={loadingProposals}
              posts={myPosts}
              onCreateClick={() => handleOpenCreateModal(myTradeCards)}
            />
          )}

          {/* Pestaña: Mis Intercambios (Propuestas) */}
          {activeTab === 'my-trades' && (
            <TradeProposalsTab
              loading={loadingProposals}
              proposals={myProposals}
              currentUserId={currentUser?.id}
              onRespondProposal={handleRespondProposal}
            />
          )}

          {/* Pestaña: Explorar Ofertas Públicas */}
          {activeTab === 'explore' && (
            loading ? (
              <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
                <span>Inspeccionando ofertas en el Black Market...</span>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
                <p className="text-neutral-300 font-bold uppercase">No se encontraron propuestas con esa carta.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-6 py-2.5 bg-[#E88B00] text-black font-black uppercase rounded-xl cursor-pointer"
                >
                  Ver todas las ofertas
                </button>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <TradeWallPostCard
                  key={post.id}
                  post={post}
                  matchesWishlist={(post.offered_cards || []).some((o) => wishlistCardNames.has((o.name || '').toLowerCase()))}
                  onPropose={(p) => currentUser ? setSelectedProposalPost(p) : onOpenAuthModal?.()}
                />
              ))
            )
          )}

        </div>
      </main>

      {/* 4. Modales */}
      {isCreateModalOpen && (
        <SimpleCreateTradeModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          currentUserTradeCards={myTradeCards}
          preselectedCards={selectedForPostCards}
          wishlistCards={myWishlist}
          onTradeCreated={() => { 
            fetchMarketPosts(); 
            fetchMyTradesData(); 
            setActiveTab('my-posts'); 
          }}
        />
      )}

      {Boolean(selectedProposalPost) && (
        <TradeProposalModal
          isOpen={Boolean(selectedProposalPost)}
          onClose={() => setSelectedProposalPost(null)}
          targetPost={selectedProposalPost}
          currentUserInventory={myTradeCards}
          onProposalSuccess={() => { 
            fetchMyTradesData(); 
            setActiveTab('my-trades'); 
          }}
        />
      )}

    </div>
  );
}
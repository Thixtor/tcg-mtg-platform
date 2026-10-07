// ============================================================================
// PÁGINA: ORQUESTADOR PRINCIPAL DE COLECCIONES / BINDERS (POO / DDD)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Administra las colecciones físicas (UserCard / Collection) y su stock real.
// - Soporta ajuste de cantidades (+1, -1) directamente desde el workspace.
// - Implementa actualización optimista en memoria para respuesta táctil inmediata
//   y sincronización en segundo plano con el backend mediante updateCollectionCardApi.
// - Recalcula métricas de valor y conteo total de cartas en tiempo real.
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layers } from 'lucide-react';

import { 
  getMyCollectionsApi, 
  getUserCollectionsApi, 
  createMyCollectionApi, 
  getCollectionCardsApi, 
  updateCollectionCardApi,
  removeCardFromCollectionApi,
  deleteCollectionApi 
} from '@/api/collections';

import { isAuthenticated } from '@/services/session.service';
import CreateCollectionModal from '@/components/collections/CreateCollectionModal';
import GuestStateBanner from '@/components/common/GuestStateBanner';
import CollectionsDashboardView from './views/CollectionsDashboardView';
import CollectionWorkspaceView from './views/CollectionWorkspaceView';
import { useTheme } from '@/context/ThemeContext';
import { parseApiError } from '@/utils/apiErrors';
import { useCardCollectionFilter } from '@/hooks/useCardCollectionFilter';
import { calculateCollectionMetrics } from '@/utils/pricing';

export default function CollectionsPage({ 
  userId, 
  selectedBinderId,
  onSelectBinderId,
  openCreateTrigger = 0,
  onOpenAuthModal, 
  onNavigateToCatalog 
}) {
  const { isLightMode } = useTheme();
  const hasSession = isAuthenticated();

  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionCards, setCollectionCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Selector de tienda: TCGplayer Market vs Card Kingdom
  const [priceSource, setPriceSource] = useState('tcgplayer');

  // Filtros Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortByCollections, setSortByCollections] = useState('recent');

  // Sub-pestaña (all, decks, trade)
  const [collectionSubTab, setCollectionSubTab] = useState('all');

  const [errorMsg, setErrorMsg] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const lastTriggerRef = useRef(openCreateTrigger);
  useEffect(() => {
    if (openCreateTrigger > 0 && openCreateTrigger !== lastTriggerRef.current) {
      setIsCreateModalOpen(true);
      lastTriggerRef.current = openCreateTrigger;
    }
  }, [openCreateTrigger]);

  const {
    filterQuery: cardSearchQuery,
    setFilterQuery: setCardSearchQuery,
    sortBy: cardSortBy,
    setSortBy: setCardSortBy,
    onlyFoils,
    setOnlyFoils,
    filteredCards: visibleCards
  } = useCardCollectionFilter(collectionCards, {
    enableZones: false,
    defaultSort: 'price'
  });

  if (!userId && !hasSession) {
    return (
      <main className={`min-h-screen px-4 py-12 transition-colors duration-200 ${
        isLightMode ? 'bg-[#FAF7F2]' : 'bg-[#0B0B0B]'
      }`}>
        <GuestStateBanner
          title="Carpetas y Gestión de Inventario Físico"
          description="Organiza tus cartas de Magic en carpetas digitales, audita tus copias físicas disponibles y publica listas para intercambio local en el Muro de Trade."
          icon={Layers}
          onOpenAuthModal={onOpenAuthModal}
        />
      </main>
    );
  }

  // 1. Cargar colecciones del usuario
  const fetchCollections = useCallback(async (signal) => {
    if (!userId && !hasSession) {
      setLoadingCollections(false);
      return;
    }

    try {
      setLoadingCollections(true);
      setErrorMsg(null);
      const data = userId 
        ? await getUserCollectionsApi(userId, { signal }) 
        : await getMyCollectionsApi({ signal });
      const list = Array.isArray(data) ? data : [];
      setCollections(list);

      if (selectedBinderId) {
        const found = list.find((c) => String(c.id) === String(selectedBinderId));
        if (found) setSelectedCollection(found);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setErrorMsg(parseApiError(err, 'Error al cargar las carpetas del usuario.'));
      }
    } finally {
      setLoadingCollections(false);
    }
  }, [userId, hasSession, selectedBinderId]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCollections(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchCollections]);

  // 2. Cargar cartas de la colección activa
  const refreshCollectionCards = useCallback(async (collectionId) => {
    const targetId = collectionId || selectedCollection?.id;
    if (!targetId) return;

    try {
      setLoadingCards(true);
      setErrorMsg(null);
      const cards = await getCollectionCardsApi(targetId);
      const safeCards = Array.isArray(cards) ? cards : [];
      setCollectionCards(safeCards);

      // Calcular total de copias sumando quantities individuales
      const totalCopies = safeCards.reduce((acc, c) => acc + (c.quantity || 1), 0);

      setCollections((prev) =>
        prev.map((c) => (c.id === targetId ? { ...c, card_count: totalCopies } : c))
      );
      setSelectedCollection((prev) =>
        prev && prev.id === targetId ? { ...prev, card_count: totalCopies } : prev
      );
    } catch (err) {
      setErrorMsg(parseApiError(err, 'No fue posible recargar las cartas de esta carpeta.'));
    } finally {
      setLoadingCards(false);
    }
  }, [selectedCollection?.id]);

  const handleSelectCollection = (col) => {
    setSelectedCollection(col);
    onSelectBinderId?.(col?.id || null);
    if (col?.id) refreshCollectionCards(col.id);
  };

  const handleCreateCollection = async (payload) => {
    try {
      const newCollection = await createMyCollectionApi(payload);
      setCollections((prev) => [...prev, newCollection]);
      setIsCreateModalOpen(false);
      handleSelectCollection(newCollection);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'No se pudo crear la carpeta.'));
    }
  };

  const handleDeleteCollection = async (collection) => {
    if (!window.confirm(`¿Estás seguro de eliminar la colección "${collection.name}"?`)) return;
    try {
      if (typeof deleteCollectionApi === 'function') {
        await deleteCollectionApi(collection.id);
      }
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
      if (selectedCollection?.id === collection.id) setSelectedCollection(null);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'No fue posible eliminar la carpeta.'));
    }
  };

  const handleToggleFavorite = (collection) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === collection.id ? { ...c, is_favorite: !c.is_favorite } : c))
    );
  };

  // --------------------------------------------------------------------------
  // AJUSTE RÁPIDO DE COPIAS (+ / -) Y ELIMINACIÓN DIRECTA
  // --------------------------------------------------------------------------
  const handleUpdateCardQuantity = async (cardId, delta) => {
    if (!selectedCollection?.id) return;

    const currentCard = collectionCards.find((c) => c.id === cardId);
    if (!currentCard) return;

    const oldQty = currentCard.quantity || 1;
    const newQty = oldQty + delta;

    if (newQty <= 0) {
      const confirmRemove = window.confirm(`¿Deseas quitar "${currentCard.name || 'esta carta'}" de la carpeta?`);
      if (!confirmRemove) return;
      return handleRemoveCard(cardId);
    }

    // Actualización optimista inmediata en memoria
    setCollectionCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, quantity: newQty } : c))
    );

    try {
      await updateCollectionCardApi(selectedCollection.id, cardId, { quantity: newQty });
    } catch (err) {
      console.error('[CollectionsPage] Error actualizando cantidad:', err);
      // Revertir si falla en el backend
      setCollectionCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, quantity: oldQty } : c))
      );
      setErrorMsg('No se pudo actualizar la cantidad en el servidor.');
    }
  };

  const handleRemoveCard = async (cardId) => {
    if (!selectedCollection?.id) return;

    const previousList = [...collectionCards];
    setCollectionCards((prev) => prev.filter((c) => c.id !== cardId));

    try {
      await removeCardFromCollectionApi(selectedCollection.id, cardId);
    } catch (err) {
      console.error('[CollectionsPage] Error eliminando carta:', err);
      setCollectionCards(previousList);
      setErrorMsg('No se pudo eliminar la carta de la carpeta.');
    }
  };

  // Métricas globales recalculadas con la tienda seleccionada
  const globalStats = useMemo(() => {
    const totalCollections = collections.length;
    let totalCards = 0;
    let totalValue = 0;

    collections.forEach((col) => {
      if (Array.isArray(col.cards) && col.cards.length > 0) {
        const { count, totalValue: colVal } = calculateCollectionMetrics(col.cards, priceSource);
        totalCards += count;
        totalValue += colVal;
      } else {
        totalCards += col.card_count || 0;
        totalValue += col.total_value || 0;
      }
    });

    return { totalCollections, totalCards, totalValue };
  }, [collections, priceSource]);

  // Colecciones procesadas
  const processedCollections = useMemo(() => {
    return collections
      .filter((c) => {
        const matchText = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (activeFilter === 'private') return matchText && !c.is_public_trade;
        if (activeFilter === 'public') return matchText && c.is_public_trade;
        if (activeFilter === 'favorites') return matchText && c.is_favorite;
        return matchText;
      })
      .sort((a, b) => {
        if (sortByCollections === 'cards') return (b.card_count || 0) - (a.card_count || 0);
        if (sortByCollections === 'value') return (b.total_value || 0) - (a.total_value || 0);
        if (sortByCollections === 'name') return (a.name || '').localeCompare(b.name || '');
        return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
      });
  }, [collections, searchQuery, activeFilter, sortByCollections]);

  const activeCards = useMemo(() => {
    if (collectionSubTab === 'trade') {
      return visibleCards.filter((c) => c.is_for_trade);
    }
    return visibleCards;
  }, [visibleCards, collectionSubTab]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      {errorMsg && (
        <div className="max-w-[1920px] mx-auto px-6 pt-4">
          <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {selectedCollection ? (
        <CollectionWorkspaceView
          collection={selectedCollection}
          collectionCards={collectionCards}
          loadingCards={loadingCards}
          subTab={collectionSubTab}
          onSubTabChange={setCollectionSubTab}
          priceSource={priceSource}
          onPriceSourceChange={setPriceSource}
          cardSearchQuery={cardSearchQuery}
          onCardSearchChange={setCardSearchQuery}
          onlyFoils={onlyFoils}
          onToggleFoils={() => setOnlyFoils(!onlyFoils)}
          cardSortBy={cardSortBy}
          onCardSortChange={setCardSortBy}
          activeCards={activeCards}
          onBack={() => handleSelectCollection(null)}
          onNavigateToCatalog={onNavigateToCatalog}
          onCardAdded={() => refreshCollectionCards(selectedCollection.id)}
          onRefreshCollection={() => refreshCollectionCards(selectedCollection.id)}
          onUpdateQuantity={handleUpdateCardQuantity}
          onRemoveCard={handleRemoveCard}
        />
      ) : (
        <CollectionsDashboardView
          collections={collections}
          processedCollections={processedCollections}
          globalStats={globalStats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          priceSource={priceSource}
          onPriceSourceChange={setPriceSource}
          sortBy={sortByCollections}
          onSortChange={setSortByCollections}
          loading={loadingCollections}
          onRefresh={() => fetchCollections()}
          onCreateClick={() => setIsCreateModalOpen(true)}
          onSelectCollection={handleSelectCollection}
          onDeleteCollection={handleDeleteCollection}
          onToggleFavorite={handleToggleFavorite}
          onNavigateToCatalog={onNavigateToCatalog}
          isLightMode={isLightMode}
        />
      )}

      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCollection}
        currentCount={collections.length}
      />
    </div>
  );
}
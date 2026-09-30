// ---------------------------------------------------------
// VISTA: GESTIÓN DE BINDERS Y COLECCIONES P2P (MODULARIZADO)
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FolderPlus, 
  Folder, 
  Layers, 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  ArrowUpDown 
} from 'lucide-react';

import { 
  getMyCollectionsApi, 
  getUserCollectionsApi, 
  createMyCollectionApi, 
  getCollectionCardsApi, 
  updateCollectionCardApi, 
  removeCardFromCollectionApi 
} from '@/api/collections';

import { isAuthenticated } from '@/services/session.service';
import { useCardModal } from '@/context/CardModalContext';
import CreateCollectionModal from '@/components/collections/CreateCollectionModal';
import WorkspaceToolbar from '@/components/common/WorkspaceToolbar';
import CardGridItem from '@/components/common/CardGridItem';
import GuestStateBanner from '@/components/common/GuestStateBanner';
import { useTheme } from '@/context/ThemeContext';
import { parseApiError } from '@/utils/apiErrors';
import { 
  useCardCollectionFilter, 
  extractCardPriceUsd 
} from '@/hooks/useCardCollectionFilter';

export default function BindersPage({ userId, onOpenAuthModal, onNavigateToTradeWall }) {
  const { isLightMode } = useTheme();
  const { openCard } = useCardModal();
  const hasSession = isAuthenticated();

  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState(null);

  const [collectionCards, setCollectionCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Estados visuales de la Toolbar
  const [viewMode, setViewMode] = useState('grid');
  const [cardSize, setCardSize] = useState('md');
  const [errorMsg, setErrorMsg] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 1. Delegación de filtrado y ordenamiento en el hook universal
  const {
    filterQuery,
    setFilterQuery,
    sortBy,
    setSortBy,
    onlyFoils,
    setOnlyFoils,
    onlyTrade,
    setOnlyTrade,
    filteredCards: visibleCards
  } = useCardCollectionFilter(collectionCards, {
    enableZones: false,
    defaultSort: 'name'
  });

  // Guard para visitantes anónimos en vista personal (Soft-Gate)
  if (!userId && !hasSession) {
    return (
      <main className={`min-h-screen px-4 py-12 transition-colors duration-200 ${
        isLightMode ? 'bg-[#FAF7F2]' : 'bg-[#0B0B0B]'
      }`}>
        <GuestStateBanner
          title="Carpetas y Gestión de Inventario Físico"
          description="Organiza tus cartas de Magic en Binders digitales, controla tus copias disponibles y publica listas para intercambio local en el Muro de Trade."
          icon={Layers}
          onOpenAuthModal={onOpenAuthModal}
        />
      </main>
    );
  }

  // 2. Cargar listado de binders (autenticado o por perfil público)
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
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.warn('[Binders] Error al cargar colecciones:', err);
        setErrorMsg(parseApiError(err, 'Error al cargar las colecciones del usuario.'));
      }
    } finally {
      setLoadingCollections(false);
    }
  }, [userId, hasSession]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchCollections(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchCollections]);

  // 3. Sincronizar cartas de la colección seleccionada
  const refreshCollectionCards = useCallback(async (collectionId) => {
    if (!collectionId) return;
    try {
      setLoadingCards(true);
      setErrorMsg(null);
      const cards = await getCollectionCardsApi(collectionId);
      const cardList = Array.isArray(cards) ? cards : [];
      setCollectionCards(cardList);
      if (cardList.length > 0 && !hoveredCard) {
        setHoveredCard(cardList[0]);
      }
    } catch (err) {
      console.warn('[Binders] Error al cargar cartas:', err);
      setErrorMsg(parseApiError(err, 'No fue posible cargar las cartas de este binder.'));
      setCollectionCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, [hoveredCard]);

  const handleSelectCollection = (col) => {
    setSelectedCollection(col);
    setHoveredCard(null);
    refreshCollectionCards(col.id);
  };

  // 4. Crear nuevo binder
  const handleCreateCollection = async (payload) => {
    try {
      const newCollection = await createMyCollectionApi(payload);
      setCollections((prev) => [...prev, newCollection]);
      setIsCreateModalOpen(false);
      handleSelectCollection(newCollection);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'No se pudo crear el binder.'));
    }
  };

  // 5. Control de inventario físico
  const handleUpdateQuantity = async (cardItem, delta) => {
    const newQty = (cardItem.quantity || 1) + delta;
    if (newQty <= 0) {
      handleRemoveCard(cardItem.id);
      return;
    }

    try {
      await updateCollectionCardApi(selectedCollection.id, cardItem.id, {
        quantity: newQty
      });
      refreshCollectionCards(selectedCollection.id);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error actualizando la cantidad.'));
    }
  };

  const handleToggleTradeStatus = async (cardItem) => {
    try {
      await updateCollectionCardApi(selectedCollection.id, cardItem.id, {
        is_for_trade: !cardItem.is_for_trade
      });
      refreshCollectionCards(selectedCollection.id);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error modificando disponibilidad para trade.'));
    }
  };

  const handleRemoveCard = async (cardId) => {
    try {
      await removeCardFromCollectionApi(selectedCollection.id, cardId);
      refreshCollectionCards(selectedCollection.id);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error al remover la carta del binder.'));
    }
  };

  const totalCardsCount = useMemo(() => {
    return collectionCards.reduce((acc, c) => acc + (c.quantity || 1), 0);
  }, [collectionCards]);

  const totalMarketValue = useMemo(() => {
    return collectionCards.reduce((acc, c) => acc + (extractCardPriceUsd(c) * (c.quantity || 1)), 0);
  }, [collectionCards]);

  const activeDisplayCard = hoveredCard || visibleCards[0] || null;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      <div className="w-full max-w-[1920px] mx-auto px-6 py-6 space-y-6">

        {/* FEEDBACK DE ERROR */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-neutral-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISTA 1: ESPACIO DE TRABAJO DEL BINDER SELECCIONADO           */}
        {/* ------------------------------------------------------------- */}
        {selectedCollection ? (
          <div className="space-y-6">
            
            {/* Header del Binder */}
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-neutral-900/60 border-neutral-800'
            }`}>
              <div className="space-y-1">
                <button
                  onClick={() => { setSelectedCollection(null); setHoveredCard(null); }}
                  className="flex items-center gap-1.5 text-xs text-amber-500 hover:underline mb-1 font-mono"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver a mis colecciones
                </button>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Folder className="w-6 h-6 text-amber-500" />
                    {selectedCollection.name}
                  </h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                    selectedCollection.is_public_trade 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {selectedCollection.is_public_trade ? 'Trade Público' : 'Privado'}
                  </span>
                </div>
                {selectedCollection.description && (
                  <p className="text-xs text-neutral-400 max-w-xl">{selectedCollection.description}</p>
                )}
              </div>

              {/* Métricas del Binder */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className={`p-3 rounded-xl border text-center ${
                  isLightMode ? 'bg-[#FAF7F2] border-[#E8E2D5]' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <span className="text-[10px] text-neutral-500 block">TOTAL CARTAS</span>
                  <span className="text-lg font-black text-amber-500">{totalCardsCount}</span>
                </div>
                <div className={`p-3 rounded-xl border text-center ${
                  isLightMode ? 'bg-[#FAF7F2] border-[#E8E2D5]' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <span className="text-[10px] text-neutral-500 block">VALOR ESTIMADO</span>
                  <span className="text-lg font-black text-emerald-400">${totalMarketValue.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Layout de Dos Columnas: Inspección Lateral + Catálogo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Panel Izquierdo: Inspección Fija */}
              <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6 self-start space-y-4">
                <div className={`rounded-2xl border p-5 space-y-4 ${
                  isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-neutral-900/60 border-neutral-800'
                }`}>
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 border-b pb-3 border-neutral-800/60">
                    <span className="uppercase font-bold">Detalle de Ejemplar</span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>

                  {activeDisplayCard ? (
                    <div className="space-y-4">
                      <div 
                        className="aspect-[2.5/3.5] w-full rounded-xl overflow-hidden bg-neutral-950 shadow-xl relative cursor-pointer"
                        onClick={() => openCard(activeDisplayCard.card_catalog || activeDisplayCard)}
                      >
                        {activeDisplayCard.card_catalog?.image_url || activeDisplayCard.image_url ? (
                          <img 
                            src={activeDisplayCard.card_catalog?.image_url || activeDisplayCard.image_url} 
                            alt={activeDisplayCard.card_catalog?.name || activeDisplayCard.name}
                            className="w-full h-full object-cover hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 p-4 text-center">
                            Sin Imagen Disponible
                          </div>
                        )}
                        {activeDisplayCard.is_foil && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-gradient-to-r from-amber-400 to-pink-500 text-black">
                            FOIL
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h3 
                          className="text-base font-black truncate cursor-pointer hover:text-amber-500 transition"
                          onClick={() => openCard(activeDisplayCard.card_catalog || activeDisplayCard)}
                        >
                          {activeDisplayCard.card_catalog?.name || activeDisplayCard.name}
                        </h3>
                        <p className="text-xs text-neutral-400">
                          {activeDisplayCard.card_catalog?.type_line || 'Tipo de carta'}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/40 text-xs font-mono">
                          <span className="text-neutral-500">Condición física:</span>
                          <span className="font-bold text-amber-400">{activeDisplayCard.condition || 'NM'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-neutral-500">Precio unitario:</span>
                          <span className="font-bold text-emerald-400">
                            ${extractCardPriceUsd(activeDisplayCard).toFixed(2)} USD
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-neutral-500">En este binder:</span>
                          <span className="font-bold text-white">x{activeDisplayCard.quantity || 1}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleTradeStatus(activeDisplayCard)}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          activeDisplayCard.is_for_trade
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>{activeDisplayCard.is_for_trade ? 'Publicada para Trade' : 'Marcar para Trade'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-neutral-500">
                      Pasa el cursor sobre una carta para inspeccionar sus características.
                    </div>
                  )}
                </div>
              </aside>

              {/* Panel Derecho: Toolbar Compartida + Grid Reutilizable */}
              <main className="lg:col-span-8 xl:col-span-9 space-y-4">
                
                <WorkspaceToolbar
                  collectionFilters={{
                    onlyFoils,
                    onToggleFoils: () => setOnlyFoils(!onlyFoils),
                    onlyTrade,
                    onToggleTrade: () => setOnlyTrade(!onlyTrade)
                  }}
                  viewMode={viewMode}
                  onChangeViewMode={setViewMode}
                  cardSize={cardSize}
                  onChangeCardSize={setCardSize}
                  filterQuery={filterQuery}
                  onFilterChange={setFilterQuery}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  sortOptions={[
                    { value: 'name', label: 'Por Nombre' },
                    { value: 'price', label: 'Por Precio (Mayor)' },
                    { value: 'quantity', label: 'Por Cantidad' }
                  ]}
                  isLightMode={isLightMode}
                />

                {loadingCards ? (
                  <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Sincronizando inventario de cartas...</span>
                  </div>
                ) : visibleCards.length === 0 ? (
                  <div className={`py-16 text-center text-xs rounded-xl border border-dashed ${
                    isLightMode ? 'bg-[#EAE4D7] border-[#D9D0BE] text-neutral-600' : 'bg-neutral-900/40 border-neutral-800 text-neutral-500'
                  }`}>
                    {filterQuery || onlyTrade || onlyFoils
                      ? 'No hay cartas que coincidan con los filtros aplicados en este binder.'
                      : 'Este binder está vacío. Añade cartas desde el Catálogo o las opciones de carga rápida.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {visibleCards.map((item) => (
                      <CardGridItem
                        key={item.id}
                        card={item}
                        cardSize={cardSize}
                        isSelected={hoveredCard?.id === item.id}
                        isLightMode={isLightMode}
                        onHover={setHoveredCard}
                        onClick={() => openCard(item.card_catalog || item)}
                        onIncrement={() => handleUpdateQuantity(item, 1)}
                        onRemove={() => handleRemoveCard(item.id)}
                        onToggleTrade={() => handleToggleTradeStatus(item)}
                        badgeTopLeft={item.condition || 'NM'}
                        showTradeBadge={true}
                      />
                    ))}
                  </div>
                )}
              </main>

            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VISTA 2: BIBLIOTECA GENERAL DE BINDERS (GALERÍA)              */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Layers className="w-6 h-6 text-amber-500" />
                  Mis Colecciones & Binders
                </h1>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Gestiona tus carpetas físicas, copias de colección y ofertas para el Muro de Trade.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchCollections()}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 border border-neutral-800 transition"
                  title="Refrescar colecciones"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={collections.length >= 10}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-md"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Nueva Carpeta ({collections.length}/10)</span>
                </button>
              </div>
            </div>

            {loadingCollections ? (
              <div className="flex flex-col items-center justify-center py-24 text-neutral-500 text-xs font-mono gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span>Cargando carpetas del usuario...</span>
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-20 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-2xl space-y-3">
                <FolderPlus className="w-10 h-10 text-neutral-600 mx-auto" />
                <h3 className="text-base font-bold text-neutral-200">Aún no tienes colecciones</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Crea una carpeta para catalogar tus cartas físicas, definir qué tienes para intercambio y auditar tu colección.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Crear mi primer Binder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {collections.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollection(col)}
                    className="group bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition shadow-md flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 bg-neutral-800 group-hover:bg-amber-500/10 rounded-xl text-neutral-300 group-hover:text-amber-500 transition">
                          <Folder className="w-6 h-6" />
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          col.is_public_trade 
                            ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400' 
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-500'
                        }`}>
                          {col.is_public_trade ? 'Trade Público' : 'Privado'}
                        </span>
                      </div>

                      <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition truncate">
                        {col.name}
                      </h3>
                      <p className="text-xs text-neutral-400 line-clamp-2">
                        {col.description || 'Sin notas descriptivas.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500 font-mono">
                      <span>{col.card_count ?? 0} cartas</span>
                      <span className="text-amber-400 group-hover:translate-x-0.5 transition">Abrir &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal de Creación de Binder */}
      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCollection}
        currentCount={collections.length}
      />
    </div>
  );
}
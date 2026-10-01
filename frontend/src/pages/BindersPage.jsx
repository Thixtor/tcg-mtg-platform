// ---------------------------------------------------------
// VISTA: GESTIÓN DE CARPETAS Y COLECCIONES DE CARTAS (MTG)
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  FolderPlus, 
  Folder, 
  Layers, 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  ArrowUpDown,
  Globe,
  Lock,
  Plus
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

export default function BindersPage({ 
  userId, 
  selectedBinderId,
  onSelectBinderId,
  openCreateTrigger = 0,
  onOpenAuthModal, 
  onNavigateToTradeWall 
}) {
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

  // Control estricto del disparador para abrir el modal SOLO cuando se incremente conscientemente
  const lastTriggerRef = useRef(openCreateTrigger);
  useEffect(() => {
    if (openCreateTrigger > 0 && openCreateTrigger !== lastTriggerRef.current) {
      setIsCreateModalOpen(true);
      lastTriggerRef.current = openCreateTrigger;
    }
  }, [openCreateTrigger]);

  // Delegación de filtrado y ordenamiento en el hook universal
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
          description="Organiza tus cartas de Magic en carpetas digitales, audita tus copias físicas disponibles y publica listas para intercambio local en el Muro de Trade."
          icon={Layers}
          onOpenAuthModal={onOpenAuthModal}
        />
      </main>
    );
  }

  // 1. Cargar listado de carpetas
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

      // Si viene un ID preseleccionado desde fuera
      if (selectedBinderId) {
        const found = list.find((c) => String(c.id) === String(selectedBinderId));
        if (found) {
          setSelectedCollection(found);
        }
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.warn('[Carpetas] Error al cargar colecciones:', err);
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

  // 2. Sincronizar cartas de la carpeta seleccionada
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
      console.warn('[Carpetas] Error al cargar cartas:', err);
      setErrorMsg(parseApiError(err, 'No fue posible cargar las cartas de esta carpeta.'));
      setCollectionCards([]);
    } finally {
      setLoadingCards(false);
    }
  }, [hoveredCard]);

  const handleSelectCollection = (col) => {
    setSelectedCollection(col);
    onSelectBinderId?.(col?.id || null);
    setHoveredCard(null);
    if (col?.id) {
      refreshCollectionCards(col.id);
    }
  };

  // 3. Crear nueva carpeta y abrirla de inmediato
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
      setErrorMsg(parseApiError(err, 'Error al remover la carta de la carpeta.'));
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

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-neutral-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISTA 1: ESPACIO DE TRABAJO DE LA CARPETA SELECCIONADA         */}
        {/* ------------------------------------------------------------- */}
        {selectedCollection ? (
          <div className="space-y-6">
            
            {/* Header de la Carpeta Cinematográfico */}
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden ${
              isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-[#111113] border-neutral-800'
            }`}>
              {selectedCollection.art_url && (
                <div 
                  className="absolute right-0 top-0 bottom-0 w-3/4 sm:w-2/3 bg-cover bg-center pointer-events-none opacity-30"
                  style={{
                    backgroundImage: `url(${selectedCollection.art_url})`,
                    maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 100%)'
                  }}
                />
              )}

              <div className="space-y-1.5 relative z-10">
                <button
                  onClick={() => handleSelectCollection(null)}
                  className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold transition rounded-lg px-2.5 py-1 mb-1 ${
                    isLightMode 
                      ? 'bg-[#DDD5C5]/70 hover:bg-[#DDD5C5] text-neutral-800' 
                      : 'bg-neutral-900/80 hover:bg-neutral-900 text-neutral-300 hover:text-amber-400'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Mis Carpetas</span>
                </button>

                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Folder className="w-6 h-6 text-amber-500" />
                    <span>{selectedCollection.name}</span>
                  </h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                    selectedCollection.is_public_trade 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}>
                    {selectedCollection.is_public_trade ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    <span>{selectedCollection.is_public_trade ? 'Pública para Trade' : 'Privada'}</span>
                  </span>
                </div>

                <p className="text-xs text-neutral-400 max-w-xl font-mono">
                  {selectedCollection.description || 'Carpeta física de colección e inventario.'}
                </p>
              </div>

              {/* Métricas de la Carpeta */}
              <div className="flex items-center gap-4 text-xs font-mono relative z-10">
                <div className={`p-3.5 rounded-xl border text-center ${
                  isLightMode ? 'bg-[#FAF7F2] border-[#E8E2D5]' : 'bg-neutral-950/80 border-neutral-800 backdrop-blur-md'
                }`}>
                  <span className="text-[10px] text-neutral-500 block font-semibold">TOTAL CARTAS</span>
                  <span className="text-xl font-black text-amber-500">{totalCardsCount}</span>
                </div>
                <div className={`p-3.5 rounded-xl border text-center ${
                  isLightMode ? 'bg-[#FAF7F2] border-[#E8E2D5]' : 'bg-neutral-950/80 border-neutral-800 backdrop-blur-md'
                }`}>
                  <span className="text-[10px] text-neutral-500 block font-semibold">VALOR ESTIMADO</span>
                  <span className="text-xl font-black text-emerald-400">${totalMarketValue.toFixed(2)} USD</span>
                </div>
              </div>
            </div>

            {/* Layout: Inspección Fija + Listado */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
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
                          <span className="text-neutral-500">En esta carpeta:</span>
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
                    <div className="py-16 text-center text-xs text-neutral-500 font-mono">
                      Pasa el cursor sobre una carta para inspeccionar sus características.
                    </div>
                  )}
                </div>
              </aside>

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
                      ? 'No hay cartas que coincidan con los filtros aplicados en esta carpeta.'
                      : 'Esta carpeta está vacía. Añade cartas desde el Catálogo.'}
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
          /* VISTA 2: BIBLIOTECA GENERAL CON BOTÓN GRANDE ESTILO DECKS     */
          /* ------------------------------------------------------------- */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Layers className="w-6 h-6 text-amber-500" />
                  <span>Mis Carpetas & Colecciones</span>
                </h1>
                <p className="text-neutral-400 text-xs mt-0.5 font-mono">
                  Organiza tus carpetas físicas, audita tus copias físicas y publica para el Muro de Trade.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchCollections()}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 border border-neutral-800 transition"
                  title="Refrescar carpetas"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingCollections ? (
              <div className="flex flex-col items-center justify-center py-24 text-neutral-500 text-xs font-mono gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span>Cargando tus carpetas...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                
                {/* BOTÓN GRANDE PRINCIPAL "CREAR NUEVA CARPETA" (ESTILO DECK LIBRARY) */}
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={collections.length >= 10}
                  className={`min-h-[220px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isLightMode 
                      ? 'border-[#D9D0BE] hover:border-amber-600 bg-white/50 hover:bg-white' 
                      : 'border-neutral-800 hover:border-amber-500 bg-neutral-900/30 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition duration-300 shadow-lg shadow-amber-500/5">
                    <Plus className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-sm font-bold text-white block group-hover:text-amber-400 transition">
                      Nueva Carpeta
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono block">
                      {collections.length} de 10 carpetas creadas
                    </span>
                  </div>
                </button>

                {/* TARJETAS DE CARPETAS EXISTENTES */}
                {collections.map((col) => (
                  <div
                    key={col.id}
                    onClick={() => handleSelectCollection(col)}
                    className={`min-h-[220px] rounded-2xl border cursor-pointer transition flex flex-col justify-between p-5 group relative overflow-hidden shadow-lg hover:scale-[1.01] ${
                      isLightMode 
                        ? 'bg-white border-[#E8E2D5] hover:border-amber-500/80 hover:bg-[#FAF7F2]' 
                        : 'bg-neutral-900/70 border-neutral-800 hover:border-amber-500/60'
                    }`}
                  >
                    {/* Arte Panorámico de Scryfall de Fondo */}
                    {col.art_url && (
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-3/5 bg-cover bg-center pointer-events-none opacity-25 group-hover:opacity-40 transition-opacity"
                        style={{
                          backgroundImage: `url(${col.art_url})`,
                          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)'
                        }}
                      />
                    )}

                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 bg-neutral-800/90 group-hover:bg-amber-500/20 rounded-xl text-neutral-300 group-hover:text-amber-400 transition border border-neutral-700/40">
                          <Folder className="w-5 h-5" />
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                          col.is_public_trade 
                            ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-400' 
                            : 'bg-neutral-950/80 border border-neutral-800 text-neutral-500'
                        }`}>
                          {col.is_public_trade ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                          <span>{col.is_public_trade ? 'Pública' : 'Privada'}</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="font-black text-base text-white group-hover:text-amber-400 transition truncate">
                          {col.name}
                        </h3>
                        <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                          {col.description || 'Sin notas descriptivas en la carpeta.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono relative z-10">
                      <span className="text-neutral-500">{col.card_count ?? 0} cartas</span>
                      <span className="text-amber-400 font-bold group-hover:translate-x-1 transition flex items-center gap-1">
                        <span>Abrir</span>
                        <span>&rarr;</span>
                      </span>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>
        )}

      </div>

      <CreateCollectionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateCollection}
        currentCount={collections.length}
      />
    </div>
  );
}
// ---------------------------------------------------------
// PÁGINA: ORQUESTADOR Y AUDITOR DE MAZOS CONTRA INVENTARIO (MTG)
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, Loader2, Sparkles, PlusCircle } from 'lucide-react';

import { 
  getMyDecksApi, 
  getDeckCardsWithStatusApi, 
  getPublicDeckDetailApi,
  forkDeckApi,
  updateDeckCardApi, 
  removeCardFromDeckApi 
} from '@/api/decks.api';

import AddCardInline from '@/components/decks/AddCardInline';
import BulkImportDeckModal from '@/components/decks/BulkImportDeckModal';
import OpeningHandSimulatorModal from '@/components/decks/OpeningHandSimulatorModal';
import CardShowcaseSidebar from '@/components/common/CardShowcaseSidebar';
import DeckHeaderBanner from '@/components/decks/DeckHeaderBanner';
import DeckAnalyticsSection from '@/components/decks/DeckAnalyticsSection';
import DeckLibraryPage from '@/pages/DeckLibraryPage';
import WorkspaceToolbar from '@/components/common/WorkspaceToolbar';
import GuestStateBanner from '@/components/common/GuestStateBanner';

import DeckTextView from '@/components/decks/workspace/DeckTextView';
import DeckGridView from '@/components/decks/workspace/DeckGridView';
import DeckLegalityAlert from '@/components/decks/workspace/DeckLegalityAlert';
import DeckStatusBarFooter from '@/components/decks/workspace/DeckStatusBarFooter';

import { useTheme } from '@/context/ThemeContext';
import { useCardModal } from '@/context/CardModalContext';
import { isAuthenticated } from '@/services/session.service';
import { 
  validateDeckLegality, 
  getCommanderColorIdentity, 
  canHaveUnlimitedCopies 
} from '@/utils/deckLegality';
import { resolveCardType, SECTIONS_CONFIG } from '@/utils/mtgTypeResolver';
import { useCardCollectionFilter } from '@/hooks/useCardCollectionFilter';
import { parseApiError } from '@/utils/apiErrors';

export default function DecksPage({ 
  currentUser, 
  onDeckCountChange, 
  refreshTrigger, 
  onOpenCreateDeckModal, 
  onNavigateToTradeWall,
  selectedDeckId,
  onSelectDeckId,
  onOpenAuthModal
}) {
  const { isLightMode } = useTheme();
  const { openCard } = useCardModal();
  const hasSession = isAuthenticated();

  const [decks, setDecks] = useState([]);
  const [internalDeckId, setInternalDeckId] = useState(null);
  const [externalDeck, setExternalDeck] = useState(null);
  
  const currentSelectedId = selectedDeckId !== undefined ? selectedDeckId : internalDeckId;
  const setDeckSelection = (id) => {
    if (onSelectDeckId) onSelectDeckId(id);
    else setInternalDeckId(id);
  };

  const [deckCards, setDeckCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [deckActionError, setDeckActionError] = useState(null);
  const [wishlistSuccessMsg, setWishlistSuccessMsg] = useState(null);

  // Estados visuales del Workspace
  const [viewMode, setViewMode] = useState('text');
  const [cardSize, setCardSize] = useState('md');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Filtros y ordenamiento delegados en el hook universal
  const {
    filterQuery,
    setFilterQuery,
    sortBy,
    setSortBy,
    activeZone,
    setActiveZone,
    statusFilter,
    setStatusFilter,
    filteredCards: visibleCards
  } = useCardCollectionFilter(deckCards, {
    enableZones: true,
    defaultZone: 'main',
    defaultSort: 'type'
  });

  // Guard para visitantes no autenticados
  if (!hasSession && !currentUser && !currentSelectedId) {
    return (
      <main className={`min-h-screen px-4 py-12 transition-colors duration-200 ${
        isLightMode ? 'bg-[#FAF7F2]' : 'bg-[#0B0B0B]'
      }`}>
        <GuestStateBanner
          title="Constructor y Gestor de Mazos"
          description="Crea, analiza y valida la legalidad de tus barajas de Commander y Construido enlazándolas automáticamente con tu colección física."
          icon={Shield}
          onOpenAuthModal={onOpenAuthModal}
        />
      </main>
    );
  }

  // 1. Cargar catálogo de mazos propios
  useEffect(() => {
    if (!currentUser && !hasSession) {
      setDecks([]);
      onDeckCountChange?.(0);
      return;
    }

    const ctrl = new AbortController();
    setIsLoadingDecks(true);

    getMyDecksApi({ signal: ctrl.signal })
      .then((data) => {
        const deckList = Array.isArray(data) ? data : [];
        setDecks(deckList);
        onDeckCountChange?.(deckList.length);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Mazos] Error al consultar mazos:', parseApiError(err));
        }
      })
      .finally(() => setIsLoadingDecks(false));

    return () => ctrl.abort();
  }, [currentUser, hasSession, refreshTrigger, onDeckCountChange]);

  // Identificar el mazo activo
  const activeDeck = useMemo(() => {
    if (!currentSelectedId) return null;
    const own = decks.find((d) => d.id === currentSelectedId);
    return own || externalDeck;
  }, [decks, externalDeck, currentSelectedId]);

  const isOwner = Boolean(
    activeDeck && 
    (!activeDeck.user_id || (currentUser?.id && String(currentUser.id) === String(activeDeck.user_id)))
  );

  // 2. Cargar cartas del mazo con auditoría de inventario
  const refreshCurrentDeckCards = useCallback(() => {
    if (!currentSelectedId) return;

    setIsLoadingCards(true);
    setDeckActionError(null);

    const isLocalDeck = decks.some((d) => d.id === currentSelectedId);

    if (isLocalDeck) {
      setExternalDeck(null);
      getDeckCardsWithStatusApi(currentSelectedId)
        .then((cards) => setDeckCards(Array.isArray(cards) ? cards : []))
        .catch((err) => {
          console.warn('[Mazos] Error auditando cartas del mazo:', parseApiError(err));
        })
        .finally(() => setIsLoadingCards(false));
    } else {
      getPublicDeckDetailApi(currentSelectedId)
        .then((detail) => {
          if (detail) {
            setExternalDeck(detail);
            setDeckCards(Array.isArray(detail.cards) ? detail.cards : []);
          }
        })
        .catch((err) => {
          console.warn('[Mazos] Error consultando mazo comunitario:', parseApiError(err));
          getDeckCardsWithStatusApi(currentSelectedId)
            .then((cards) => setDeckCards(Array.isArray(cards) ? cards : []))
            .catch(() => setDeckCards([]));
        })
        .finally(() => setIsLoadingCards(false));
    }
  }, [currentSelectedId, decks]);

  useEffect(() => {
    refreshCurrentDeckCards();
  }, [refreshCurrentDeckCards]);

  // 3. Clonar mazo (Fork)
  const handleForkDeck = async (deckId) => {
    setDeckActionError(null);
    try {
      const clonedDeck = await forkDeckApi(deckId);
      if (clonedDeck?.id) {
        setDecks((prev) => [clonedDeck, ...prev]);
        onDeckCountChange?.(decks.length + 1);
        setDeckSelection(clonedDeck.id);
      }
    } catch (err) {
      setDeckActionError(parseApiError(err, 'No fue posible clonar la baraja comunitaria.'));
    }
  };

  const isCommanderFormat = (activeDeck?.format || 'commander').trim().toLowerCase() === 'commander';
  const commanders = useMemo(() => deckCards.filter((c) => c.category === 'commander'), [deckCards]);
  const commanderIdentity = useMemo(() => getCommanderColorIdentity(commanders), [commanders]);
  const displayCard = hoveredCard || commanders[0] || deckCards[0];
  const legalityReport = useMemo(() => validateDeckLegality(deckCards, activeDeck?.format || 'commander'), [deckCards, activeDeck]);

  // Operaciones sobre cartas
  const handleUpdateQuantity = async (card, delta) => {
    if (!isOwner) return;
    setDeckActionError(null);
    const currentQty = card.quantity_needed || 1;
    const newQty = currentQty + delta;
    
    if (newQty <= 0) {
      handleRemoveCard(card.deck_card_id);
      return;
    }

    const cardName = card.card_catalog?.name || card.name || 'Esta carta';

    if (!canHaveUnlimitedCopies(cardName)) {
      if (isCommanderFormat && newQty > 1) {
        setDeckActionError(`En Commander solo se permite 1 copia de "${cardName}" (Regla Singleton 903.5b).`);
        return;
      }
      if (!isCommanderFormat && newQty > 4) {
        setDeckActionError(`En formato ${activeDeck?.format || 'construido'} el límite es de 4 copias para "${cardName}".`);
        return;
      }
    }

    try {
      await updateDeckCardApi(currentSelectedId, card.deck_card_id, { quantity: newQty });
      refreshCurrentDeckCards();
    } catch (err) {
      setDeckActionError(parseApiError(err, 'Error actualizando cantidad.'));
    }
  };

  const handleUpdateCategory = async (card, newCategory) => {
    if (!isOwner) return;
    setDeckActionError(null);
    try {
      await updateDeckCardApi(currentSelectedId, card.deck_card_id, { category: newCategory });
      refreshCurrentDeckCards();
    } catch (err) {
      setDeckActionError(parseApiError(err, 'Error cambiando zona de la carta.'));
    }
  };

  const handleRemoveCard = async (deckCardId) => {
    if (!isOwner) return;
    setDeckActionError(null);
    try {
      await removeCardFromDeckApi(currentSelectedId, deckCardId);
      refreshCurrentDeckCards();
    } catch (err) {
      setDeckActionError(parseApiError(err, 'Error eliminando carta del mazo.'));
    }
  };

  // Conectar con Wishlist de Trade: exportar faltantes
  const handleExportMissingToWishlist = () => {
    const missingCards = deckCards.filter((c) => c.status === 'FALTANTE');
    if (missingCards.length === 0) return;
    
    setWishlistSuccessMsg(`Se añadieron ${missingCards.length} cartas faltantes a tu Wishlist de Trade.`);
    setTimeout(() => setWishlistSuccessMsg(null), 4000);
    
    if (onNavigateToTradeWall) {
      setTimeout(() => onNavigateToTradeWall(), 1200);
    }
  };

  const zoneCounts = useMemo(() => ({
    main: deckCards.filter((c) => c.category === 'mainboard' || c.category === 'commander' || c.category === 'companion' || !c.category).reduce((a, c) => a + (c.quantity_needed || 1), 0),
    sideboard: deckCards.filter((c) => c.category === 'sideboard').reduce((a, c) => a + (c.quantity_needed || 1), 0),
    maybeboard: deckCards.filter((c) => c.category === 'maybeboard').reduce((a, c) => a + (c.quantity_needed || 1), 0)
  }), [deckCards]);

  const groupedCards = useMemo(() => {
    const groups = {};
    SECTIONS_CONFIG.forEach((s) => { 
      groups[s.key] = { label: s.label, icon: s.icon, cards: [], totalQty: 0 }; 
    });

    visibleCards.forEach((card) => {
      const typeKey = resolveCardType(card);
      const targetGroup = groups[typeKey] || groups.other;
      const qty = card.quantity_needed || 1;

      targetGroup.cards.push(card);
      targetGroup.totalQty += qty;
    });

    return groups;
  }, [visibleCards]);

  // Auditoría en vivo contra la colección
  const availableCount = deckCards.filter((c) => c.status === 'DISPONIBLE').length;
  const inOtherDeckCount = deckCards.filter((c) => c.status === 'EN_OTRO_MAZO').length;
  const missingCount = deckCards.filter((c) => c.status === 'FALTANTE').length;
  const readinessPct = deckCards.length > 0 ? Math.round((availableCount / deckCards.length) * 100) : 0;

  if (!currentSelectedId) {
    return (
      <DeckLibraryPage
        decks={decks}
        onSelectDeck={(id) => setDeckSelection(id)}
        onOpenCreateDeckModal={onOpenCreateDeckModal}
        isLoading={isLoadingDecks}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      
      {/* 1. Header Banner */}
      {activeDeck && (
        <DeckHeaderBanner
          activeDeck={activeDeck}
          commanderCard={commanders[0]}
          commanders={commanders}
          totalCardsCount={zoneCounts.main}
          isLegal={legalityReport.isLegal}
          currentUserId={currentUser?.id}
          onBackToLibrary={() => { 
            setDeckSelection(null); 
            setExternalDeck(null);
            setStatusFilter(null); 
          }}
          onOpenPlaytest={() => setIsSimulatorOpen(true)}
          onOpenImport={() => setIsBulkModalOpen(true)}
          onNavigateToTradeWall={onNavigateToTradeWall}
          onForkDeck={handleForkDeck}
          onOpenAuthModal={onOpenAuthModal}
        />
      )}

      {/* 2. Área de Trabajo Principal */}
      <div className="w-full max-w-[1920px] mx-auto px-6 py-4 space-y-4 pb-24 font-sans">
        
        {/* Banner de Acción Rápida hacia Wishlist de Trade */}
        {missingCount > 0 && isOwner && (
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-rose-300 block">
                  Tienes {missingCount} cartas faltantes en tu colección física para completar este mazo.
                </span>
                <span className="text-[11px] text-neutral-400">
                  Transfiérelas a tu Wishlist para que el sistema de Matching de Trade encuentre jugadores cerca con esas cartas.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportMissingToWishlist}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-lg shadow-purple-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Añadir a Wishlist de Trade</span>
            </button>
          </div>
        )}

        {wishlistSuccessMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs flex items-center justify-between">
            <span>{wishlistSuccessMsg}</span>
            <button onClick={() => setWishlistSuccessMsg(null)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {activeDeck && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-1">
            
            {/* Panel de Inspección Fija con Auditoría de Inventario y Callback de Recarga */}
            <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4 self-start">
              <CardShowcaseSidebar
                displayCard={displayCard}
                commanders={commanders}
                onSelectHoveredCard={setHoveredCard}
                onNavigateToTradeWall={onNavigateToTradeWall}
                readinessPct={readinessPct}
                availableCount={availableCount}
                inOtherDeckCount={inOtherDeckCount}
                missingCount={missingCount}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onCardObtained={refreshCurrentDeckCards}
                isLightMode={isLightMode}
              />
            </div>

            {/* Toolbar + Vistas */}
            <main className="lg:col-span-8 xl:col-span-9 space-y-4 min-w-0">
              <WorkspaceToolbar
                zonesConfig={{
                  activeZone,
                  onChangeZone: (zone) => { setActiveZone(zone); setStatusFilter(null); },
                  counts: zoneCounts
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
                  { value: 'type', label: 'Por Tipo' },
                  { value: 'cmc', label: 'Por Coste (CMC)' },
                  { value: 'name', label: 'Por Nombre' },
                  { value: 'price', label: 'Por Precio' }
                ]}
                isLightMode={isLightMode}
              />

              {deckActionError && (
                <div className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                  <span>{deckActionError}</span>
                  <button onClick={() => setDeckActionError(null)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
                </div>
              )}

              {isOwner && (
                <AddCardInline 
                  deckId={activeDeck.id} 
                  onCardAdded={refreshCurrentDeckCards} 
                  isLightMode={isLightMode} 
                />
              )}

              <DeckLegalityAlert
                legalityReport={legalityReport}
                format={activeDeck.format}
                isLightMode={isLightMode}
              />

              {isLoadingCards ? (
                <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Auditando disponibilidad contra tu colección...</span>
                </div>
              ) : visibleCards.length === 0 ? (
                <div className={`py-16 text-center text-xs rounded-xl ${
                  isLightMode ? 'bg-[#EAE4D7] text-neutral-600' : 'bg-neutral-900/40 text-neutral-500'
                }`}>
                  {statusFilter || filterQuery
                    ? 'No se encontraron cartas que coincidan con los filtros aplicados.'
                    : 'No hay cartas registradas en esta sección.'}
                </div>
              ) : viewMode === 'text' ? (
                <DeckTextView
                  groupedCards={groupedCards}
                  hoveredCard={hoveredCard}
                  commanders={commanders}
                  commanderIdentity={commanderIdentity}
                  isCommanderFormat={isCommanderFormat}
                  isOwner={isOwner}
                  isLightMode={isLightMode}
                  onHoverCard={setHoveredCard}
                  onOpenCard={openCard}
                  onUpdateCategory={handleUpdateCategory}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveCard={handleRemoveCard}
                />
              ) : (
                <DeckGridView
                  groupedCards={groupedCards}
                  cardSize={cardSize}
                  hoveredCard={hoveredCard}
                  isOwner={isOwner}
                  isLightMode={isLightMode}
                  onHoverCard={setHoveredCard}
                  onOpenCard={openCard}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveCard={handleRemoveCard}
                />
              )}
            </main>
          </div>
        )}

        {/* 3. Sección de Analíticas */}
        {activeDeck && <DeckAnalyticsSection cards={deckCards} isLightMode={isLightMode} />}
      </div>

      {/* 4. Barra de Estado Inferior */}
      <DeckStatusBarFooter
        mainboardCount={zoneCounts.main}
        isLegal={legalityReport.isLegal}
        format={activeDeck?.format}
        isLightMode={isLightMode}
      />

      {/* 5. Modales Auxiliares */}
      {activeDeck && isOwner && (
        <BulkImportDeckModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          deckId={activeDeck.id}
          onImportSuccess={refreshCurrentDeckCards}
        />
      )}

      {activeDeck && (
        <OpeningHandSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          cards={deckCards}
          deckName={activeDeck.name}
        />
      )}

    </div>
  );
}
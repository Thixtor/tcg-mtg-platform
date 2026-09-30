// ---------------------------------------------------------
// PÁGINA: ORQUESTADOR Y EDITOR DE MAZOS (CON SOPORTE PÚBLICO Y FORK)
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Plus,
  Shield,
  Loader2
} from 'lucide-react';

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
import ManaCostSymbols from '@/components/common/ManaCostSymbols';
import WorkspaceToolbar from '@/components/common/WorkspaceToolbar';
import CardGridItem from '@/components/common/CardGridItem';
import GuestStateBanner from '@/components/common/GuestStateBanner';

import { useTheme } from '@/context/ThemeContext';
import { useCardModal } from '@/context/CardModalContext';
import { isAuthenticated } from '@/services/session.service';
import { 
  validateDeckLegality, 
  getCommanderColorIdentity, 
  isCardColorIdentityLegal, 
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

  // Estados visuales del Workspace
  const [viewMode, setViewMode] = useState('text');
  const [cardSize, setCardSize] = useState('md');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // 1. Delegación de filtrado y ordenamiento en el custom hook universal
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

  // Guard para visitantes no autenticados en vista de biblioteca propia
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

  // 2. Cargar catálogo de mazos propios
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

  // Identificar el mazo activo (propio o foráneo)
  const activeDeck = useMemo(() => {
    if (!currentSelectedId) return null;
    const own = decks.find((d) => d.id === currentSelectedId);
    return own || externalDeck;
  }, [decks, externalDeck, currentSelectedId]);

  const isOwner = Boolean(
    activeDeck && 
    (!activeDeck.user_id || (currentUser?.id && String(currentUser.id) === String(activeDeck.user_id)))
  );

  // 3. Cargar cartas y metadatos del mazo activo
  const refreshCurrentDeckCards = useCallback(() => {
    if (!currentSelectedId) return;

    setIsLoadingCards(true);
    setDeckActionError(null);

    // Si es un mazo propio, auditar contra binders
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
      // Si es un mazo externo (abierto desde un perfil público)
      getPublicDeckDetailApi(currentSelectedId)
        .then((detail) => {
          if (detail) {
            setExternalDeck(detail);
            setDeckCards(Array.isArray(detail.cards) ? detail.cards : []);
          }
        })
        .catch((err) => {
          console.warn('[Mazos] Error consultando mazo comunitario:', parseApiError(err));
          // Fallback al endpoint de cartas estándar si aplica
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

  // 4. Acción de Clonación (Fork de Mazo)
  const handleForkDeck = async (deckId) => {
    setDeckActionError(null);
    try {
      const clonedDeck = await forkDeckApi(deckId);
      if (clonedDeck?.id) {
        // Actualizar lista local de mazos
        setDecks((prev) => [clonedDeck, ...prev]);
        onDeckCountChange?.(decks.length + 1);
        // Abrir inmediatamente la copia propia del usuario
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

  // Modificación de copias (solo permitido para el dueño)
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
      
      {/* 1. BANNER CON RETORNO, PRIVACIDAD Y CLONACIÓN */}
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

      {/* 2. ÁREA DE TRABAJO PRINCIPAL */}
      <div className="w-full max-w-[1920px] mx-auto px-6 py-4 space-y-4 pb-24 font-sans">
        {activeDeck && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-1">
            
            {/* PANEL IZQUIERDO: INSPECCIÓN DE CARTA FIJA */}
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
                isLightMode={isLightMode}
              />
            </div>

            {/* PANEL DERECHO: TOOLBAR MODULAR + LISTADO */}
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
                  <button onClick={() => setDeckActionError(null)} className="text-neutral-400 hover:text-white">✕</button>
                </div>
              )}

              {/* Formulario de adición rápida (solo disponible para el dueño) */}
              {isOwner && (
                <AddCardInline 
                  deckId={activeDeck.id} 
                  onCardAdded={refreshCurrentDeckCards} 
                  isLightMode={isLightMode} 
                />
              )}

              {!legalityReport.isLegal && legalityReport.errors.length > 0 && (
                <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  isLightMode 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Infracciones de Legalidad ({activeDeck.format}):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 opacity-90 text-[11px]">
                    {legalityReport.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isLoadingCards ? (
                <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Cargando cartas de la baraja...</span>
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
                
                /* VISTA TEXTO DESENCAPSULADA A COLUMNAS CON JERARQUÍA OFICIAL */
                <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6 [column-fill:_balance]">
                  {SECTIONS_CONFIG.map(({ key, label, icon }) => {
                    const group = groupedCards[key];
                    if (!group || group.cards.length === 0) return null;

                    return (
                      <div key={key} className="break-inside-avoid mb-6">
                        <div className={`flex items-center justify-between pb-1.5 mb-2 font-mono border-b ${
                          isLightMode ? 'border-[#E0D8C8] text-[#1F1C19]' : 'border-neutral-800 text-neutral-200'
                        }`}>
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <span>{icon}</span>
                            <span>{label}</span>
                            <span className="opacity-70 font-semibold">({group.totalQty})</span>
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          {group.cards.map((card) => {
                            const isColorLegal = !isCommanderFormat || commanders.length === 0 || isCardColorIdentityLegal(card, commanderIdentity);
                            const manaCost = card.mana_cost || card.manaCost || '';

                            return (
                              <div
                                key={card.deck_card_id || card.id}
                                onMouseEnter={() => setHoveredCard(card)}
                                onClick={() => openCard(card.card_catalog || card)}
                                className={`py-1 px-2 rounded-lg flex items-center justify-between gap-1.5 transition group cursor-pointer ${
                                  hoveredCard?.deck_card_id === card.deck_card_id
                                    ? (isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-800/80')
                                    : (isLightMode ? 'hover:bg-[#F2EDE2]' : 'hover:bg-neutral-900/60')
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-mono text-xs font-bold text-amber-500 w-4 shrink-0 text-left">
                                    {card.quantity_needed || card.quantity || 1}
                                  </span>

                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      card.status === 'DISPONIBLE'
                                        ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]'
                                        : card.status === 'EN_OTRO_MAZO'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    title={card.status || 'Estado'}
                                  />

                                  <span className={`truncate text-sm font-medium transition ${
                                    isLightMode ? 'text-[#1F1C19] group-hover:text-amber-700' : 'text-neutral-100 group-hover:text-amber-400'
                                  }`}>
                                    {card.name}
                                  </span>

                                  {!isColorLegal && (
                                    <span title="Fuera de la identidad de color del Comandante">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <ManaCostSymbols manaCost={manaCost} />

                                  {/* Acciones de edición (solo si es el propietario) */}
                                  {isOwner && (
                                    <div 
                                      className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <select
                                        value={card.category}
                                        onChange={(e) => handleUpdateCategory(card, e.target.value)}
                                        className={`text-[10px] rounded px-1 py-0.5 outline-none cursor-pointer ${
                                          isLightMode
                                            ? 'bg-white text-neutral-800 hover:border-amber-500'
                                            : 'bg-neutral-950 text-neutral-200 hover:border-amber-500'
                                        }`}
                                      >
                                        <option value="mainboard">Main</option>
                                        <option value="commander">👑 Cmd</option>
                                        <option value="companion">🧭 Comp</option>
                                        <option value="sideboard">Side</option>
                                        <option value="maybeboard">Maybe</option>
                                      </select>

                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }} 
                                        className="p-0.5 text-neutral-400 hover:text-amber-500" 
                                        title="Añadir copia"
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleRemoveCard(card.deck_card_id); }} 
                                        className="p-0.5 text-neutral-400 hover:text-rose-500" 
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

              ) : (

                /* VISTA GRID VISUAL REUTILIZANDO CardGridItem */
                <div className="space-y-6">
                  {SECTIONS_CONFIG.map(({ key, label, icon }) => {
                    const group = groupedCards[key];
                    if (!group || group.cards.length === 0) return null;

                    return (
                      <div key={key} className="space-y-2">
                        <div className={`flex items-center justify-between pb-1 text-xs font-mono uppercase tracking-wider border-b ${
                          isLightMode ? 'border-[#E0D8C8] text-neutral-700' : 'border-neutral-800 text-neutral-300'
                        }`}>
                          <span className="font-bold flex items-center gap-1.5">
                            <span>{icon}</span>
                            <span>{label}</span>
                          </span>
                          <span className="text-amber-500 font-bold">{group.totalQty} cartas</span>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {group.cards.map((card) => (
                            <CardGridItem
                              key={card.deck_card_id || card.id}
                              card={card}
                              cardSize={cardSize}
                              isSelected={hoveredCard?.deck_card_id === card.deck_card_id}
                              isLightMode={isLightMode}
                              onHover={setHoveredCard}
                              onClick={() => openCard(card.card_catalog || card)}
                              onIncrement={isOwner ? () => handleUpdateQuantity(card, 1) : undefined}
                              onRemove={isOwner ? () => handleRemoveCard(card.deck_card_id) : undefined}
                              badgeTopLeft={card.category === 'commander' ? '👑 CMD' : card.status}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}

            </main>
          </div>
        )}

        {/* 3. SECCIÓN INFERIOR DE ESTADÍSTICAS */}
        {activeDeck && <DeckAnalyticsSection cards={deckCards} isLightMode={isLightMode} />}
      </div>

      {/* 4. FOOTER CUMPLIENDO POLÍTICA SCRYFALL / WOTC[cite: 14, 15] */}
      <footer className={`fixed bottom-0 left-0 right-0 z-40 px-6 py-2 flex items-center justify-between text-xs font-mono backdrop-blur-md ${
        isLightMode ? 'bg-[#FAF7F2]/95 text-neutral-700 border-t border-[#E0D8C8]' : 'bg-[#0B0B0B]/95 text-neutral-400 border-t border-neutral-900'
      }`}>
        <div className="flex items-center gap-4">
          <span className={`font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>{zoneCounts.main} Cartas en Baraja</span>
          <span>·</span>
          <span className={legalityReport.isLegal ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
            {legalityReport.isLegal ? 'Mazo Legal' : 'Revisar Legalidad'}
          </span>
          <span>·</span>
          <span>{activeDeck?.format}</span>
        </div>

        <div className="text-[11px] opacity-60 hidden sm:block">
          Portions © Wizards of the Coast LLC · Scryfall compliant[cite: 14, 15]
        </div>
      </footer>

      {/* 5. MODALES AUXILIARES (SOLO PROPIETARIO) */}
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
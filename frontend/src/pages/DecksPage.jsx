// ---------------------------------------------------------
// PÁGINA: ORQUESTADOR Y EDITOR DE MAZOS (CON MODAL DE CARTA)
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Crown, 
  AlertTriangle, 
  X, 
  ExternalLink, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

import { 
  getMyDecksApi, 
  getDeckCardsWithStatusApi, 
  updateDeckCardApi, 
  removeCardFromDeckApi 
} from '@/api/decks.api';

import AddCardInline from '@/components/decks/AddCardInline';
import BulkImportDeckModal from '@/components/decks/BulkImportDeckModal';
import OpeningHandSimulatorModal from '@/components/decks/OpeningHandSimulatorModal';
import DeckToolbar from '@/components/decks/DeckToolbar';
import CardShowcaseSidebar from '@/components/common/CardShowcaseSidebar';
import DeckHeaderBanner from '@/components/decks/DeckHeaderBanner';
import DeckAnalyticsSection from '@/components/decks/DeckAnalyticsSection';
import DeckLibraryPage from '@/pages/DeckLibraryPage';
import ManaCostSymbols from '@/components/common/ManaCostSymbols';

import { useTheme } from '@/context/ThemeContext';
import { 
  validateDeckLegality, 
  getCommanderColorIdentity, 
  isCardColorIdentityLegal, 
  canHaveMultipleCopies 
} from '@/utils/deckLegality';
import { resolveCardType, SECTIONS_CONFIG } from '@/utils/mtgTypeResolver';

// Modal flotante para inspección detallada de una carta
function CardDetailsModal({ card, isOpen, onClose, isLightMode }) {
  if (!isOpen || !card) return null;

  const imageUrl = card.image_url || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
  const oracleText = card.oracle_text || card.card_faces?.[0]?.oracle_text || 'Sin texto de reglas disponible.';
  const typeLine = card.type_line || card.type || 'Tipo desconocido';
  const priceUsd = card.prices?.usd ? `$${card.prices.usd}` : (card.price_usd ? `$${card.price_usd}` : 'N/A');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border transition-colors ${
          isLightMode 
            ? 'bg-[#FAF7F2] border-[#E8E2D5] text-[#24211E]' 
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 p-1.5 rounded-full z-10 transition ${
            isLightMode 
              ? 'bg-[#EAE4D7] text-neutral-700 hover:bg-[#DDD5C5]' 
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lado Izquierdo: Imagen de la Carta */}
        <div className="w-full md:w-1/2 p-6 flex items-center justify-center bg-black/20">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={card.name} 
              className="w-full max-w-[260px] rounded-xl shadow-xl transition-transform hover:scale-105"
            />
          ) : (
            <div className="w-48 h-64 border border-dashed rounded-xl flex items-center justify-center text-xs text-neutral-500 text-center p-4">
              Imagen no disponible
            </div>
          )}
        </div>

        {/* Lado Derecho: Metadatos y Reglas */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2 pr-6">
              <h2 className="text-xl font-black uppercase tracking-tight leading-tight">
                {card.name}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <ManaCostSymbols manaCost={card.mana_cost || card.manaCost || ''} />
              <span className="text-xs font-mono opacity-70">
                (CMC: {card.cmc ?? card.mana_value ?? 0})
              </span>
            </div>

            <p className={`text-xs font-mono font-bold pb-2 border-b ${
              isLightMode ? 'border-[#EAE4D7] text-neutral-600' : 'border-neutral-800 text-neutral-400'
            }`}>
              {typeLine}
            </p>

            {/* Texto de Reglas Oracle */}
            <div className={`p-3 rounded-xl text-xs leading-relaxed max-h-40 overflow-y-auto font-sans whitespace-pre-wrap ${
              isLightMode ? 'bg-[#EAE4D7]/60' : 'bg-neutral-950/60'
            }`}>
              {oracleText}
            </div>
          </div>

          {/* Información de Inventario y Precios */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/40">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="opacity-70">Estado Físico:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                card.status === 'DISPONIBLE'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : card.status === 'EN_OTRO_MAZO'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                {card.status || 'DESCONOCIDO'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="opacity-70">Precio Mercado (USD):</span>
              <span className="font-bold text-emerald-500 flex items-center gap-0.5">
                {priceUsd}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <span className="opacity-70">Cantidad en este mazo:</span>
              <span className="font-bold text-amber-500">
                {card.quantity_needed || 1}x
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DecksPage({ 
  currentUser, 
  onDeckCountChange, 
  refreshTrigger, 
  onOpenCreateDeckModal, 
  onNavigateToTradeWall,
  selectedDeckId,
  onSelectDeckId
}) {
  const { isLightMode } = useTheme();

  const [decks, setDecks] = useState([]);
  const [internalDeckId, setInternalDeckId] = useState(null);
  
  const currentSelectedId = selectedDeckId !== undefined ? selectedDeckId : internalDeckId;
  const setDeckSelection = (id) => {
    if (onSelectDeckId) onSelectDeckId(id);
    else setInternalDeckId(id);
  };

  const [deckCards, setDeckCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCardForModal, setSelectedCardForModal] = useState(null);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Estados visuales y de filtrado dentro del mazo
  const [currentTab, setCurrentTab] = useState('main');
  const [viewMode, setViewMode] = useState('text');
  const [cardSize, setCardSize] = useState('md');
  const [statusFilter, setStatusFilter] = useState(null);
  const [inDeckFilter, setInDeckFilter] = useState('');
  const [sortBy, setSortBy] = useState('type');

  // Modales
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // 1. Cargar lista general de mazos
  useEffect(() => {
    if (!currentUser) {
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
          console.warn('[Mazos] Error al consultar mazos:', err);
        }
      })
      .finally(() => setIsLoadingDecks(false));

    return () => ctrl.abort();
  }, [currentUser, refreshTrigger, onDeckCountChange]);

  // 2. Cargar cartas del mazo seleccionado
  const refreshCurrentDeckCards = useCallback(() => {
    if (!currentSelectedId) return;

    setIsLoadingCards(true);
    getDeckCardsWithStatusApi(currentSelectedId)
      .then((cards) => setDeckCards(Array.isArray(cards) ? cards : []))
      .catch((err) => console.warn('[Mazos] Error auditando cartas del mazo:', err))
      .finally(() => setIsLoadingCards(false));
  }, [currentSelectedId]);

  useEffect(() => {
    refreshCurrentDeckCards();
  }, [refreshCurrentDeckCards]);

  const activeDeck = decks.find((d) => d.id === currentSelectedId);
  const commanders = useMemo(() => deckCards.filter((c) => c.category === 'commander'), [deckCards]);
  const commanderIdentity = useMemo(() => getCommanderColorIdentity(commanders), [commanders]);
  const displayCard = hoveredCard || commanders[0] || deckCards[0];
  const legalityReport = useMemo(() => validateDeckLegality(deckCards, activeDeck?.format || 'Commander'), [deckCards, activeDeck]);

  const handleUpdateQuantity = async (card, delta) => {
    const currentQty = card.quantity_needed || 1;
    const newQty = currentQty + delta;
    
    if (newQty <= 0) {
      handleRemoveCard(card.deck_card_id);
      return;
    }

    if (newQty > 1 && !canHaveMultipleCopies(card.name)) {
      alert(`[Regla MTG 903.5b] El formato Commander permite un máximo de 1 copia para "${card.name}".`);
      return;
    }

    try {
      await updateDeckCardApi(currentSelectedId, card.deck_card_id, { quantity: newQty });
      refreshCurrentDeckCards();
    } catch (err) {
      console.warn('[Mazos] Error actualizando cantidad:', err);
    }
  };

  const handleUpdateCategory = async (card, newCategory) => {
    try {
      await updateDeckCardApi(currentSelectedId, card.deck_card_id, { category: newCategory });
      refreshCurrentDeckCards();
    } catch (err) {
      console.warn('[Mazos] Error cambiando zona:', err);
    }
  };

  const handleRemoveCard = async (deckCardId) => {
    try {
      await removeCardFromDeckApi(currentSelectedId, deckCardId);
      refreshCurrentDeckCards();
    } catch (err) {
      console.warn('[Mazos] Error eliminando carta:', err);
    }
  };

  const zoneCounts = useMemo(() => ({
    main: deckCards.filter((c) => c.category === 'mainboard' || c.category === 'commander' || c.category === 'companion').reduce((a, c) => a + (c.quantity_needed || 1), 0),
    sideboard: deckCards.filter((c) => c.category === 'sideboard').reduce((a, c) => a + (c.quantity_needed || 1), 0),
    maybeboard: deckCards.filter((c) => c.category === 'maybeboard').reduce((a, c) => a + (c.quantity_needed || 1), 0)
  }), [deckCards]);

  // FILTRADO INTELIGENTE: POR NOMBRE, TIPO, SÍMBOLOS Y COSTE DE MANÁ (CMC)
  const visibleCards = useMemo(() => {
    let pool = currentTab === 'main'
      ? deckCards.filter((c) => c.category === 'mainboard' || c.category === 'commander' || c.category === 'companion')
      : deckCards.filter((c) => c.category === currentTab);

    if (statusFilter) {
      pool = pool.filter((c) => c.status === statusFilter);
    }

    if (inDeckFilter.trim()) {
      const rawQuery = inDeckFilter.trim().toLowerCase();
      const normalizedQuery = rawQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const cmcMatch = rawQuery.match(/^(?:cmc|mv|coste|cost)\s*([><=:]+)?\s*(\d+)$/i);

      pool = pool.filter((c) => {
        const cardCmc = c.cmc !== undefined ? Number(c.cmc) : (c.mana_value !== undefined ? Number(c.mana_value) : 0);
        
        if (cmcMatch) {
          const operator = cmcMatch[1] || ':';
          const targetValue = Number(cmcMatch[2]);

          if (operator === '>') return cardCmc > targetValue;
          if (operator === '>=') return cardCmc >= targetValue;
          if (operator === '<') return cardCmc < targetValue;
          if (operator === '<=') return cardCmc <= targetValue;
          return cardCmc === targetValue;
        }

        const isNumericOnly = !isNaN(Number(rawQuery));
        if (isNumericOnly && cardCmc === Number(rawQuery)) {
          return true;
        }

        const name = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const typeLine = (c.type_line || c.type || c.card_type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const resolvedType = resolveCardType(c);
        const section = SECTIONS_CONFIG.find((s) => s.key === resolvedType);
        const label = (section?.label || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mana = (c.mana_cost || c.manaCost || '').toLowerCase();

        return (
          name.includes(normalizedQuery) || 
          typeLine.includes(normalizedQuery) || 
          label.includes(normalizedQuery) || 
          mana.includes(normalizedQuery)
        );
      });
    }

    return pool.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'cmc') return (a.cmc ?? 0) - (b.cmc ?? 0);
      if (sortBy === 'price') return (b.prices?.usd ?? 0) - (a.prices?.usd ?? 0);
      return 0;
    });
  }, [deckCards, currentTab, statusFilter, inDeckFilter, sortBy]);

  // AGRUPACIÓN JERÁRQUICA CANÓNICA CON TOTAL DE COPIAS
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

  const getGridCardClass = () => {
    switch (cardSize) {
      case 'sm': return 'w-24 sm:w-28';
      case 'lg': return 'w-44 sm:w-48';
      default: return 'w-32 sm:w-36';
    }
  };

  // Si no hay mazo seleccionado, mostramos la Biblioteca General
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

  // Vista de Workspace y Edición del Mazo
  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      
      {/* 1. BANNER CON RETORNO A LA BIBLIOTECA */}
      {activeDeck && (
        <DeckHeaderBanner
          activeDeck={activeDeck}
          commanderCard={commanders[0]}
          commanders={commanders}
          totalCardsCount={zoneCounts.main}
          isLegal={legalityReport.isLegal}
          onBackToLibrary={() => { setDeckSelection(null); setStatusFilter(null); }}
          onOpenPlaytest={() => setIsSimulatorOpen(true)}
          onOpenImport={() => setIsBulkModalOpen(true)}
          onNavigateToTradeWall={onNavigateToTradeWall}
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

            {/* PANEL DERECHO: TOOLBAR CONTEXTUAL + LISTADO */}
            <main className="lg:col-span-8 xl:col-span-9 space-y-4 min-w-0">
              
              <DeckToolbar
                currentTab={currentTab}
                onChangeTab={(tab) => { setCurrentTab(tab); setStatusFilter(null); }}
                zoneCounts={zoneCounts}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                cardSize={cardSize}
                onChangeCardSize={setCardSize}
                filterQuery={inDeckFilter}
                onFilterChange={setInDeckFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                isLightMode={isLightMode}
              />

              <AddCardInline 
                deckId={activeDeck.id} 
                onCardAdded={refreshCurrentDeckCards} 
                isLightMode={isLightMode} 
              />

              {!legalityReport.isLegal && legalityReport.errors.length > 0 && (
                <div className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                  isLightMode 
                    ? 'bg-amber-50 border-amber-300 text-amber-900' 
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Infracciones de Legalidad de Commander:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 opacity-90 text-[11px]">
                    {legalityReport.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isLoadingCards ? (
                <div className="py-24 text-center text-xs font-mono text-neutral-500">
                  Cargando cartas de la baraja...
                </div>
              ) : visibleCards.length === 0 ? (
                <div className={`py-16 text-center text-xs rounded-xl ${
                  isLightMode ? 'bg-[#EAE4D7] text-neutral-600' : 'bg-neutral-900/40 text-neutral-500'
                }`}>
                  {statusFilter || inDeckFilter
                    ? 'No se encontraron cartas que coincidan con los filtros aplicados.'
                    : 'No hay cartas registradas en esta sección.'}
                </div>
              ) : viewMode === 'text' ? (
                
                /* VISTA TEXTO DESENCAPSULADA A 4 COLUMNAS CON JERARQUÍA OFICIAL */
                <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6 [column-fill:_balance]">
                  {SECTIONS_CONFIG.map(({ key, label, icon }) => {
                    const group = groupedCards[key];
                    if (!group || group.cards.length === 0) return null;

                    return (
                      <div key={key} className="break-inside-avoid mb-6">
                        
                        {/* Cabecera de la sección con ícono y conteo total */}
                        <div className={`flex items-center justify-between pb-1.5 mb-2 font-mono border-b ${
                          isLightMode ? 'border-[#E0D8C8] text-[#1F1C19]' : 'border-neutral-800 text-neutral-200'
                        }`}>
                          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <span>{icon}</span>
                            <span>{label}</span>
                            <span className="opacity-70 font-semibold">({group.totalQty})</span>
                          </span>
                        </div>

                        {/* Listado de Cartas dentro de la sección */}
                        <div className="space-y-0.5">
                          {group.cards.map((card) => {
                            const isColorLegal = commanders.length === 0 || isCardColorIdentityLegal(card, commanderIdentity);
                            const manaCost = card.mana_cost || card.manaCost || '';

                            return (
                              <div
                                key={card.deck_card_id}
                                onMouseEnter={() => setHoveredCard(card)}
                                onClick={() => setSelectedCardForModal(card)}
                                className={`py-1 px-2 rounded-lg flex items-center justify-between gap-1.5 transition group cursor-pointer ${
                                  hoveredCard?.deck_card_id === card.deck_card_id
                                    ? (isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-800/80')
                                    : (isLightMode ? 'hover:bg-[#F2EDE2]' : 'hover:bg-neutral-900/60')
                                }`}
                              >
                                {/* Izquierda: Cantidad + Punto de Estado + Nombre */}
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-mono text-xs font-bold text-amber-500 w-4 shrink-0 text-left">
                                    {card.quantity_needed || 1}
                                  </span>

                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      card.status === 'DISPONIBLE'
                                        ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]'
                                        : card.status === 'EN_OTRO_MAZO'
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    title={card.status}
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

                                {/* Derecha: Símbolos de Maná + Controles de Hover */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <ManaCostSymbols manaCost={manaCost} />

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

                /* VISTA GRID VISUAL */
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
                            <div
                              key={card.deck_card_id}
                              onMouseEnter={() => setHoveredCard(card)}
                              onClick={() => setSelectedCardForModal(card)}
                              className={`group relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-500 transition-all ${
                                isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-900'
                              } ${getGridCardClass()}`}
                            >
                              <div className="aspect-[2.5/3.5] w-full relative">
                                {card.image_url ? (
                                  <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-neutral-500">
                                    {card.name}
                                  </div>
                                )}
                                <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-neutral-950/80 text-[10px] font-mono font-bold text-white">
                                  {card.quantity_needed}x
                                </span>

                                <div 
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button onClick={() => handleUpdateQuantity(card, 1)} className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white" title="Aumentar">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleRemoveCard(card.deck_card_id)} className="p-1 rounded bg-neutral-800 hover:bg-rose-900 text-rose-300" title="Eliminar">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className={`p-1.5 ${isLightMode ? 'bg-[#FAF7F2]' : 'bg-neutral-950'}`}>
                                <p className={`text-xs font-semibold truncate ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>{card.name}</p>
                              </div>
                            </div>
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

      {/* 4. FOOTER */}
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
          Portions © Wizards of the Coast LLC · Scryfall compliant[cite: 11]
        </div>
      </footer>

      {/* 5. MODALES */}
      <CardDetailsModal 
        card={selectedCardForModal}
        isOpen={Boolean(selectedCardForModal)}
        onClose={() => setSelectedCardForModal(null)}
        isLightMode={isLightMode}
      />

      {activeDeck && (
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
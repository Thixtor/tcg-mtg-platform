// ---------------------------------------------------------
// PÁGINA: CONSTRUCTOR Y AUDITOR DE MAZOS (DECKBUILDER)
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Flame,
  Shield,
  Coins,
  FileText,
  Trash2,
  Minus,
  Crown,
  Dices,
  ChevronDown,
  Sparkles,
  LayoutGrid,
  List,
  Filter,
  DollarSign,
  X,
  Briefcase,
  HelpCircle,
  Compass
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
import ManaAnalysisDrawer from '@/components/decks/ManaAnalysisDrawer';
import { validateDeckLegality } from '@/utils/deckLegality';

// Heurística de respaldo por nombres cuando type_line no esté en caché local
const KNOWN_TYPE_HINTS = {
  lands: ['plains', 'island', 'swamp', 'mountain', 'forest', 'tower', 'barrens', 'cove', 'passage', 'orchard', 'vista', 'exotic', 'shrine', 'valley', 'village'],
  artifacts: ['signet', 'sol ring', 'talisman', 'sword', 'boots', 'greaves', 'helm', 'plate', 'axe', 'glove', 'weapon', 'materia', 'arm'],
  sorceries: ['command', 'cultivate', 'lore', 'growth', 'business', 'vandalblast', 'horde', 'wrath', 'demonic', 'tutor'],
  instants: ['warp', 'concealment', 'break', 'dispatch', 'intervention', 'counterspell', 'swords to', 'path to', 'bolt', 'charm', 'opt']
};

const resolveCardType = (card) => {
  const t = (card.type_line || '').toLowerCase();
  const n = (card.name || '').toLowerCase();

  if (card.category === 'commander') return 'commander';
  if (card.category === 'companion') return 'companion';

  if (t.includes('creature') || t.includes('criatura')) return 'creature';
  if (t.includes('sorcery') || t.includes('conjuro')) return 'sorcery';
  if (t.includes('instant') || t.includes('instantáneo')) return 'instant';
  if (t.includes('artifact') || t.includes('artefacto')) return 'artifact';
  if (t.includes('enchantment') || t.includes('encantamiento')) return 'enchantment';
  if (t.includes('planeswalker')) return 'planeswalker';
  if (t.includes('land') || t.includes('tierra')) return 'land';
  if (t.includes('battle') || t.includes('batalla')) return 'battle';

  if (KNOWN_TYPE_HINTS.lands.some((k) => n.includes(k))) return 'land';
  if (KNOWN_TYPE_HINTS.artifacts.some((k) => n.includes(k))) return 'artifact';
  if (KNOWN_TYPE_HINTS.sorceries.some((k) => n.includes(k))) return 'sorcery';
  if (KNOWN_TYPE_HINTS.instants.some((k) => n.includes(k))) return 'instant';

  if (n.includes(',') || n.includes('the ') || n.includes('last ') || n.includes('leader')) return 'creature';

  return 'other';
};

const SECTIONS_CONFIG = [
  { key: 'commander', label: 'Comandante' },
  { key: 'companion', label: 'Companion' },
  { key: 'creature', label: 'Criaturas' },
  { key: 'sorcery', label: 'Conjuros' },
  { key: 'instant', label: 'Instantáneos' },
  { key: 'artifact', label: 'Artefactos' },
  { key: 'enchantment', label: 'Encantamientos' },
  { key: 'planeswalker', label: 'Planeswalkers' },
  { key: 'battle', label: 'Batallas' },
  { key: 'land', label: 'Tierras' },
  { key: 'other', label: 'Otros Hechizos' }
];

export default function DecksPage({ 
  currentUser, 
  onDeckCountChange, 
  refreshTrigger, 
  onOpenCreateDeckModal, 
  onNavigateToTradeWall 
}) {
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Estados visuales y zonas
  const [currentTab, setCurrentTab] = useState('main'); // 'main' | 'sideboard' | 'maybeboard'
  const [viewMode, setViewMode] = useState('text'); // 'text' | 'grid'
  const [cardSize, setCardSize] = useState('md'); // 'sm' | 'md' | 'lg'
  const [statusFilter, setStatusFilter] = useState(null);

  // Modales
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // 1. Cargar mazos
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
        if (deckList.length > 0 && !selectedDeckId) {
          setSelectedDeckId(deckList[0].id);
        }
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[Mazos] Error cargando lista:', err);
        }
      })
      .finally(() => setIsLoadingDecks(false));

    return () => ctrl.abort();
  }, [currentUser, refreshTrigger, onDeckCountChange]);

  // 2. Cargar cartas
  const refreshCurrentDeckCards = useCallback(() => {
    if (!selectedDeckId) return;

    setIsLoadingCards(true);
    getDeckCardsWithStatusApi(selectedDeckId)
      .then((cards) => setDeckCards(Array.isArray(cards) ? cards : []))
      .catch((err) => console.warn('[Mazos] Error auditando cartas:', err))
      .finally(() => setIsLoadingCards(false));
  }, [selectedDeckId]);

  useEffect(() => {
    refreshCurrentDeckCards();
  }, [refreshCurrentDeckCards]);

  const handleUpdateQuantity = async (card, delta) => {
    const newQty = card.quantity_needed + delta;
    if (newQty <= 0) {
      handleRemoveCard(card.deck_card_id);
      return;
    }

    try {
      await updateDeckCardApi(selectedDeckId, card.deck_card_id, { quantity: newQty });
      refreshCurrentDeckCards();
    } catch (err) {
      console.warn('[Mazos] Error actualizando cantidad:', err);
    }
  };

  const handleUpdateCategory = async (card, newCategory) => {
    try {
      await updateDeckCardApi(selectedDeckId, card.deck_card_id, { category: newCategory });
      refreshCurrentDeckCards();
    } catch (err) {
      console.warn('[Mazos] Error cambiando zona de carta:', err);
    }
  };

  const handleRemoveCard = async (deckCardId) => {
    try {
      await removeCardFromDeckApi(selectedDeckId, deckCardId);
      refreshCurrentDeckCards();
    } catch (err) {
      console.warn('[Mazos] Error eliminando carta:', err);
    }
  };

  const activeDeck = decks.find((d) => d.id === selectedDeckId) || decks[0];

  const commanders = useMemo(() => {
    return deckCards.filter((c) => c.category === 'commander');
  }, [deckCards]);

  const companion = useMemo(() => {
    return deckCards.find((c) => c.category === 'companion');
  }, [deckCards]);

  const displayCard = hoveredCard || commanders[0] || deckCards[0];

  const legalityReport = useMemo(() => {
    return validateDeckLegality(deckCards, activeDeck?.format || 'Commander');
  }, [deckCards, activeDeck]);

  // Conteos de cartas por zona
  const zoneCounts = useMemo(() => {
    const mainCards = deckCards.filter((c) => c.category === 'mainboard' || c.category === 'commander' || c.category === 'companion');
    const sideCards = deckCards.filter((c) => c.category === 'sideboard');
    const maybeCards = deckCards.filter((c) => c.category === 'maybeboard');

    return {
      main: mainCards.reduce((a, c) => a + (c.quantity_needed || 1), 0),
      sideboard: sideCards.reduce((a, c) => a + (c.quantity_needed || 1), 0),
      maybeboard: maybeCards.reduce((a, c) => a + (c.quantity_needed || 1), 0)
    };
  }, [deckCards]);

  // Cartas filtradas para la vista activa
  const visibleCards = useMemo(() => {
    let pool = [];
    if (currentTab === 'main') {
      pool = deckCards.filter((c) => c.category === 'mainboard' || c.category === 'commander' || c.category === 'companion');
    } else {
      pool = deckCards.filter((c) => c.category === currentTab);
    }

    if (statusFilter) {
      pool = pool.filter((c) => c.status === statusFilter);
    }

    return pool;
  }, [deckCards, currentTab, statusFilter]);

  const groupedCards = useMemo(() => {
    const groups = {};
    SECTIONS_CONFIG.forEach((s) => { groups[s.key] = { label: s.label, cards: [] }; });

    visibleCards.forEach((card) => {
      const typeKey = resolveCardType(card);
      if (groups[typeKey]) {
        groups[typeKey].cards.push(card);
      } else {
        groups.other.cards.push(card);
      }
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

  return (
    <div className="w-full max-w-[1650px] mx-auto px-4 py-3 space-y-3 text-neutral-100 font-sans pb-16">
      
      {/* 1. BARRA SUPERIOR INTEGRADA: SELECTOR DE MAZOS + PESTAÑAS DE ZONA + VISUALIZACIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-2 shadow-sm">
        
        {/* LADO IZQUIERDO: SELECTOR DE MAZOS Y CONTADOR */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={selectedDeckId || ''}
              onChange={(e) => {
                setSelectedDeckId(e.target.value);
                setStatusFilter(null);
              }}
              className="appearance-none bg-neutral-950 border border-neutral-700/80 hover:border-amber-500 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-white outline-none cursor-pointer transition shadow-inner"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.format})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={onOpenCreateDeckModal}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 transition"
            title="Crear Nuevo Mazo"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono text-neutral-400 hidden xl:inline">
            Mazos: <strong className="text-white">{decks.length}/10</strong>
          </span>
        </div>

        {/* ZONA CENTRAL: PESTAÑAS DE ZONAS (IMAGEN ADJUNTA UBICADA AQUÍ) */}
        <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
          <button
            onClick={() => { setCurrentTab('main'); setStatusFilter(null); }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTab === 'main'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mazo Principal</span>
            <span className="font-mono text-[10px] opacity-80">({zoneCounts.main})</span>
          </button>

          <button
            onClick={() => { setCurrentTab('sideboard'); setStatusFilter(null); }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTab === 'sideboard'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Sideboard</span>
            <span className="font-mono text-[10px] opacity-80">({zoneCounts.sideboard})</span>
          </button>

          <button
            onClick={() => { setCurrentTab('maybeboard'); setStatusFilter(null); }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              currentTab === 'maybeboard'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Maybeboard</span>
            <span className="font-mono text-[10px] opacity-80">({zoneCounts.maybeboard})</span>
          </button>
        </div>

        {/* LADO DERECHO: CONTROLES DE VISTA Y ACCIONES */}
        <div className="flex items-center gap-2">
          
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('text')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                viewMode === 'text' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista de texto"
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden md:inline">Texto</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
                viewMode === 'grid' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista visual"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden md:inline">Visual</span>
            </button>
          </div>

          {viewMode === 'grid' && (
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg px-1.5 py-1 text-[11px] font-mono">
              {(['sm', 'md', 'lg']).map((size) => (
                <button
                  key={size}
                  onClick={() => setCardSize(size)}
                  className={`px-1.5 py-0.5 rounded uppercase font-bold transition ${
                    cardSize === size ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          <div className="h-4 w-px bg-neutral-800 mx-1 hidden sm:block" />

          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 flex items-center gap-1.5 transition"
          >
            <Dices className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Playtest</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 flex items-center gap-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Importar</span>
          </button>
        </div>

      </div>

      {/* 2. ÁREA PRINCIPAL */}
      {activeDeck && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* PANEL IZQUIERDO: COMANDANTE + AUDITORÍA + CURVA INTEGRADA DEBAJO */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3.5 lg:sticky lg:top-3">
            
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl flex flex-col items-center text-center space-y-3">
              
              <div className="w-full flex items-center justify-center gap-2">
                {commanders.length > 1 ? (
                  <div className="flex gap-2 justify-center">
                    {commanders.map((cmd) => (
                      <div
                        key={cmd.deck_card_id}
                        onClick={() => setHoveredCard(cmd)}
                        className={`relative w-28 aspect-[2.5/3.5] rounded-xl overflow-hidden cursor-pointer border shadow transition ${
                          displayCard?.deck_card_id === cmd.deck_card_id ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-neutral-800'
                        }`}
                      >
                        <img src={cmd.image_url} alt={cmd.name} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 px-1 rounded bg-amber-500 text-neutral-950 font-bold text-[8px] flex items-center gap-0.5">
                          <Crown className="w-2 h-2" /> Partner
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative w-full max-w-[220px] aspect-[2.5/3.5] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl">
                    {displayCard?.image_url ? (
                      <img
                        src={displayCard.image_url}
                        alt={displayCard.name}
                        className="w-full h-full object-cover transition-opacity duration-150"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-xs text-neutral-500 font-mono">
                        <Sparkles className="w-6 h-6 text-amber-500 mb-2 opacity-50" />
                        <span>Pasa el cursor sobre una carta</span>
                      </div>
                    )}
                    {displayCard?.category === 'commander' && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-[9px] flex items-center gap-1 shadow">
                        <Crown className="w-2.5 h-2.5" /> Comandante
                      </div>
                    )}
                    {displayCard?.category === 'companion' && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-sky-500 text-neutral-950 font-bold text-[9px] flex items-center gap-1 shadow">
                        <Compass className="w-2.5 h-2.5" /> Companion
                      </div>
                    )}
                  </div>
                )}
              </div>

              {displayCard && (
                <div className="w-full text-left space-y-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white truncate">{displayCard.name}</h3>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {(displayCard.set_code || '---').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono truncate">
                    {displayCard.type_line || displayCard.category?.toUpperCase()}
                  </p>
                </div>
              )}

              {/* Precios y Trade */}
              <div className="w-full grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/80 font-mono text-left">
                <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg p-2">
                  <span className="text-[9px] text-neutral-400 flex items-center gap-1">
                    <DollarSign className="w-2.5 h-2.5 text-amber-400" /> Precio Tienda
                  </span>
                  <span className="text-xs font-bold text-white">
                    {displayCard?.prices?.usd ? `$${displayCard.prices.usd}` : '$0.49 USD'}
                  </span>
                </div>

                <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-lg p-2">
                  <span className="text-[9px] text-neutral-400 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-emerald-400" /> Trade Local
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {displayCard?.available_in_trade_count ?? 3} disp.
                  </span>
                </div>
              </div>

              <button
                onClick={onNavigateToTradeWall}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/10 active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Trade Ahora</span>
              </button>
            </div>

            {/* Auditoría Física Clicable */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Auditoría Física:</span>
                <span className="text-emerald-400 font-bold">{readinessPct}%</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'DISPONIBLE' ? null : 'DISPONIBLE')}
                  className={`p-1.5 rounded border transition ${
                    statusFilter === 'DISPONIBLE'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-emerald-500/50'
                  }`}
                  title="Filtrar disponibles"
                >
                  <span className="text-[9px] text-neutral-500 block">Disp.</span>
                  <span className="text-emerald-400 font-bold">{availableCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === 'EN_OTRO_MAZO' ? null : 'EN_OTRO_MAZO')}
                  className={`p-1.5 rounded border transition ${
                    statusFilter === 'EN_OTRO_MAZO'
                      ? 'bg-amber-950 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-amber-500/50'
                  }`}
                  title="Filtrar en otros mazos"
                >
                  <span className="text-[9px] text-neutral-500 block">Otros</span>
                  <span className="text-amber-400 font-bold">{inOtherDeckCount}</span>
                </button>

                <button
                  onClick={() => setStatusFilter(statusFilter === 'FALTANTE' ? null : 'FALTANTE')}
                  className={`p-1.5 rounded border transition ${
                    statusFilter === 'FALTANTE'
                      ? 'bg-rose-950 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:border-rose-500/50'
                  }`}
                  title="Filtrar faltantes"
                >
                  <span className="text-[9px] text-neutral-500 block">Falta</span>
                  <span className="text-rose-400 font-bold">{missingCount}</span>
                </button>
              </div>

              {statusFilter && (
                <button
                  onClick={() => setStatusFilter(null)}
                  className="w-full pt-1 text-[10px] text-amber-400 hover:underline flex items-center justify-center gap-1"
                >
                  <X className="w-2.5 h-2.5" /> Limpiar filtro ({statusFilter})
                </button>
              )}
            </div>

            {/* Curva de Maná y Distribución */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 shadow-md">
              <ManaAnalysisDrawer cards={deckCards} />
            </div>

          </div>

          {/* PANEL DERECHO: BUSCADOR + CONTENEDOR MASONRY DINÁMICO */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            
            <AddCardInline 
              deckId={activeDeck.id} 
              onCardAdded={refreshCurrentDeckCards} 
            />

            {isLoadingCards ? (
              <div className="py-20 text-center text-xs text-neutral-500 font-mono">
                Cargando cartas de la baraja...
              </div>
            ) : visibleCards.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-900/30 border border-neutral-800 rounded-xl">
                {statusFilter
                  ? `No hay cartas con estado ${statusFilter} en esta vista.`
                  : 'No hay cartas registradas en esta sección. Añade cartas usando el buscador superior o el importador masivo.'}
              </div>
            ) : viewMode === 'text' ? (
              
              /* VISTA TEXTO CON COLUMNAS DINÁMICAS AUTO-AJUSTABLES (SIN ESPACIO DESPERDICIADO) */
              <div className="columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-3 space-y-3">
                {SECTIONS_CONFIG.map(({ key, label }) => {
                  const group = groupedCards[key];
                  if (!group || group.cards.length === 0) return null;

                  const groupCount = group.cards.reduce((acc, c) => acc + (c.quantity_needed || 1), 0);

                  return (
                    <div 
                      key={key} 
                      className={`break-inside-avoid bg-neutral-900/50 border rounded-xl overflow-hidden shadow-sm flex flex-col mb-3 ${
                        key === 'commander' ? 'border-amber-500/50 bg-amber-500/5' : 'border-neutral-800'
                      }`}
                    >
                      {/* Cabecera de Categoría */}
                      <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-semibold ${
                        key === 'commander'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-neutral-950/80 border-neutral-800 text-neutral-300'
                      }`}>
                        <span className="flex items-center gap-1.5">
                          {key === 'commander' && <Crown className="w-3 h-3 text-amber-400" />}
                          {label}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">({groupCount})</span>
                      </div>

                      {/* Filas de Cartas */}
                      <div className="divide-y divide-neutral-800/40 text-xs">
                        {group.cards.map((card) => (
                          <div
                            key={card.deck_card_id}
                            onMouseEnter={() => setHoveredCard(card)}
                            className={`px-2.5 py-1.5 flex items-center justify-between gap-1.5 hover:bg-neutral-800/60 transition group cursor-pointer ${
                              hoveredCard?.deck_card_id === card.deck_card_id ? 'bg-neutral-800/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="font-mono text-[11px] text-neutral-400 w-4 text-center shrink-0">
                                {card.quantity_needed}
                              </span>
                              <span className="text-neutral-200 truncate group-hover:text-amber-400 transition text-[11px]">
                                {card.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  card.status === 'DISPONIBLE'
                                    ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]'
                                    : card.status === 'EN_OTRO_MAZO'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                title={card.status}
                              />

                              {/* MENÚ DESPLEGABLE CON NOMBRES CLAROS Y DIRECTOS */}
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
                                <select
                                  value={card.category}
                                  onChange={(e) => handleUpdateCategory(card, e.target.value)}
                                  className="bg-neutral-950 border border-neutral-700 hover:border-amber-500 text-[10px] rounded px-1.5 py-0.5 text-neutral-200 outline-none cursor-pointer"
                                  title="Mover de ubicación en el mazo"
                                >
                                  <option value="mainboard">📦 Mazo Principal</option>
                                  <option value="commander">👑 Comandante</option>
                                  <option value="companion">🧭 Companion</option>
                                  <option value="sideboard">💼 Sideboard</option>
                                  <option value="maybeboard">💡 Maybeboard</option>
                                </select>

                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }}
                                  className="p-0.5 text-neutral-400 hover:text-white"
                                  title="Aumentar"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveCard(card.deck_card_id); }}
                                  className="p-0.5 text-neutral-400 hover:text-rose-400"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            ) : (

              /* VISTA GRID VISUAL CON COLUMNAS ADAPTABLES */
              <div className="space-y-4">
                {SECTIONS_CONFIG.map(({ key, label }) => {
                  const group = groupedCards[key];
                  if (!group || group.cards.length === 0) return null;

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-1 text-xs font-mono uppercase tracking-wider text-neutral-400">
                        <span className="font-bold text-neutral-300">{label}</span>
                        <span className="text-amber-400 font-bold">{group.cards.length} cartas</span>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {group.cards.map((card) => (
                          <div
                            key={card.deck_card_id}
                            onMouseEnter={() => setHoveredCard(card)}
                            className={`group relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 cursor-pointer hover:border-amber-500 transition-all ${getGridCardClass()}`}
                          >
                            <div className="aspect-[2.5/3.5] w-full relative">
                              {card.image_url ? (
                                <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px] text-neutral-500">
                                  {card.name}
                                </div>
                              )}
                              <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-neutral-950/80 text-[10px] font-mono font-bold text-white border border-neutral-800">
                                {card.quantity_needed}x
                              </span>

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(card, 1); }}
                                  className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white"
                                  title="Aumentar"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRemoveCard(card.deck_card_id); }}
                                  className="p-1 rounded bg-neutral-800 hover:bg-rose-900 text-rose-300"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="p-1.5 bg-neutral-950/95 border-t border-neutral-800">
                              <p className="text-[11px] font-semibold text-white truncate">{card.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            )}

          </div>

        </div>
      )}

      {/* 4. BARRA DE ESTADO INFERIOR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 border-t border-neutral-800 px-6 py-2 flex items-center justify-between text-xs font-mono text-neutral-400 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold">{zoneCounts.main} Cartas en Baraja</span>
          <span>·</span>
          <span className={legalityReport.isLegal ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {legalityReport.isLegal ? 'Mazo Legal' : 'Revisar Legalidad'}
          </span>
          <span>·</span>
          <span>{activeDeck?.format}</span>
        </div>

        <div className="text-[11px] text-neutral-500 hidden sm:block">
          Portions © Wizards of the Coast LLC · Scryfall compliant[cite: 17, 18]
        </div>
      </footer>

      {/* MODALES */}
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
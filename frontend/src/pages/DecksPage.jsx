// ---------------------------------------------------------
// PÁGINA: CONSTRUCTOR Y AUDITOR DE MAZOS (DECKBUILDER)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Share2,
  Flame,
  ArrowRight,
  Shield,
  Coins
} from 'lucide-react';
import { getMyDecksApi, getDeckCardsWithStatusApi } from '../api/decks';

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
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // 1. Cargar mazos del usuario autenticado
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
        setDecks(data || []);
        onDeckCountChange?.(data?.length || 0);
        if (data && data.length > 0 && !selectedDeckId) {
          setSelectedDeckId(data[0].id);
        }
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Error al cargar mazos:', err);
        }
      })
      .finally(() => setIsLoadingDecks(false));

    return () => ctrl.abort();
  }, [currentUser, refreshTrigger]);

  // 2. Cargar cartas y estado de inventario del mazo seleccionado
  useEffect(() => {
    if (!selectedDeckId) {
      setDeckCards([]);
      return;
    }

    const ctrl = new AbortController();
    setIsLoadingCards(true);

    getDeckCardsWithStatusApi(selectedDeckId, { signal: ctrl.signal })
      .then((cards) => {
        setDeckCards(cards || []);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Error al auditar cartas del mazo:', err);
        }
      })
      .finally(() => setIsLoadingCards(false));

    return () => ctrl.abort();
  }, [selectedDeckId]);

  const activeDeck = decks.find((d) => d.id === selectedDeckId) || decks[0];

  // Cálculo de estadísticas físicas
  const availableCount = deckCards.filter((c) => c.status === 'DISPONIBLE').length;
  const inOtherDeckCount = deckCards.filter((c) => c.status === 'EN_OTRO_MAZO').length;
  const missingCount = deckCards.filter((c) => c.status === 'FALTANTE').length;
  const totalCards = deckCards.length || 1;
  const readinessPct = Math.round((availableCount / totalCards) * 100);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* HERO & MÉTRICAS KPI */}
      <section className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-neutral-800/70">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Constructor y Auditor de Mazos</span>
                <span className="text-neutral-500 font-normal text-base">(Deckbuilder)</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                Regla: Máximo 10 Mazos
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Audita en tiempo real copias físicas en tus binders, detecta conflictos entre mazos y gestiona tus faltantes.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3.5 py-2 flex items-center gap-3">
              <div>
                <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Capacidad de Mazos</div>
                <div className="text-xs font-mono font-bold text-neutral-200">
                  <span className="text-amber-400 text-sm">{decks.length}</span> / 10 Mazos
                </div>
              </div>
              <div className="w-16 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  style={{ width: `${Math.min((decks.length / 10) * 100, 100)}%` }}
                />
              </div>
            </div>

            <button
              onClick={onOpenCreateDeckModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Mazo</span>
            </button>
          </div>
        </div>

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Total Mazos Activos</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">{decks.length}</span>
              <span className="text-[11px] font-mono text-neutral-500">registrados</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Completitud Física</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-emerald-400">
                {deckCards.length > 0 ? `${readinessPct}%` : '0%'}
              </span>
              <span className="text-[11px] font-mono text-neutral-400">mazo actual</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Cartas Faltantes</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-rose-400">{missingCount}</span>
              <span className="text-[11px] font-mono text-neutral-400">por conseguir</span>
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">En Otros Mazos</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-amber-400">{inOtherDeckCount}</span>
              <span className="text-[11px] font-mono text-neutral-400">compartidas</span>
            </div>
          </div>
        </div>
      </section>

      {/* ÁREA PRINCIPAL */}
      {decks.length === 0 && !isLoadingDecks ? (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No tienes mazos creados</h3>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            Crea tu primer mazo para auditar la posesión física de tus cartas contra tus binders.
          </p>
          <button
            onClick={onOpenCreateDeckModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition"
          >
            Crear mi primer mazo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            
            {/* Selector de Mazos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => setSelectedDeckId(deck.id)}
                  className={`text-left p-3 rounded-xl transition border ${
                    selectedDeckId === deck.id
                      ? 'bg-neutral-900 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-xs font-bold text-white truncate block">{deck.name}</span>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{deck.format}</div>
                </button>
              ))}
            </div>

            {/* Listado de Cartas del Mazo */}
            {activeDeck && (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeDeck.name}</h2>
                    <span className="text-xs text-neutral-400 font-mono">{activeDeck.format}</span>
                  </div>
                  <button
                    onClick={onNavigateToTradeWall}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition"
                  >
                    <Flame className="w-3.5 h-3.5" /> Ver en Muro Trade
                  </button>
                </div>

                {isLoadingCards ? (
                  <div className="py-12 text-center text-sm text-neutral-500 font-mono">
                    Auditando inventario de cartas...
                  </div>
                ) : deckCards.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-500">
                    Este mazo no tiene cartas registradas.
                  </div>
                ) : (
                  <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/60 divide-y divide-neutral-800/60">
                    {deckCards.map((card) => (
                      <div
                        key={card.deck_card_id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-800/40 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-neutral-500 w-6">{card.quantity_needed}x</span>
                          {card.image_url ? (
                            <img src={card.image_url} alt={card.name} className="w-8 aspect-[2.5/3.5] rounded object-cover border border-neutral-700" />
                          ) : (
                            <div className="w-8 aspect-[2.5/3.5] rounded bg-neutral-800 border border-neutral-700" />
                          )}
                          <div className="truncate">
                            <span className="text-xs font-semibold text-neutral-200 block truncate">{card.name}</span>
                            <span className="text-[10px] font-mono text-neutral-500">{card.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {card.status === 'DISPONIBLE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                              DISPONIBLE
                            </span>
                          )}
                          {card.status === 'EN_OTRO_MAZO' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-950/60 border border-amber-800/60 text-amber-400" title={card.assigned_other_decks?.join(', ')}>
                              EN OTRO MAZO
                            </span>
                          )}
                          {card.status === 'FALTANTE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-950/60 border border-rose-800/60 text-rose-400">
                              FALTANTE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panel Lateral de Auditoría */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Resumen de Auditoría
              </h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-400">Disponibles:</span>
                  <span className="text-emerald-400 font-bold">{availableCount}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-400">En otro mazo:</span>
                  <span className="text-amber-400 font-bold">{inOtherDeckCount}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800">
                  <span className="text-neutral-400">Faltantes:</span>
                  <span className="text-rose-400 font-bold">{missingCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
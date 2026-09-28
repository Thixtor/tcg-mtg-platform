// ---------------------------------------------------------
// VISTA: GESTIÓN DE MAZOS (DECKS) Y ANÁLISIS DE DISPONIBILIDAD
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldPlus, 
  ArrowLeft, 
  Loader2, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Layers
} from 'lucide-react';
import { getUserDecksApi, createDeckApi, getDeckInventoryStatusApi } from '../api/decks';
import CreateDeckModal from '../components/decks/CreateDeckModal';

export default function DecksPage({ userId }) {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mazo seleccionado para ver su listado y reporte de inventario
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckCards, setDeckCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Control del modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Cargar mazos del usuario
  const fetchDecks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserDecksApi(userId);
      setDecks(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los mazos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchDecks();
    }
  }, [userId]);

  // 2. Cargar cartas y estado de inventario del mazo seleccionado
  const handleSelectDeck = async (deck) => {
    setSelectedDeck(deck);
    try {
      setLoadingCards(true);
      const statusData = await getDeckInventoryStatusApi(deck.id);
      setDeckCards(statusData);
    } catch (err) {
      console.error('Error al cargar status del mazo:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  // 3. Crear mazo nuevo
  const handleCreateDeck = async (payload) => {
    const newDeck = await createDeckApi(userId, payload);
    setDecks((prev) => [...prev, newDeck]);
  };

  // Helper para renderizar el badge de estado físico
  const renderStatusBadge = (card) => {
    if (card.status === 'DISPONIBLE') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
          <CheckCircle2 className="w-3 h-3" />
          Disponible
        </span>
      );
    }
    if (card.status === 'EN_OTRO_MAZO') {
      const otros = card.assigned_other_decks?.join(', ') || 'Otro mazo';
      return (
        <span 
          title={`Asignada en: ${otros}`}
          className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded cursor-help"
        >
          <Clock className="w-3 h-3" />
          En otro mazo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-950/60 border border-red-900/60 px-2 py-0.5 rounded">
        <HelpCircle className="w-3 h-3" />
        Faltante
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      
      {/* ========================================================= */}
      {/* VISTA DETALLADA DEL MAZO E INSPECCIÓN DE INVENTARIO       */}
      {/* ========================================================= */}
      {selectedDeck ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <button
              onClick={() => setSelectedDeck(null)}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a mis mazos</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-neutral-800 text-amber-400 font-mono font-semibold">
                {selectedDeck.format}
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                ID: {selectedDeck.id}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              {selectedDeck.name}
            </h2>
            {selectedDeck.description && (
              <p className="text-neutral-400 text-sm mt-1">{selectedDeck.description}</p>
            )}
          </div>

          {/* Resumen rápido de posesión física */}
          {!loadingCards && deckCards.length > 0 && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl text-center">
              <div>
                <span className="block text-xl font-bold text-emerald-400">
                  {deckCards.filter((c) => c.status === 'DISPONIBLE').length}
                </span>
                <span className="text-xs text-neutral-500 uppercase tracking-wider">Disponibles</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-amber-400">
                  {deckCards.filter((c) => c.status === 'EN_OTRO_MAZO').length}
                </span>
                <span className="text-xs text-neutral-500 uppercase tracking-wider">En otro mazo</span>
              </div>
              <div>
                <span className="block text-xl font-bold text-red-400">
                  {deckCards.filter((c) => c.status === 'FALTANTE').length}
                </span>
                <span className="text-xs text-neutral-500 uppercase tracking-wider">Faltantes</span>
              </div>
            </div>
          )}

          {/* Listado de Cartas del Mazo */}
          {loadingCards ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
              <p>Analizando disponibilidad de cartas...</p>
            </div>
          ) : deckCards.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/40 border border-dashed border-neutral-800 rounded-xl">
              <Layers className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-300">Este mazo no tiene cartas aún</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
                Busca cartas en el Catálogo y agrégalas a este mazo para verificar si las tienes en tus carpetas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {deckCards.map((item) => (
                <div 
                  key={item.deck_card_id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between hover:border-neutral-700 transition"
                >
                  <div className="aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-neutral-950 relative mb-3">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-neutral-600">
                        Sin Imagen
                      </div>
                    )}
                    <span className="absolute top-2 left-2 bg-neutral-950/80 backdrop-blur-xs text-neutral-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border border-neutral-800">
                      {item.category}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-100 truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-neutral-400 mt-0.5">
                        <span>Set: <strong className="text-neutral-300 uppercase">{item.set_code || '---'}</strong></span>
                        <span>Cant: <strong className="text-neutral-300">x{item.quantity_needed}</strong></span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                      {renderStatusBadge(item)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================= */
        /* VISTA DE LISTADO DE MAZOS (DECKS) DEL USUARIO             */
        /* ========================================================= */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-amber-500" />
                Mis Mazos (Deckbuilder)
              </h1>
              <p className="text-neutral-400 text-sm mt-0.5">
                Construye y audita tus barajas contrastándolas contra tu inventario físico real.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchDecks}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 border border-neutral-800 transition"
                title="Refrescar mazos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={decks.length >= 10}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                <ShieldPlus className="w-4 h-4" />
                <span>Nuevo Mazo ({decks.length}/10)</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
              <p>Cargando mazos...</p>
            </div>
          ) : decks.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-xl">
              <ShieldPlus className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-300">No has registrado ningún mazo</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
                Crea tu primer mazo para Commander u otro formato y comprueba qué cartas tienes disponibles.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition"
              >
                Crear mi primer Mazo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  onClick={() => handleSelectDeck(deck)}
                  className="group bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 group-hover:bg-amber-500/20 text-neutral-300 group-hover:text-amber-400 font-mono font-semibold transition">
                        {deck.format}
                      </span>
                      <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400">
                        Auditar &rarr;
                      </span>
                    </div>

                    <div>
                      <h3 className="font-semibold text-lg text-white group-hover:text-amber-400 transition truncate">
                        {deck.name}
                      </h3>
                      <p className="text-sm text-neutral-400 line-clamp-2 mt-1">
                        {deck.description || 'Sin notas de estrategia.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                    <span>Mazo de juego</span>
                    <span className="font-medium text-neutral-400">Ver inventario</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para crear mazo */}
      <CreateDeckModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateDeck}
        currentCount={decks.length}
      />
    </div>
  );
}
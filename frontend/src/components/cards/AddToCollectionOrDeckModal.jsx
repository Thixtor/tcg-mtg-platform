// ---------------------------------------------------------
// COMPONENTE: MODAL DE ASIGNACIÓN A COLECCIONES O MAZOS
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { X, Layers, Shield, Check, AlertCircle, Loader2, Plus, FolderPlus, User } from 'lucide-react';
import { 
  getUserCollectionsApi, 
  getMyCollectionsApi,
  addCardToCollectionApi, 
  createCollectionApi,
  createMyCollectionApi 
} from '../../api/collections';
import { 
  getUserDecksApi, 
  getMyDecksApi, 
  addCardToDeckApi 
} from '../../api/decks';

const CARD_CONDITIONS = [
  { value: 'NM', label: 'Near Mint (NM)' },
  { value: 'LP', label: 'Lightly Played (LP)' },
  { value: 'MP', label: 'Moderately Played (MP)' },
  { value: 'HP', label: 'Heavily Played (HP)' },
  { value: 'DMG', label: 'Damaged (DMG)' },
];

const DECK_CATEGORIES = [
  { value: 'mainboard', label: 'Mainboard' },
  { value: 'commander', label: 'Commander' },
  { value: 'sideboard', label: 'Sideboard' },
  { value: 'maybeboard', label: 'Maybeboard' },
];

export default function AddToCollectionOrDeckModal({ isOpen, onClose, card, userId: propUserId }) {
  const [targetType, setTargetType] = useState('collection');

  // Identificador opcional para pruebas/perfiles ajenos
  const [effectiveUserId, setEffectiveUserId] = useState(() => {
    return propUserId || localStorage.getItem('mtg_dev_user_id') || '';
  });

  const token = localStorage.getItem('token');

  // Listados disponibles
  const [collections, setCollections] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Formulario de asignación a Colección
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('NM');
  const [language, setLanguage] = useState('en');
  const [isFoil, setIsFoil] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);
  const [tradeNotes, setTradeNotes] = useState('');

  // Creación rápida de Colección en línea
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');
  const [creatingInline, setCreatingInline] = useState(false);

  // Formulario de asignación a Mazo
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [deckCategory, setDeckCategory] = useState('mainboard');

  // Estados de proceso
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const id = propUserId || localStorage.getItem('mtg_dev_user_id') || '';
    setEffectiveUserId(id);
  }, [propUserId, isOpen]);

  // Cargar colecciones y mazos (prioriza JWT sesión activa, o UID explícito)
  const loadUserData = useCallback(async () => {
    if (!token && !effectiveUserId) return;
    setLoadingTargets(true);
    setErrorMsg(null);

    try {
      const fetchCols = effectiveUserId
        ? getUserCollectionsApi(effectiveUserId).catch(() => [])
        : getMyCollectionsApi().catch(() => []);

      const fetchDecks = effectiveUserId
        ? getUserDecksApi(effectiveUserId).catch(() => [])
        : (getMyDecksApi ? getMyDecksApi().catch(() => []) : Promise.resolve([]));

      const [userCollections, userDecks] = await Promise.all([fetchCols, fetchDecks]);

      const colsArray = Array.isArray(userCollections) ? userCollections : [];
      const decksArray = Array.isArray(userDecks) ? userDecks : [];

      setCollections(colsArray);
      setDecks(decksArray);

      if (colsArray.length > 0) setSelectedCollectionId(colsArray[0].id);
      if (decksArray.length > 0) setSelectedDeckId(decksArray[0].id);
    } catch (err) {
      console.error('Error cargando destinos:', err);
    } finally {
      setLoadingTargets(false);
    }
  }, [effectiveUserId, token]);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen, loadUserData]);

  if (!isOpen || !card) return null;

  // Manejar creación rápida de Colección
  const handleCreateCollectionInline = async (e) => {
    e.preventDefault();
    if (!token && !effectiveUserId) {
      setErrorMsg('Debes iniciar sesión para crear una colección.');
      return;
    }

    if (!newCollectionName.trim()) {
      setErrorMsg('El nombre de la nueva colección es obligatorio.');
      return;
    }

    if (collections.length >= 10) {
      setErrorMsg('Has alcanzado el límite máximo de 10 colecciones.');
      return;
    }

    try {
      setCreatingInline(true);
      setErrorMsg(null);

      const payload = {
        name: newCollectionName.trim(),
        description: newCollectionDesc.trim() || null
      };

      const nueva = effectiveUserId 
        ? await createCollectionApi(effectiveUserId, payload)
        : await createMyCollectionApi(payload);

      setCollections((prev) => [...prev, nueva]);
      setSelectedCollectionId(nueva.id);
      setNewCollectionName('');
      setNewCollectionDesc('');
      setShowCreateInline(false);
      setSuccessMsg(`Colección "${nueva.name}" creada y seleccionada.`);
    } catch (err) {
      const serverDetail = err.response?.data?.detail;
      setErrorMsg(serverDetail || err.message || 'Error al crear la colección.');
    } finally {
      setCreatingInline(false);
    }
  };

  // Manejar asignación física
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token && !effectiveUserId) {
      setErrorMsg('Se requiere iniciar sesión para asociar la carta.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (targetType === 'collection') {
        if (!selectedCollectionId) {
          throw new Error('Debes seleccionar o crear primero una colección.');
        }
        await addCardToCollectionApi(selectedCollectionId, {
          scryfall_card_id: card.id,
          quantity: Number(quantity),
          condition,
          language,
          is_foil: isFoil,
          is_for_trade: isForTrade,
          trade_notes: isForTrade && tradeNotes.trim() ? tradeNotes.trim() : null
        });
        setSuccessMsg(`¡${card.name} añadida a tu colección con éxito!`);
      } else {
        if (!selectedDeckId) {
          throw new Error('Debes seleccionar o crear primero un mazo.');
        }
        await addCardToDeckApi(selectedDeckId, {
          scryfall_card_id: card.id,
          quantity: Number(quantity),
          category: deckCategory
        });
        setSuccessMsg(`¡${card.name} agregada al mazo correctamente!`);
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Error al guardar la carta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              Asignar Carta: <span className="text-amber-400 font-semibold">{card.name}</span>
            </h3>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              Set: {(card.set || '---').toUpperCase()} · #{card.scryfall_raw_data?.collector_number || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verificación de Usuario Activo solo si no hay JWT ni UID */}
        {!token && !effectiveUserId && (
          <div className="p-4 bg-amber-950/30 border-b border-amber-900/50 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
              <User className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Inicia sesión o ingresa un User UUID de pruebas:</span>
            </div>
            <input
              type="text"
              placeholder="Pega tu User UUID aquí..."
              className="w-full bg-neutral-950 border border-neutral-800 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono focus:border-amber-500 focus:outline-none"
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val) {
                  localStorage.setItem('mtg_dev_user_id', val);
                  setEffectiveUserId(val);
                }
              }}
            />
          </div>
        )}

        {/* Selector de Destino: Mis Colecciones vs Mis Mazos */}
        <div className="grid grid-cols-2 p-3 gap-2 bg-neutral-950/40 border-b border-neutral-800">
          <button
            type="button"
            onClick={() => { setTargetType('collection'); setErrorMsg(null); }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl border transition ${
              targetType === 'collection'
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mis Colecciones</span>
          </button>
          <button
            type="button"
            onClick={() => { setTargetType('deck'); setErrorMsg(null); }}
            className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl border transition ${
              targetType === 'deck'
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Mis Mazos</span>
          </button>
        </div>

        {/* Mensajes de Alerta */}
        <div className="px-6 pt-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-xl mb-3">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 pt-0 space-y-4 overflow-y-auto max-h-[70vh]">
          {loadingTargets ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Cargando tus colecciones y mazos...</span>
            </div>
          ) : (
            <>
              {/* CASO A: ASIGNAR A MIS COLECCIONES */}
              {targetType === 'collection' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Colección de Destino *
                      </label>
                      {!showCreateInline && collections.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setShowCreateInline(true)}
                          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear nueva</span>
                        </button>
                      )}
                    </div>

                    {showCreateInline ? (
                      <div className="p-3.5 bg-neutral-950/80 border border-amber-600/40 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <FolderPlus className="w-4 h-4" />
                            Nueva Colección
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCreateInline(false)}
                            className="text-neutral-500 hover:text-neutral-300 text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          placeholder="Nombre de la colección..."
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          value={newCollectionDesc}
                          onChange={(e) => setNewCollectionDesc(e.target.value)}
                          placeholder="Descripción breve (opcional)..."
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          disabled={creatingInline}
                          onClick={handleCreateCollectionInline}
                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition"
                        >
                          {creatingInline ? 'Creando...' : 'Crear y Seleccionar'}
                        </button>
                      </div>
                    ) : collections.length === 0 ? (
                      <div className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-2">
                        <p className="text-xs text-amber-300">
                          Aún no tienes colecciones registradas.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowCreateInline(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear mi primera colección</span>
                        </button>
                      </div>
                    ) : (
                      <select
                        value={selectedCollectionId}
                        onChange={(e) => setSelectedCollectionId(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                      >
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Formulario de atributos físicos */}
                  <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                          Condición
                        </label>
                        <select
                          value={condition}
                          onChange={(e) => setCondition(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                        >
                          {CARD_CONDITIONS.map((c) => (
                            <option key={c.value} value={c.value}>{c.value}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                          Idioma
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                        >
                          <option value="en">Inglés (EN)</option>
                          <option value="es">Español (ES)</option>
                          <option value="jp">Japonés (JP)</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-800 space-y-3">
                      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isFoil}
                          onChange={(e) => setIsFoil(e.target.checked)}
                          className="rounded border-neutral-800 text-amber-600 focus:ring-0 bg-neutral-950 w-4 h-4"
                        />
                        <span>Copia brillante (✨ Acabado Foil)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isForTrade}
                          onChange={(e) => setIsForTrade(e.target.checked)}
                          className="rounded border-neutral-800 text-amber-600 focus:ring-0 bg-neutral-950 w-4 h-4"
                        />
                        <span>Disponible para intercambio en el Mercado P2P</span>
                      </label>

                      {isForTrade && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                            Notas de Intercambio (Opcional)
                          </label>
                          <input
                            type="text"
                            value={tradeNotes}
                            onChange={(e) => setTradeNotes(e.target.value)}
                            placeholder="Ej: Solo cambio por staples o foils..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || collections.length === 0}
                        className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        {submitting ? 'Guardando...' : 'Añadir a Colección'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CASO B: ASIGNAR A MIS MAZOS */}
              {targetType === 'deck' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      Seleccionar Mazo de Destino *
                    </label>
                    {decks.length === 0 ? (
                      <p className="text-xs text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/40">
                        No tienes mazos creados aún. Ve a la pestaña &quot;Mis Mazos&quot; para crear tu primera baraja.
                      </p>
                    ) : (
                      <select
                        value={selectedDeckId}
                        onChange={(e) => setSelectedDeckId(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                      >
                        {decks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.format})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                        Cantidad Requerida
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                        Categoría en el Mazo
                      </label>
                      <select
                        value={deckCategory}
                        onChange={(e) => setDeckCategory(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 transition"
                      >
                        {DECK_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || decks.length === 0}
                      className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {submitting ? 'Guardando...' : 'Añadir al Mazo'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
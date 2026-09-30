// ---------------------------------------------------------
// MODAL: ACCIONES RÁPIDAS (MAZOS, COMANDANTE Y COLECCIONES)
// ---------------------------------------------------------
import React, { useState, useEffect, useMemo } from 'react';
import { X, Crown, Plus, FolderPlus, Layers, Check, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';
import { parseApiError } from '@/utils/apiErrors';

export function QuickCardActionModal({ isOpen, onClose, card, onActionSuccess }) {
  const [activeTab, setActiveTab] = useState('deck'); // 'deck' | 'collection'
  
  // Listas de recursos del usuario
  const [decks, setDecks] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Formularios: Agregar a mazo existente
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [deckQuantity, setDeckQuantity] = useState(1);
  const [asCommander, setAsCommander] = useState(false);

  // Formularios: Crear nuevo mazo
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckFormat, setNewDeckFormat] = useState('commander');

  // Formularios: Colección existente o nueva
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [cardCondition, setCardCondition] = useState('NM');
  const [isFoil, setIsFoil] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);

  // Detección de Criatura Legendaria según MTG CR 903.3
  const isLegendaryCreature = useMemo(() => {
    if (!card) return false;
    const typeLine = (card.type_line || card.scryfall_raw_data?.type_line || '').toLowerCase();
    const oracle = (card.oracle_text || card.scryfall_raw_data?.oracle_text || '').toLowerCase();
    return (typeLine.includes('legendary') && (typeLine.includes('creature') || typeLine.includes('vehicle'))) || oracle.includes('can be your commander');
  }, [card]);

  // Cargar mazos y colecciones del usuario llamando a los endpoints correctos (/me)
  useEffect(() => {
    if (!isOpen) return;
    setLoadingResources(true);
    setSuccessMsg('');
    setErrorMsg('');

    Promise.all([
      apiClient.get('/decks/me').catch(() => ({ data: [] })),
      apiClient.get('/collections/me').catch(() => ({ data: [] }))
    ])
      .then(([decksRes, colRes]) => {
        const userDecks = Array.isArray(decksRes.data) ? decksRes.data : [];
        const userCols = Array.isArray(colRes.data) ? colRes.data : [];
        
        setDecks(userDecks);
        setCollections(userCols);
        
        if (userDecks.length > 0) setSelectedDeckId(userDecks[0].id);
        if (userCols.length > 0) setSelectedCollectionId(userCols[0].id);
        
        if (isLegendaryCreature) {
          setNewDeckName(`Mazo de ${card.name}`);
          setNewDeckFormat('commander');
          setAsCommander(true);
        }
      })
      .catch((err) => {
        setErrorMsg(parseApiError(err, 'No fue posible cargar tus mazos o colecciones.'));
      })
      .finally(() => setLoadingResources(false));
  }, [isOpen, card, isLegendaryCreature]);

  if (!isOpen || !card) return null;

  // ---------------------------------------------------------
  // ACCIÓN: AGREGAR O CREAR MAZO
  // ---------------------------------------------------------
  const handleDeckSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let targetDeckId = selectedDeckId;

      // 1. Crear nuevo mazo si el usuario lo seleccionó
      if (isCreatingDeck) {
        const createRes = await apiClient.post('/decks', {
          name: newDeckName.trim() || `Mazo de ${card.name}`,
          format: isLegendaryCreature ? 'commander' : newDeckFormat,
          description: isLegendaryCreature ? `Comandante: ${card.name}` : 'Mazo creado desde catálogo'
        });
        targetDeckId = createRes.data.id;
      }

      if (!targetDeckId) {
        throw new Error('Debes seleccionar o crear un mazo primero.');
      }

      // 2. Asociar carta al mazo con el contrato de backend correcto: category: 'commander' | 'mainboard'
      await apiClient.post(`/decks/${targetDeckId}/cards`, {
        scryfall_card_id: card.id,
        quantity: deckQuantity,
        category: (isLegendaryCreature && asCommander) ? 'commander' : 'mainboard'
      });

      setSuccessMsg(isCreatingDeck ? '¡Mazo creado y carta asignada!' : '¡Carta añadida al mazo!');
      setTimeout(() => {
        onActionSuccess && onActionSuccess();
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error al procesar la acción en el mazo.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // ACCIÓN: AGREGAR O CREAR COLECCIÓN / BINDER
  // ---------------------------------------------------------
  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let targetColId = selectedCollectionId;

      // 1. Crear nueva colección si aplica
      if (isCreatingCollection) {
        const createRes = await apiClient.post('/collections', {
          name: newCollectionName.trim() || 'Mi Nuevo Binder',
          is_public_trade: true
        });
        targetColId = createRes.data.id;
      }

      if (!targetColId) {
        throw new Error('Debes seleccionar o crear una colección primero.');
      }

      // 2. Asociar carta a la colección
      await apiClient.post(`/collections/${targetColId}/cards`, {
        scryfall_card_id: card.id,
        quantity: 1,
        condition: cardCondition,
        is_foil: isFoil,
        is_for_trade: isForTrade
      });

      setSuccessMsg(isCreatingCollection ? '¡Nueva colección creada y carta guardada!' : '¡Carta añadida a la colección!');
      setTimeout(() => {
        onActionSuccess && onActionSuccess();
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error al guardar en la colección.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100 line-clamp-1">{card.name}</h3>
              <p className="text-[11px] text-neutral-400">Asignación rápida a inventario o juego</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Selección: Mazo vs Colección */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30 px-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('deck')}
            className={`py-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'deck'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mazos / Decks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('collection')}
            className={`py-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'collection'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Colección / Binders</span>
          </button>
        </div>

        {/* Feedback visual */}
        {successMsg && (
          <div className="m-4 p-2.5 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="m-4 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* FORMULARIO 1: MAZOS Y CREACIÓN CON COMANDANTE             */}
        {/* --------------------------------------------------------- */}
        {activeTab === 'deck' && (
          <form onSubmit={handleDeckSubmit} className="p-5 space-y-4">
            
            {/* Banner si es Criatura Legendaria */}
            {isLegendaryCreature && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-amber-300 font-medium">
                    ¡Esta carta puede liderar un mazo de Commander!
                  </span>
                </div>
                {!isCreatingDeck && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingDeck(true);
                      setAsCommander(true);
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    Crear Mazo
                  </button>
                )}
              </div>
            )}

            {/* Alternar Crear Nuevo vs Existente */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">
                {isCreatingDeck ? 'Creando nuevo mazo:' : 'Seleccionar mazo destino:'}
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingDeck(!isCreatingDeck)}
                className="text-amber-400 hover:text-amber-300 underline text-[11px]"
              >
                {isCreatingDeck ? '← Elegir de mis mazos' : '+ Crear nuevo mazo'}
              </button>
            </div>

            {loadingResources ? (
              <div className="flex items-center justify-center py-4 text-xs text-neutral-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Cargando tus mazos...</span>
              </div>
            ) : isCreatingDeck ? (
              <div className="space-y-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Nombre del mazo</label>
                  <input
                    type="text"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="ej. Dragones de Tarkir"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Formato</label>
                  <select
                    value={newDeckFormat}
                    onChange={(e) => setNewDeckFormat(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="commander">Commander / EDH (100 cartas)</option>
                    <option value="standard">Standard (60 cartas)</option>
                    <option value="modern">Modern (60 cartas)</option>
                    <option value="pioneer">Pioneer (60 cartas)</option>
                    <option value="pauper">Pauper (60 cartas)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                {decks.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-2">
                    No tienes mazos creados aún. Pulsa "+ Crear nuevo mazo" arriba.
                  </p>
                ) : (
                  <select
                    value={selectedDeckId}
                    onChange={(e) => setSelectedDeckId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({String(d.format).toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Opciones de la Carta en el Mazo */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Cantidad:</span>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={deckQuantity}
                  onChange={(e) => setDeckQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-16 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-center text-neutral-100 focus:outline-none"
                />
              </div>

              {isLegendaryCreature && (
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asCommander}
                    onChange={(e) => setAsCommander(e.target.checked)}
                    className="rounded bg-neutral-950 border-neutral-800 text-amber-600 focus:ring-0"
                  />
                  <span>Asignar como Comandante</span>
                </label>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || (!isCreatingDeck && decks.length === 0)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCreatingDeck ? 'Crear y Añadir' : 'Añadir al Mazo'}</span>
              </button>
            </div>
          </form>
        )}

        {/* --------------------------------------------------------- */}
        {/* FORMULARIO 2: COLECCIONES Y BINDERS                       */}
        {/* --------------------------------------------------------- */}
        {activeTab === 'collection' && (
          <form onSubmit={handleCollectionSubmit} className="p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">
                {isCreatingCollection ? 'Creando nueva colección:' : 'Seleccionar colección:'}
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingCollection(!isCreatingCollection)}
                className="text-amber-400 hover:text-amber-300 underline text-[11px]"
              >
                {isCreatingCollection ? '← Elegir existente' : '+ Iniciar nueva colección'}
              </button>
            </div>

            {loadingResources ? (
              <div className="flex items-center justify-center py-4 text-xs text-neutral-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Cargando tus colecciones...</span>
              </div>
            ) : isCreatingCollection ? (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                <label className="text-[11px] text-neutral-400 block">Nombre de la colección o binder</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="ej. Binder de Raras y Cambios"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            ) : (
              <div>
                {collections.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-2">
                    No tienes colecciones activas. Usa "+ Iniciar nueva colección" arriba.
                  </p>
                ) : (
                  <select
                    value={selectedCollectionId}
                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.is_public_trade ? '(Público para Trade)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Opciones físicas de la carta */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Estado / Condición</label>
                <select
                  value={cardCondition}
                  onChange={(e) => setCardCondition(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 focus:outline-none"
                >
                  <option value="NM">Near Mint (NM)</option>
                  <option value="LP">Lightly Played (LP)</option>
                  <option value="MP">Moderately Played (MP)</option>
                  <option value="HP">Heavily Played (HP)</option>
                  <option value="DMG">Damaged (DMG)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end space-y-1.5 pb-1">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFoil}
                    onChange={(e) => setIsFoil(e.target.checked)}
                    className="rounded bg-neutral-950 border-neutral-800 text-amber-600 focus:ring-0"
                  />
                  <span>✨ Acabado Foil</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isForTrade}
                    onChange={(e) => setIsForTrade(e.target.checked)}
                    className="rounded bg-neutral-950 border-neutral-800 text-amber-600 focus:ring-0"
                  />
                  <span>🤝 Disponible para Trade</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || (!isCreatingCollection && collections.length === 0)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCreatingCollection ? 'Crear Colección y Guardar' : 'Añadir a Colección'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
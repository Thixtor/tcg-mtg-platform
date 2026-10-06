// ---------------------------------------------------------
// MODAL: CREACIÓN DE MAZO (ACCESIBLE Y CON SCHEMAS MTG VÁLIDOS)
// ---------------------------------------------------------
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Shield, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Layers, 
  Plus, 
  Minus, 
  Trash2, 
  RefreshCw, 
  Users
} from 'lucide-react';
import { createDeckApi, addCardToDeckApi } from '@/api/decks.api';
import ManaCost from '@/components/common/ManaSymbol';
import PrivacyToggle from '@/components/common/PrivacyToggle';
import ScryfallCardSearch from '@/components/common/ScryfallCardSearch';

/**
 * Reglas de MTG (Regla 702.124) para identificar compañeros legales.
 */
function getPartnerRequirement(card) {
  if (!card) return null;
  const oracle = (card.oracle_text || card.card_faces?.[0]?.oracle_text || '').toLowerCase();

  const partnerWith = oracle.match(/partner with ([^\n(.]+)/i);
  if (partnerWith) {
    const target = partnerWith[1].trim();
    return { type: 'PARTNER_WITH', label: `Partner con ${target}`, scryfallQuery: `!"${target}"` };
  }
  if (oracle.includes('friends forever')) {
    return { type: 'FRIENDS_FOREVER', label: 'Friends Forever', scryfallQuery: 'o:"friends forever" is:commander' };
  }
  if (oracle.includes('choose a background')) {
    return { type: 'BACKGROUND', label: 'Elegir un Trasfondo', scryfallQuery: 't:legendary t:background t:enchantment' };
  }
  if (oracle.includes("doctor's companion")) {
    return { type: 'DOCTOR', label: 'Doctor', scryfallQuery: 't:legendary t:"Time Lord" t:Doctor is:commander' };
  }
  const typeLine = (card.type_line || '').toLowerCase();
  if (typeLine.includes('time lord') && typeLine.includes('doctor')) {
    return { type: 'DOCTORS_COMPANION', label: "Doctor's Companion", scryfallQuery: 'o:"Doctor\'s companion" is:commander' };
  }
  if (/\bpartner\b/i.test(oracle) && !oracle.includes('partner with')) {
    return { type: 'PARTNER', label: 'Partner Libre', scryfallQuery: 'is:commander o:partner -o:"partner with"' };
  }
  return null;
}

export default function CreateDeckModal({ isOpen, onClose, currentDeckCount = 0, onDeckCreated }) {
  const [deckName, setDeckName] = useState('');
  const [format, setFormat] = useState('commander');
  const [archetype, setArchetype] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [selectedCommander, setSelectedCommander] = useState(null);
  const [isChangingCommander, setIsChangingCommander] = useState(false);
  const [selectedCoCommander, setSelectedCoCommander] = useState(null);
  const [isAddingCoCommander, setIsAddingCoCommander] = useState(false);

  const [initialCards, setInitialCards] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const partnerRule = useMemo(() => getPartnerRequirement(selectedCommander), [selectedCommander]);

  useEffect(() => {
    if (isOpen) {
      setDeckName('');
      setFormat('commander');
      setArchetype('');
      setDescription('');
      setIsPublic(true);
      setSelectedCommander(null);
      setSelectedCoCommander(null);
      setIsChangingCommander(false);
      setIsAddingCoCommander(false);
      setInitialCards([]);
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!partnerRule) {
      setSelectedCoCommander(null);
      setIsAddingCoCommander(false);
    }
  }, [partnerRule]);

  if (!isOpen) return null;

  const handleAddInitialCard = (card) => {
    setInitialCards((prev) => {
      const idx = prev.findIndex((item) => item.card.id === card.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [...prev, { card, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (cardId, delta) => {
    setInitialCards((prev) =>
      prev
        .map((item) => item.card.id === cardId ? { ...item, quantity: item.quantity + delta } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentDeckCount >= 10) {
      setErrorMsg('Límite de 10 mazos alcanzado.');
      return;
    }
    if (!deckName.trim()) {
      setErrorMsg('Ingresa un nombre para el mazo.');
      return;
    }
    if (format === 'commander' && !selectedCommander) {
      setErrorMsg('Debes asignar un comandante para el mazo EDH.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const commanderImageUrl = selectedCommander
        ? selectedCommander.image_uris?.art_crop ||
          selectedCommander.image_uris?.normal ||
          selectedCommander.card_faces?.[0]?.image_uris?.art_crop ||
          selectedCommander.card_faces?.[0]?.image_uris?.normal ||
          null
        : null;

      const createdDeck = await createDeckApi({
        name: deckName.trim(),
        format: format === 'commander' ? 'Commander' : format.toUpperCase(),
        description: [archetype.trim() && `Arquetipo: ${archetype.trim()}`, description.trim()].filter(Boolean).join(' | ') || undefined,
        is_public: isPublic,
        cover_image_url: commanderImageUrl || undefined,
      });

      const promises = [];
      if (format === 'commander' && selectedCommander?.id) {
        promises.push(addCardToDeckApi(createdDeck.id, { scryfall_card_id: selectedCommander.id, quantity: 1, category: 'commander' }));
      }
      if (format === 'commander' && selectedCoCommander?.id) {
        promises.push(addCardToDeckApi(createdDeck.id, { scryfall_card_id: selectedCoCommander.id, quantity: 1, category: 'commander' }));
      }
      for (const item of initialCards) {
        // Enviar 'mainboard' en lugar de 'main' para validar con el schema Pydantic
        promises.push(addCardToDeckApi(createdDeck.id, { scryfall_card_id: item.card.id, quantity: item.quantity, category: 'mainboard' }));
      }

      await Promise.all(promises);
      onDeckCreated?.(createdDeck);
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setErrorMsg(detail.map((d) => d.msg || JSON.stringify(d)).join(' | '));
      } else if (typeof detail === 'string') {
        setErrorMsg(detail);
      } else {
        setErrorMsg('Error registrando el mazo y sus cartas.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Encabezado */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Crear Nuevo Mazo</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Capacidad: {currentDeckCount} / 10 | Cartas asignadas: {(selectedCommander ? 1 : 0) + (selectedCoCommander ? 1 : 0) + initialCards.reduce((a, b) => a + b.quantity, 0)}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs scrollbar-thin scrollbar-thumb-neutral-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="create-deck-name" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
                Nombre del Mazo *
              </label>
              <input
                id="create-deck-name"
                name="deckName"
                type="text"
                placeholder="Ej. Mi Primer Comandante"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-deck-format" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
                Formato *
              </label>
              <select
                id="create-deck-format"
                name="deckFormat"
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value);
                  if (e.target.value !== 'commander') {
                    setSelectedCommander(null);
                    setSelectedCoCommander(null);
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 outline-none focus:border-amber-500 font-mono"
              >
                <option value="commander">Commander / EDH</option>
                <option value="modern">Modern</option>
                <option value="pioneer">Pioneer</option>
                <option value="standard">Standard</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create-deck-archetype" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Arquetipo o Estrategia
            </label>
            <input
              id="create-deck-archetype"
              name="deckArchetype"
              type="text"
              placeholder="Ej. Spellslinger / Storm / Voltron"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Selector de Privacidad Reutilizable */}
          <PrivacyToggle isPublic={isPublic} onChange={setIsPublic} />

          {/* Commander y Co-Commander */}
          {format === 'commander' && (
            <div className="space-y-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 block font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Comandante Principal *
                </span>
                {selectedCommander && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Asignado
                  </span>
                )}
              </div>

              {selectedCommander && !isChangingCommander ? (
                <div className="p-3 bg-neutral-900 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-14 bg-neutral-950 rounded overflow-hidden shrink-0 border border-neutral-700/60">
                      <img src={selectedCommander.image_uris?.small || selectedCommander.card_faces?.[0]?.image_uris?.small} alt={selectedCommander.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{selectedCommander.name}</h4>
                        <ManaCost costString={selectedCommander.mana_cost || ''} size="text-[11px]" />
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono truncate">{selectedCommander.type_line}</p>
                      {partnerRule && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Users className="w-2.5 h-2.5" /> {partnerRule.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => setIsChangingCommander(true)} className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition">
                      <RefreshCw className="w-3 h-3 text-amber-400" /> Cambiar
                    </button>
                    <button type="button" onClick={() => { setSelectedCommander(null); setSelectedCoCommander(null); }} className="p-1.5 bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-400 text-neutral-400 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <ScryfallCardSearch
                    id="deck-commander-search-input"
                    name="deckCommanderSearch"
                    placeholder="Buscar criatura legendaria o planeswalker..."
                    baseQuery="is:commander"
                    onSelectCard={(c) => {
                      setSelectedCommander(c);
                      setSelectedCoCommander(null);
                      setIsChangingCommander(false);
                    }}
                  />
                  {isChangingCommander && (
                    <button type="button" onClick={() => setIsChangingCommander(false)} className="text-[10px] font-mono text-neutral-400 hover:text-white">
                      Cancelar cambio
                    </button>
                  )}
                </div>
              )}

              {/* Co-Comandante Condicional */}
              {selectedCommander && partnerRule && (
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                      <Users className="w-3 h-3" /> Segundo Comandante ({partnerRule.label})
                    </span>
                    {!selectedCoCommander && !isAddingCoCommander && (
                      <button type="button" onClick={() => setIsAddingCoCommander(true)} className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition">
                        <Plus className="w-3 h-3" /> Agregar Co-Comandante
                      </button>
                    )}
                  </div>

                  {selectedCoCommander ? (
                    <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-11 bg-neutral-950 rounded overflow-hidden shrink-0 border border-neutral-800">
                          <img src={selectedCoCommander.image_uris?.small || selectedCoCommander.card_faces?.[0]?.image_uris?.small} alt={selectedCoCommander.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{selectedCoCommander.name}</span>
                            <ManaCost costString={selectedCoCommander.mana_cost || ''} size="text-[10px]" />
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono truncate block">{selectedCoCommander.type_line}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedCoCommander(null)} className="p-1 rounded bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-400 text-neutral-400 transition">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : isAddingCoCommander ? (
                    <div className="space-y-1.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Buscar compatible con {partnerRule.label}:</span>
                        <button type="button" onClick={() => setIsAddingCoCommander(false)} className="text-[10px] font-mono hover:text-white">Cancelar</button>
                      </div>
                      <ScryfallCardSearch
                        id="deck-cocommander-search-input"
                        name="deckCocommanderSearch"
                        placeholder={`Buscar ${partnerRule.label}...`}
                        baseQuery={partnerRule.scryfallQuery}
                        onSelectCard={(c) => {
                          if (c.id !== selectedCommander.id) {
                            setSelectedCoCommander(c);
                            setIsAddingCoCommander(false);
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Cartas Iniciales */}
          <div className="space-y-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 block font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Agregar Cartas Iniciales (Opcional)
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {initialCards.reduce((a, b) => a + b.quantity, 0)} añadidas
              </span>
            </div>

            <ScryfallCardSearch
              id="deck-initial-cards-search-input"
              name="deckInitialCardsSearch"
              placeholder="Buscar cartas para incluir en el mazo..."
              onSelectCard={handleAddInitialCard}
              renderItemExtra={() => (
                <span className="p-1 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-neutral-950 transition">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              )}
            />

            {initialCards.length > 0 && (
              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-neutral-700">
                {initialCards.map(({ card, quantity }) => (
                  <div key={card.id} className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-amber-500 text-xs shrink-0">{quantity}x</span>
                      <span className="font-semibold text-neutral-200 truncate">{card.name}</span>
                      <ManaCost costString={card.mana_cost || ''} size="text-[10px]" />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => handleUpdateQuantity(card.id, -1)} className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition">
                        <Minus className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => handleUpdateQuantity(card.id, 1)} className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button type="button" onClick={() => handleUpdateQuantity(card.id, -quantity)} className="p-1 rounded bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-400 text-neutral-400 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create-deck-description" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Notas Adicionales
            </label>
            <textarea
              id="create-deck-description"
              name="deckDescription"
              rows={2}
              placeholder="Objetivos del mazo, combos clave o presupuesto estimado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 resize-none transition"
            />
          </div>
        </form>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Validación oficial de reglas MTG</span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={currentDeckCount >= 10 || isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg active:scale-95"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar y Crear Mazo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
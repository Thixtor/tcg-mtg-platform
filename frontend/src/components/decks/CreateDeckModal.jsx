// ---------------------------------------------------------
// MODAL: CREACIÓN Y REGISTRO DE NUEVO MAZO (CON PRIVACIDAD)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Search, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Layers,
  Globe,
  Lock
} from 'lucide-react';
import { createDeckApi, addCardToDeckApi } from '@/api/decks.api';

export default function CreateDeckModal({ isOpen, onClose, currentDeckCount = 0, onDeckCreated }) {
  const [deckName, setDeckName] = useState('');
  const [format, setFormat] = useState('commander');
  const [archetype, setArchetype] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  const [commanderSearch, setCommanderSearch] = useState('');
  const [commanderResults, setCommanderResults] = useState([]);
  const [selectedCommander, setSelectedCommander] = useState(null);
  const [isSearchingCommander, setIsSearchingCommander] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDeckName('');
      setFormat('commander');
      setArchetype('');
      setDescription('');
      setIsPublic(true);
      setCommanderSearch('');
      setCommanderResults([]);
      setSelectedCommander(null);
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (format !== 'commander' || commanderSearch.trim().length < 3) {
      setCommanderResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCommander(true);
      try {
        const query = encodeURIComponent(`is:commander ${commanderSearch.trim()}`);
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`);
        if (res.ok) {
          const data = await res.json();
          setCommanderResults(data.data?.slice(0, 6) || []);
        } else {
          setCommanderResults([]);
        }
      } catch (err) {
        console.error('Error buscando comandante en Scryfall:', err);
      } finally {
        setIsSearchingCommander(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [commanderSearch, format]);

  if (!isOpen) return null;

  const isLimitReached = currentDeckCount >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLimitReached) {
      setErrorMsg('Has alcanzado el límite máximo permitido de 10 mazos.');
      return;
    }
    if (!deckName.trim()) {
      setErrorMsg('Debes ingresar un nombre para el mazo.');
      return;
    }
    if (format === 'commander' && !selectedCommander) {
      setErrorMsg('Selecciona un comandante válido para el mazo EDH.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const fullDescription = [
        archetype.trim() ? `Arquetipo: ${archetype.trim()}` : null,
        description.trim() ? description.trim() : null
      ].filter(Boolean).join(' | ');

      // 1. Guardar mazo en backend incluyendo flag de privacidad
      const createdDeck = await createDeckApi({
        name: deckName.trim(),
        format: format === 'commander' ? 'Commander' : format.toUpperCase(),
        description: fullDescription || undefined,
        is_public: isPublic
      });

      // 2. Si es Commander, agregar el comandante seleccionado al mazo
      if (format === 'commander' && selectedCommander?.id) {
        try {
          await addCardToDeckApi(createdDeck.id, {
            scryfall_card_id: selectedCommander.id,
            quantity: 1,
            category: 'commander'
          });
        } catch (cardErr) {
          console.warn('El mazo se creó, pero la carta de comandante no pudo registrarse automáticamente:', cardErr);
        }
      }

      onDeckCreated?.(createdDeck);
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error al crear el mazo en el servidor.';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Crear Nuevo Mazo</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Capacidad: {currentDeckCount} / 10 mazos asignados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
                Nombre del Mazo *
              </label>
              <input
                type="text"
                placeholder="Ej. Urza Thopter Foundry Combo"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
                Formato *
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
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
            <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Arquetipo o Estrategia
            </label>
            <input
              type="text"
              placeholder="Ej. Spellslinger / Storm / Voltron / Control"
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Control de Visibilidad y Privacidad */}
          <div className="space-y-2 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-300 font-bold block">
                  Visibilidad en la Comunidad
                </span>
                <span className="text-[11px] text-neutral-400">
                  {isPublic 
                    ? 'Visible en tu perfil público y disponible para que otros jugadores lo exploren o clonen.' 
                    : 'Privado. Solo tú podrás ver y editar esta baraja.'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isPublic 
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Público</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    !isPublic 
                      ? 'bg-neutral-800 text-white font-bold shadow-xs' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privado</span>
                </button>
              </div>
            </div>
          </div>

          {format === 'commander' && (
            <div className="space-y-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-amber-500 block font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Seleccionar Comandante *
                </label>
                {selectedCommander && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Asignado: {selectedCommander.name}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar criatura legendaria o planeswalker..."
                  value={commanderSearch}
                  onChange={(e) => setCommanderSearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
                />
              </div>

              {isSearchingCommander && (
                <div className="text-center py-3 text-neutral-500 font-mono text-[11px]">
                  Consultando base de datos oficial de Scryfall...
                </div>
              )}

              {commanderResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {commanderResults.map((card) => {
                    const imgUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
                    const isSelected = selectedCommander?.id === card.id;

                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedCommander(card)}
                        className={`group cursor-pointer rounded-lg border p-1.5 transition flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                        }`}
                      >
                        <div className="w-full aspect-[2.5/3.5] rounded overflow-hidden bg-neutral-950 relative">
                          <img src={imgUrl} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          {isSelected && (
                            <span className="absolute top-1 right-1 bg-amber-500 text-neutral-950 p-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-neutral-200 text-center truncate w-full">
                          {card.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Objetivos del mazo, combos clave o presupuesto estimado..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 resize-none transition"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Registro oficial en base de datos</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLimitReached || isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/10 active:scale-95"
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
// ---------------------------------------------------------
// COMPONENTE: MODAL CREAR PUBLICACIÓN DE TRADE SOCIAL
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, Plus, Search, Sparkles, Send } from 'lucide-react';

export default function CreateTradePostModal({
  isOpen,
  onClose,
  userTradeList = [],
  onSubmit,
}) {
  const [wantedName, setWantedName] = useState('');
  const [wantedList, setWantedList] = useState([]);
  const [selectedOffered, setSelectedOffered] = useState([]);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleAddWanted = (e) => {
    e.preventDefault();
    if (!wantedName.trim()) return;
    setWantedList((prev) => [
      ...prev,
      {
        name: wantedName.trim(),
        condition: 'NM o mejor',
        edition: 'Cualquier edición',
        image_url: 'https://cards.scryfall.io/back.png'
      }
    ]);
    setWantedName('');
  };

  const handleToggleOffered = (card) => {
    setSelectedOffered((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      return exists ? prev.filter((c) => c.id !== card.id) : [...prev, card];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (wantedList.length === 0 || selectedOffered.length === 0) {
      alert('Debes indicar al menos una carta que buscas y una que ofreces.');
      return;
    }

    onSubmit?.({
      wanted_cards: wantedList,
      offered_cards: selectedOffered,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-xs">
      <div className="w-full max-w-2xl bg-[#121118] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-[#181622] border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Nueva Publicación de Trade
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          
          {/* 1. ¿QUÉ BUSCAS? */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              1. Cartas que buscas (Wishlist)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={wantedName}
                onChange={(e) => setWantedName(e.target.value)}
                placeholder="Ej: Rhystic Study, Ancient Tomb..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddWanted}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Añadir
              </button>
            </div>

            {wantedList.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {wantedList.map((w, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                    {w.name}
                    <button type="button" onClick={() => setWantedList(wantedList.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-white">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. ¿QUÉ OFRECES? (De tu Trade List) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
              2. Selecciona qué ofreces de tu Trade List ({selectedOffered.length} seleccionadas)
            </label>

            {userTradeList.length === 0 ? (
              <p className="text-neutral-500 text-[10px] italic">
                No tienes cartas marcadas para trade. Visita tus Colecciones para añadirlas.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1">
                {userTradeList.map((card) => {
                  const isSelected = selectedOffered.some((c) => c.id === card.id);
                  return (
                    <div
                      key={card.id}
                      onClick={() => handleToggleOffered(card)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition flex items-center gap-2 ${
                        isSelected
                          ? 'bg-purple-900/40 border-purple-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="truncate flex-1 font-bold text-[11px]">{card.name || card.card_name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. NOTAS ADICIONALES */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              3. Notas o condiciones de intercambio
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Intercambios presenciales en Dragon Hobby Bello o Estadio. Acepto contraofertas."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar en Trade Wall</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
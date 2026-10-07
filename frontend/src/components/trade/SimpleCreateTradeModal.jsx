// ---------------------------------------------------------
// COMPONENTE: MODAL SIMPLE DE CREAR CAMBIO DIRECTO
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, Search, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '@/api/client';

export default function SimpleCreateTradeModal({
  isOpen,
  onClose,
  currentUserTradeCards = [],
  onTradeCreated,
}) {
  const [step, setStep] = useState(1); // Paso 1: Ofrecer, Paso 2: Buscar
  const [selectedOfferCards, setSelectedOfferCards] = useState([]);
  
  const [wantedInput, setWantedInput] = useState('');
  const [wantedCards, setWantedCards] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleOffer = (card) => {
    setSelectedOfferCards((prev) =>
      prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card]
    );
  };

  const handleAddWanted = (e) => {
    e.preventDefault();
    if (!wantedInput.trim()) return;
    setWantedCards([...wantedCards, { name: wantedInput.trim(), condition: 'NM o mejor' }]);
    setWantedInput('');
  };

  const handleSubmit = async () => {
    if (selectedOfferCards.length === 0 || wantedCards.length === 0) {
      alert('Debes indicar qué cartas ofreces y cuáles buscas a cambio.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        offered_cards: selectedOfferCards.map((c) => ({
          name: c.card_catalog?.name || c.name,
          scryfall_id: c.scryfall_card_id || c.scryfall_id,
          condition: c.condition || 'NM',
          is_foil: Boolean(c.is_foil),
          image_url: c.card_catalog?.image_url || c.image_url,
          market_price_usd: parseFloat(c.price_usd || 0),
        })),
        wanted_cards: wantedCards.map((w) => ({
          name: w.name,
          condition: w.condition,
          is_foil: false,
        })),
        notes: 'Intercambio presencial local.',
        location: 'Medellín / Bello',
        accepts_cash: true,
        preferred_usd_rate: 3200,
      };

      await api.post('/trade/posts', payload);
      onTradeCreated?.();
      onClose();
    } catch (err) {
      alert('Error creando la publicación: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-xs">
      <div className="w-full max-w-xl bg-[#121118] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#181622] border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {step === 1 ? '1. ¿Qué quieres ofrecer? (De tu inventario)' : '2. ¿Qué buscas a cambio?'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-neutral-400 text-[11px]">
                Selecciona las cartas que tienes disponibles para trade en tu colección:
              </p>

              {currentUserTradeCards.length === 0 ? (
                <div className="py-8 text-center text-neutral-500 italic">
                  No tienes cartas marcadas como "Disponible para Trade" en tus colecciones.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {currentUserTradeCards.map((c) => {
                    const isSelected = selectedOfferCards.some((item) => item.id === c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleOffer(c)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-900/40 border-purple-500 text-white'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="truncate font-bold text-xs">{c.card_catalog?.name || c.name}</span>
                        <span className="text-[10px] text-neutral-500 shrink-0 font-bold">{c.quantity || 1}x</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  disabled={selectedOfferCards.length === 0}
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <span>Continuar ({selectedOfferCards.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <form onSubmit={handleAddWanted} className="flex gap-2">
                <input
                  type="text"
                  value={wantedInput}
                  onChange={(e) => setWantedInput(e.target.value)}
                  placeholder="Nombre de la carta que buscas (ej: Rhystic Study)..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  Añadir
                </button>
              </form>

              {wantedCards.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wantedCards.map((w, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                      {w.name}
                      <button type="button" onClick={() => setWantedCards(wantedCards.filter((_, i) => i !== idx))} className="text-neutral-400 hover:text-white">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-neutral-400 hover:text-white"
                >
                  ← Volver a cartas
                </button>

                <button
                  type="button"
                  disabled={submitting || wantedCards.length === 0}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  {submitting ? 'Publicando...' : 'Publicar Cambio'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
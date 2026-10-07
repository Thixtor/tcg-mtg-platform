// ---------------------------------------------------------
// COMPONENTE: MODAL PARA PUBLICAR OFERTA EN EL BLACK MARKET
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, Search, CheckCircle2, ArrowRight, Flame, Heart, Plus, Sparkles, Loader2 } from 'lucide-react';
import { createTradePostApi } from '@/api/trade';

export default function SimpleCreateTradeModal({
  isOpen,
  onClose,
  currentUserTradeCards = [],
  wishlistCards = [],
  onTradeCreated,
}) {
  const [step, setStep] = useState(1); // 1: Ofrecer, 2: Pedir
  const [selectedOfferCards, setSelectedOfferCards] = useState([]);
  
  const [wantedInput, setWantedInput] = useState('');
  const [wantedCards, setWantedCards] = useState([]);
  const [location, setLocation] = useState('Medellín / Bello (Dragon Hobby)');
  const [notes, setNotes] = useState('Intercambio presencial local. Cotejo precios TCG Market.');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleOffer = (card) => {
    setSelectedOfferCards((prev) =>
      prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card]
    );
  };

  const handleAddWanted = (e) => {
    e?.preventDefault?.();
    if (!wantedInput.trim()) return;
    setWantedCards((prev) => [...prev, { name: wantedInput.trim(), condition: 'NM o mejor' }]);
    setWantedInput('');
  };

  const handleImportFromWishlist = () => {
    if (!wishlistCards.length) return;
    const imported = wishlistCards.map((item) => ({
      name: item.card_catalog?.name || item.name || 'Carta MTG',
      condition: 'NM o mejor',
      is_foil: false
    }));
    
    // Evitar duplicados por nombre
    setWantedCards((prev) => {
      const existingNames = new Set(prev.map((c) => c.name.toLowerCase()));
      const filtered = imported.filter((imp) => !existingNames.has(imp.name.toLowerCase()));
      return [...prev, ...filtered];
    });
  };

  const handleSubmit = async () => {
    if (selectedOfferCards.length === 0 || wantedCards.length === 0) {
      alert('Debes indicar al menos una carta para ofrecer y una que busques a cambio.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        offered_cards: selectedOfferCards.map((c) => ({
          name: c.card_catalog?.name || c.name,
          scryfall_id: c.scryfall_card_id || c.scryfall_id || c.id,
          condition: c.condition || 'NM',
          is_foil: Boolean(c.is_foil),
          image_url: c.card_catalog?.image_url || c.image_url,
          market_price_usd: parseFloat(c.price_usd || c.price || 0),
        })),
        wanted_cards: wantedCards.map((w) => ({
          name: w.name,
          condition: w.condition || 'NM',
          is_foil: false,
        })),
        notes: notes.trim(),
        location: location.trim(),
        accepts_cash: true,
        preferred_usd_rate: 3200,
      };

      await createTradePostApi(payload);
      onTradeCreated?.();
      onClose();
    } catch (err) {
      console.error('[SimpleCreateTradeModal] Error publicando trade:', err);
      alert('Error creando la publicación: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-xs">
      <div className="w-full max-w-xl bg-[#121118] border border-[#2A2733] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-[#181622] border-b border-[#2A2733] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#E88B00]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {step === 1 ? '1. ¿Qué cartas ofreces? (Tu inventario)' : '2. ¿Qué buscas a cambio?'}
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          
          {step === 1 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-neutral-400 text-[11px]">
                  Cartas disponibles para trade en tus binders:
                </p>
                <span className="text-[#E88B00] font-bold text-[10px]">
                  {selectedOfferCards.length} seleccionada(s)
                </span>
              </div>

              {currentUserTradeCards.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-[#2A2733] rounded-2xl p-4 text-neutral-500 space-y-2">
                  <p className="italic">No tienes cartas con la casilla "Disponible para Trade" en tus colecciones.</p>
                  <p className="text-[10px] text-neutral-400">
                    Marca cartas como "Para Trade" en tu colección o agrégalas desde el menú de tus binders.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {currentUserTradeCards.map((c) => {
                    const isSelected = selectedOfferCards.some((item) => item.id === c.id);
                    const cardName = c.card_catalog?.name || c.name || 'Carta MTG';
                    const price = c.price_usd || c.price || 0;

                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleOffer(c)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#E88B00]/15 border-[#E88B00] text-white'
                            : 'bg-[#181622] border-[#2A2733] text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="truncate block font-bold text-xs">{cardName}</span>
                          <span className="text-[10px] text-neutral-500">{c.condition || 'NM'}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-emerald-400 font-bold block">
                            ${parseFloat(price).toFixed(2)}
                          </span>
                          <span className="text-[9px] text-neutral-500">{c.quantity || 1}x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-[#242129]">
                <button
                  type="button"
                  disabled={selectedOfferCards.length === 0}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#E88B00]/10 transition"
                >
                  <span>Continuar ({selectedOfferCards.length})</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Opción rápida: importar desde Wishlist */}
              {wishlistCards.length > 0 && (
                <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Tienes {wishlistCards.length} cartas en tu Wishlist</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportFromWishlist}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Importar todas
                  </button>
                </div>
              )}

              {/* Formulario de entrada manual */}
              <form onSubmit={handleAddWanted} className="flex gap-2">
                <input
                  type="text"
                  value={wantedInput}
                  onChange={(e) => setWantedInput(e.target.value)}
                  placeholder="Nombre de la carta que buscas (ej: Rhystic Study)..."
                  className="flex-1 bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-2 text-white outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase rounded-xl cursor-pointer"
                >
                  Añadir
                </button>
              </form>

              {/* Lista de cartas que busca */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                  Cartas que buscas ({wantedCards.length}):
                </span>
                {wantedCards.length === 0 ? (
                  <p className="text-[11px] text-neutral-600 italic">Escribe qué buscas o impórtalo de tu Wishlist.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                    {wantedCards.map((w, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 flex items-center gap-2 text-xs"
                      >
                        <span>• {w.name}</span>
                        <button
                          type="button"
                          onClick={() => setWantedCards(wantedCards.filter((_, i) => i !== idx))}
                          className="text-neutral-400 hover:text-white cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Ubicación y Notas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold block">Punto de Encuentro / LGS</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold block">Condiciones o Notas</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#242129]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-neutral-400 hover:text-white font-bold cursor-pointer"
                >
                  ← Volver a cartas
                </button>

                <button
                  type="button"
                  disabled={submitting || wantedCards.length === 0}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider cursor-pointer shadow-lg shadow-[#E88B00]/10 flex items-center gap-2 transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Publicando...' : 'Publicar Oferta en Trade Wall'}</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
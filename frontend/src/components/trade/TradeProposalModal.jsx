// ---------------------------------------------------------
// COMPONENTE: MODAL PARA PROPONER INTERCAMBIO Y AJUSTE COP
// ---------------------------------------------------------
import React, { useState, useMemo } from 'react';
import { X, ArrowLeftRight, DollarSign, Send, CheckCircle2 } from 'lucide-react';
import api from '@/api/client';

export default function TradeProposalModal({
  isOpen,
  onClose,
  targetPost,
  currentUserInventory = [],
  onProposalSuccess,
}) {
  const [selectedOfferedCards, setSelectedOfferedCards] = useState([]);
  const [selectedRequestedCards, setSelectedRequestedCards] = useState([]);
  const [cashAdjustmentCop, setCashAdjustmentCop] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tasa de cambio acordada (por defecto 3.200 COP por USD)
  const usdRate = targetPost?.preferred_usd_rate || 3200;

  // Cálculo de totales en USD
  const offeredTotalUsd = useMemo(() => {
    return selectedOfferedCards.reduce((acc, c) => acc + (parseFloat(c.price_usd || c.price || 0) * (c.quantity || 1)), 0);
  }, [selectedOfferedCards]);

  const requestedTotalUsd = useMemo(() => {
    return selectedRequestedCards.reduce((acc, c) => acc + (parseFloat(c.price_usd || c.price || 0) * (c.quantity || 1)), 0);
  }, [selectedRequestedCards]);

  const diffUsd = offeredTotalUsd - requestedTotalUsd;

  // Sugerencia automática de compensación en COP
  const suggestedCop = useMemo(() => {
    if (Math.abs(diffUsd) < 0.1) return 0;
    return Math.round(Math.abs(diffUsd) * usdRate);
  }, [diffUsd, usdRate]);

  if (!isOpen || !targetPost) return null;

  const handleToggleOffered = (card) => {
    setSelectedOfferedCards((prev) => 
      prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card]
    );
  };

  const handleToggleRequested = (card) => {
    setSelectedRequestedCards((prev) => 
      prev.some((c) => (c.scryfall_id || c.name) === (card.scryfall_id || card.name))
        ? prev.filter((c) => (c.scryfall_id || c.name) !== (card.scryfall_id || card.name))
        : [...prev, card]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedOfferedCards.length === 0 && selectedRequestedCards.length === 0) {
      alert('Debes seleccionar al menos una carta para intercambiar.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        receiver_id: targetPost.author?.id || targetPost.author_id,
        offered_card_ids: selectedOfferedCards.map((c) => c.id),
        requested_cards: selectedRequestedCards,
        cash_amount: cashAdjustmentCop || suggestedCop,
        cash_currency: 'COP',
        notes: notes.trim(),
      };

      await api.post('/trade/proposals', payload);
      onProposalSuccess?.();
      onClose();
    } catch (err) {
      alert('Error enviando la propuesta: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-xs">
      <div className="w-full max-w-2xl bg-[#121118] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-[#181622] border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Proponer Cambio a @{targetPost.author?.username || targetPost.author_username}
            </h3>
            <span className="text-[10px] text-neutral-400">
              Ubicación: {targetPost.location || 'Local LGS'} • Tasa de referencia: 1 USD = ${usdRate.toLocaleString('es-CO')} COP
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. SELECCIONA QUÉ OFRECES (De tu inventario físico disponible) */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">
                Tú Ofreces ({selectedOfferedCards.length}):
              </span>

              {currentUserInventory.length === 0 ? (
                <p className="text-neutral-500 text-[10px] py-4 text-center">
                  No tienes cartas marcadas para trade en tu colección.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {currentUserInventory.map((item) => {
                    const isSelected = selectedOfferedCards.some((c) => c.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleOffered(item)}
                        className={`p-2 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-900/40 border-purple-500 text-white'
                            : 'bg-neutral-900/40 border-neutral-800/80 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <span className="truncate font-bold text-[11px]">{item.card_catalog?.name || item.name}</span>
                        <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                          ${parseFloat(item.price_usd || item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-2 border-t border-neutral-800 flex justify-between text-neutral-400 text-[10px]">
                <span>Total ofrecido:</span>
                <span className="text-emerald-400 font-bold">${offeredTotalUsd.toFixed(2)} USD</span>
              </div>
            </div>

            {/* 2. SELECCIONA QUÉ RECIBES (De lo que ofrece el usuario) */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Tú Recibes ({selectedRequestedCards.length}):
              </span>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(targetPost.offered_cards || []).map((card, i) => {
                  const cardId = card.scryfall_id || card.name || i;
                  const isSelected = selectedRequestedCards.some((c) => (c.scryfall_id || c.name) === cardId);
                  return (
                    <div
                      key={cardId}
                      onClick={() => handleToggleRequested(card)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-neutral-900/40 border-neutral-800/80 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="truncate font-bold text-[11px]">{card.name}</span>
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                        ${parseFloat(card.price_usd || card.market_price_usd || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-neutral-800 flex justify-between text-neutral-400 text-[10px]">
                <span>Total solicitado:</span>
                <span className="text-emerald-400 font-bold">${requestedTotalUsd.toFixed(2)} USD</span>
              </div>
            </div>

          </div>

          {/* BALANCE ECONÓMICO Y DINERO EN EFECTIVO (COP) */}
          <div className="p-3.5 rounded-2xl bg-[#1A1824] border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-bold">Diferencia de valor (USD):</span>
              <span className={`font-bold ${diffUsd >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diffUsd >= 0 ? `+ $${diffUsd.toFixed(2)}` : `- $${Math.abs(diffUsd).toFixed(2)}`} USD
              </span>
            </div>

            {suggestedCop > 0 && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] flex items-center justify-between">
                <span className="text-neutral-300">
                  {diffUsd < 0 
                    ? `Debes compensar en efectivo aprox:` 
                    : `La contraparte debe compensar aprox:`}
                </span>
                <span className="font-bold text-amber-400 text-xs font-mono">
                  ${suggestedCop.toLocaleString('es-CO')} COP
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
              Mensaje o nota para el intercambio
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Puedo encontrarte hoy en Dragon Hobby Bello para hacer el trade."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Enviando...' : 'Enviar Propuesta'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
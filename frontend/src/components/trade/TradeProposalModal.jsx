// ============================================================================
// COMPONENTE: MODAL DE PROPUESTA P2P CON TASA EDITABLE Y BALANCE AUTOMÁTICO
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Cálculo reactivo del valor de cartas solicitadas con fallback de precios.
// - Tasa USD/COP con step de 100, permitiendo escribir libremente desde 0.
// - Cálculo automático de la compensación monetaria en COP y USD.
// - Soporta compra directa en efectivo cuando no se ofrecen cartas de binders.
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ArrowLeftRight, 
  Send, 
  Loader2, 
  Banknote, 
  AlertCircle, 
  CheckSquare, 
  Square,
  RotateCcw
} from 'lucide-react';
import { createTradeProposalApi } from '@/api/trade';

export default function TradeProposalModal({
  isOpen,
  onClose,
  targetPost,
  currentUserInventory = [],
  onProposalSuccess,
}) {
  const postOfferedCards = targetPost?.offered_cards || [];
  const baseRate = Number(targetPost?.preferred_usd_rate || 3200);

  // Estados de selección de cartas
  const [selectedOfferedCards, setSelectedOfferedCards] = useState([]);
  const [selectedRequestedCards, setSelectedRequestedCards] = useState([]);
  
  // Tasa de cambio editable por el usuario (soporta edición libre desde 0)
  const [currentUsdRate, setCurrentUsdRate] = useState(String(baseRate));
  
  // Precios cacheados o completados dinámicamente si vienen en 0
  const [cardPricesCache, setCardPricesCache] = useState({});

  // Efectivo y notas
  const [cashAdjustmentCop, setCashAdjustmentCop] = useState(0);
  const [customCashInput, setCustomCashInput] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Inicialización al abrir
  useEffect(() => {
    if (isOpen && targetPost) {
      const initialRate = Number(targetPost.preferred_usd_rate || 3200);
      setCurrentUsdRate(String(initialRate));
      setSelectedRequestedCards([...postOfferedCards]); // Preseleccionar todas por defecto
      setSelectedOfferedCards([]);
      setCustomCashInput('');
      setFormError(null);

      // Si alguna carta tiene precio en 0, consultar Scryfall para rescatar su valor real
      postOfferedCards.forEach((c) => {
        const rawPrice = parseFloat(c.price_usd || c.market_price_usd || c.price || 0);
        const cardKey = c.scryfall_id || c.scryfall_card_id || c.name;
        if (rawPrice <= 0 && cardKey) {
          fetchCardPrice(c);
        }
      });
    }
  }, [isOpen, targetPost]);

  // Consulta auxiliar a Scryfall para cartas que vengan sin cotización guardada
  const fetchCardPrice = async (card) => {
    try {
      const query = card.scryfall_id || card.scryfall_card_id 
        ? `https://api.scryfall.com/cards/${card.scryfall_id || card.scryfall_card_id}`
        : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}`;
      
      const res = await fetch(query);
      if (res.ok) {
        const data = await res.json();
        const foundPrice = parseFloat(data.prices?.usd || data.prices?.usd_foil || 0);
        if (foundPrice > 0) {
          const cardKey = card.scryfall_id || card.scryfall_card_id || card.name;
          setCardPricesCache((prev) => ({ ...prev, [cardKey]: foundPrice }));
        }
      }
    } catch {
      // Si falla, se mantiene el fallback original
    }
  };

  // Helper para obtener precio seguro de una carta
  const getCardPrice = (card) => {
    const cardKey = card.scryfall_id || card.scryfall_card_id || card.name;
    if (cardPricesCache[cardKey] !== undefined) {
      return cardPricesCache[cardKey];
    }
    return parseFloat(card.price_usd || card.market_price_usd || card.price || 0);
  };

  const parsedUsdRate = useMemo(() => {
    const val = Number(currentUsdRate);
    return isNaN(val) || val <= 0 ? 0 : val;
  }, [currentUsdRate]);

  // 1. Total solicitado (lo que vas a recibir del post)
  const requestedTotalUsd = useMemo(() => {
    return selectedRequestedCards.reduce((acc, c) => {
      const price = getCardPrice(c);
      const qty = c.quantity || 1;
      return acc + (price * qty);
    }, 0);
  }, [selectedRequestedCards, cardPricesCache]);

  const requestedTotalCop = Math.round(requestedTotalUsd * parsedUsdRate);

  // 2. Total ofrecido (tus cartas a cambio)
  const offeredTotalUsd = useMemo(() => {
    return selectedOfferedCards.reduce((acc, c) => {
      const price = parseFloat(c.price_usd || c.price || c.market_price_usd || 0);
      const qty = c.quantity || 1;
      return acc + (price * qty);
    }, 0);
  }, [selectedOfferedCards]);

  const offeredTotalCop = Math.round(offeredTotalUsd * parsedUsdRate);

  // 3. Balance neto (Diferencia = Solicitado - Ofrecido)
  const diffUsd = requestedTotalUsd - offeredTotalUsd;
  const isDirectCashPurchase = selectedOfferedCards.length === 0;

  const suggestedDifferenceCop = useMemo(() => {
    if (requestedTotalUsd === 0) return 0;
    if (isDirectCashPurchase) return requestedTotalCop;
    if (diffUsd <= 0) return 0;
    return Math.round(diffUsd * parsedUsdRate);
  }, [diffUsd, requestedTotalCop, isDirectCashPurchase, requestedTotalUsd, parsedUsdRate]);

  // Actualizar sugerido automático si no se ha escrito manualmente
  useEffect(() => {
    if (customCashInput === '') {
      setCashAdjustmentCop(suggestedDifferenceCop);
    }
  }, [suggestedDifferenceCop, customCashInput]);

  if (!isOpen || !targetPost) return null;

  const handleToggleOffered = (card) => {
    setFormError(null);
    setSelectedOfferedCards((prev) => 
      prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card]
    );
  };

  const handleToggleRequested = (card) => {
    setFormError(null);
    const cardId = card.scryfall_id || card.scryfall_card_id || card.name;
    setSelectedRequestedCards((prev) => 
      prev.some((c) => (c.scryfall_id || c.scryfall_card_id || c.name) === cardId)
        ? prev.filter((c) => (c.scryfall_id || c.scryfall_card_id || c.name) !== cardId)
        : [...prev, card]
    );
  };

  const handleSelectAllRequested = () => {
    if (selectedRequestedCards.length === postOfferedCards.length) {
      setSelectedRequestedCards([]);
    } else {
      setSelectedRequestedCards([...postOfferedCards]);
    }
  };

  const handleApplyExactCash = () => {
    setCustomCashInput(String(suggestedDifferenceCop));
    setCashAdjustmentCop(suggestedDifferenceCop);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (selectedRequestedCards.length === 0) {
      setFormError('Debes seleccionar al menos una carta que te interese recibir.');
      return;
    }

    const finalCash = customCashInput !== '' ? Number(customCashInput) : cashAdjustmentCop;

    if (selectedOfferedCards.length === 0 && finalCash <= 0) {
      setFormError('Si no vas a entregar cartas a cambio, debes indicar el monto en efectivo a pagar.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        receiver_id: targetPost.author?.id || targetPost.author_id,
        post_id: targetPost.id,
        offered_card_ids: selectedOfferedCards.map((c) => c.id),
        requested_cards: selectedRequestedCards.map((c) => ({
          name: c.name,
          scryfall_id: c.scryfall_id || c.scryfall_card_id,
          condition: c.condition || 'NM',
          price_usd: getCardPrice(c),
          quantity: c.quantity || 1
        })),
        cash_amount: finalCash,
        cash_currency: 'COP',
        notes: notes.trim(),
        preferred_usd_rate: parsedUsdRate || 3200
      };

      await createTradeProposalApi(payload);
      onProposalSuccess?.();
      onClose();
    } catch (err) {
      console.error('[TradeProposalModal] Error enviando propuesta:', err);
      setFormError(err.response?.data?.detail || err.message || 'Error al enviar la propuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono text-xs">
      <div className="w-full max-w-4xl bg-[#121118] border border-[#2A2733] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* 1. Header con Información y Editor de Tasa */}
        <div className="px-6 py-4 bg-[#181622] border-b border-[#2A2733] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#E88B00]" />
              <span>Proponer Intercambio a @{targetPost.author?.username || 'Usuario'}</span>
            </h3>
            <span className="text-[10px] text-neutral-400 mt-0.5 block">
              {targetPost.location || 'Local LGS'} • {postOfferedCards.length} carta{postOfferedCards.length > 1 ? 's' : ''} disponible{postOfferedCards.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Selector de Tasa de Cambio (COP / 1 USD): De 100 en 100 y digitable desde 0 */}
          <div className="flex items-center gap-2 bg-[#121118] px-3 py-1.5 rounded-2xl border border-white/10">
            <span className="text-[#E88B00] font-bold text-xs">🪙 1 USD =</span>
            <div className="flex items-center gap-1">
              <span className="text-neutral-500">$</span>
              <input
                type="number"
                step="100"
                min="0"
                value={currentUsdRate}
                onChange={(e) => setCurrentUsdRate(e.target.value)}
                onBlur={() => {
                  if (currentUsdRate === '' || Number(currentUsdRate) < 0) {
                    setCurrentUsdRate('0');
                  }
                }}
                className="w-24 bg-[#1A1824] border border-[#2A2733] focus:border-[#E88B00] rounded-lg px-2 py-1 text-white font-bold text-center outline-none text-xs"
                title="Ajuste de tasa COP/USD (usa las flechas para subir/bajar de 100 en 100)"
              />
              <span className="text-neutral-400 text-[10px]">COP</span>
            </div>
            {Number(currentUsdRate) !== baseRate && (
              <button
                type="button"
                onClick={() => setCurrentUsdRate(String(baseRate))}
                className="text-neutral-400 hover:text-white p-1 rounded-md transition cursor-pointer"
                title={`Restablecer a tasa original del post (${baseRate} COP)`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer ml-auto sm:ml-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación de Error */}
        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block">Revisa lo siguiente:</span>
              <span>{formError}</span>
            </div>
            <button onClick={() => setFormError(null)} className="text-rose-400 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* 2. Columnas Comparativas: Cartas Solicitadas vs Cartas Ofrecidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* PANEL IZQUIERDO: CARTAS QUE SOLICITAS RECIBIR */}
            <div className="p-4 rounded-2xl bg-[#181622] border border-sky-500/30 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                    1. Solicitas recibir ({selectedRequestedCards.length}):
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllRequested}
                    className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                  >
                    {selectedRequestedCards.length === postOfferedCards.length ? 'Desmarcar todo' : 'Elegir todo'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {postOfferedCards.map((card, i) => {
                    const cardId = card.scryfall_id || card.scryfall_card_id || card.name || i;
                    const isSelected = selectedRequestedCards.some((c) => (c.scryfall_id || c.scryfall_card_id || c.name) === cardId);
                    const price = getCardPrice(card);
                    const img = card.image_url || card.card_catalog?.image_url;

                    return (
                      <div
                        key={cardId}
                        onClick={() => handleToggleRequested(card)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-500 text-white'
                            : 'bg-black/30 border-[#2A2733] text-neutral-400 hover:border-neutral-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-600 shrink-0" />
                          )}
                          {img ? (
                            <img src={img} alt={card.name} className="w-7 h-10 object-cover rounded-lg shrink-0 shadow" />
                          ) : (
                            <div className="w-7 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[7px] text-neutral-600 shrink-0">
                              MTG
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="truncate block font-bold text-xs">{card.name}</span>
                            <span className="text-[10px] text-neutral-500 block">{card.condition || 'NM'}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono text-emerald-400 font-bold block">
                            ${price > 0 ? price.toFixed(2) : '--'}
                          </span>
                          <span className="text-[9px] text-neutral-500 block">
                            ≈ ${(price * parsedUsdRate).toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subtotal Solicitado */}
              <div className="pt-2 border-t border-[#242129] flex items-center justify-between text-neutral-300 text-[11px]">
                <span>Total a recibir:</span>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold text-xs block">${requestedTotalUsd.toFixed(2)} USD</span>
                  <span className="text-neutral-500 text-[10px]">≈ ${requestedTotalCop.toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </div>

            {/* PANEL DERECHO: CARTAS QUE OFRECES DE TU INVENTARIO */}
            <div className="p-4 rounded-2xl bg-[#181622] border border-[#E88B00]/30 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#E88B00] uppercase tracking-wider block">
                    2. Ofreces de tu Binder ({selectedOfferedCards.length}):
                  </span>
                  {selectedOfferedCards.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedOfferedCards([])}
                      className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {currentUserInventory.length === 0 ? (
                  <div className="p-5 rounded-xl border border-dashed border-[#2A2733] text-center text-neutral-500 space-y-1.5 my-auto">
                    <Banknote className="w-5 h-5 mx-auto text-emerald-500/70" />
                    <p className="text-[11px] font-bold text-neutral-300">Modo de Compra Directa</p>
                    <p className="text-[10px] text-neutral-400">
                      No tienes cartas marcadas para trade. Puedes abonar el valor total en efectivo (COP) abajo.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {currentUserInventory.map((item) => {
                      const isSelected = selectedOfferedCards.some((c) => c.id === item.id);
                      const price = parseFloat(item.price_usd || item.price || item.market_price_usd || 0);
                      const img = item.image_url || item.card_catalog?.image_url;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleOffered(item)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-[#E88B00]/20 border-[#E88B00] text-white'
                              : 'bg-black/30 border-[#2A2733] text-neutral-400 hover:border-neutral-500'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#E88B00] shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-600 shrink-0" />
                            )}
                            {img ? (
                              <img src={img} alt={item.card_catalog?.name || item.name} className="w-7 h-10 object-cover rounded-lg shrink-0 shadow" />
                            ) : (
                              <div className="w-7 h-10 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[7px] text-neutral-600 shrink-0">
                                MTG
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="truncate block font-bold text-xs">{item.card_catalog?.name || item.name}</span>
                              <span className="text-[10px] text-neutral-500 block">{item.condition || 'NM'}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono text-emerald-400 font-bold block">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-neutral-500 block">
                              ≈ ${(price * parsedUsdRate).toLocaleString('es-CO')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subtotal Ofrecido */}
              <div className="pt-2 border-t border-[#242129] flex items-center justify-between text-neutral-300 text-[11px]">
                <span>Total en cartas:</span>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold text-xs block">${offeredTotalUsd.toFixed(2)} USD</span>
                  <span className="text-neutral-500 text-[10px]">≈ ${offeredTotalCop.toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Panel de Balance Económico y Compensación en Efectivo */}
          <div className="p-4 rounded-2xl bg-[#16131D] border border-[#2A2733] space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs pb-2 border-b border-white/5 gap-2">
              <span className="text-neutral-400 uppercase font-bold flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-[#E88B00]" />
                <span>Balance del Intercambio</span>
              </span>
              <div className="text-right">
                <span className="text-neutral-400 text-[10px] block">Diferencia neta en valor:</span>
                <span className={`font-bold text-xs ${diffUsd > 0 ? 'text-[#E88B00]' : diffUsd < 0 ? 'text-sky-400' : 'text-emerald-400'}`}>
                  {diffUsd > 0 
                    ? `Faltan $${diffUsd.toFixed(2)} USD (≈ $${Math.round(diffUsd * parsedUsdRate).toLocaleString('es-CO')} COP)` 
                    : diffUsd < 0 
                    ? `A tu favor +$${Math.abs(diffUsd).toFixed(2)} USD (≈ $${Math.round(Math.abs(diffUsd) * parsedUsdRate).toLocaleString('es-CO')} COP)` 
                    : 'Intercambio exacto (0 USD)'}
                </span>
              </div>
            </div>

            {/* Diagnóstico del intercambio e Input de Efectivo */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              
              <div className="sm:col-span-7 space-y-1">
                {isDirectCashPurchase ? (
                  <div className="text-emerald-300 text-[11px] leading-relaxed">
                    <strong className="block text-emerald-400">Modalidad: Compra directa en efectivo</strong>
                    <span>No ofreces cartas a cambio. Pagas el valor total de las cartas solicitadas a la tasa acordada.</span>
                  </div>
                ) : diffUsd > 0 ? (
                  <div className="text-amber-300 text-[11px] leading-relaxed">
                    <strong className="block text-[#E88B00]">Debes compensar la diferencia:</strong>
                    <span>Tus cartas suman menos valor. Añade efectivo en COP para equilibrar la propuesta.</span>
                  </div>
                ) : diffUsd < 0 ? (
                  <div className="text-sky-300 text-[11px] leading-relaxed">
                    <strong className="block text-sky-400">Tienes saldo a favor:</strong>
                    <span>Tus cartas superan el valor de lo pedido. Puedes acordar que la contraparte te compense la diferencia.</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 text-[11px]">
                    ✓ El intercambio está perfectamente balanceado a la par.
                  </div>
                )}
              </div>

              {/* Input de Efectivo Calculado */}
              <div className="sm:col-span-5 bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <label className="text-neutral-400 uppercase font-bold">Efectivo a pagar (COP):</label>
                  {suggestedDifferenceCop > 0 && (
                    <button
                      type="button"
                      onClick={handleApplyExactCash}
                      className="text-[#E88B00] hover:underline font-bold cursor-pointer"
                      title="Copiar monto exacto sugerido"
                    >
                      Ajustar exacto
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2 text-neutral-500 font-bold">$</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={customCashInput !== '' ? customCashInput : cashAdjustmentCop}
                    onChange={(e) => {
                      setCustomCashInput(e.target.value);
                      setCashAdjustmentCop(Number(e.target.value) || 0);
                    }}
                    placeholder={String(suggestedDifferenceCop)}
                    className="w-full bg-[#1A1822] border border-[#2A2733] focus:border-[#E88B00] rounded-lg pl-7 pr-3 py-1.5 text-white font-bold outline-none text-xs"
                  />
                </div>

                <span className="text-[9px] text-neutral-500 block text-right">
                  Sugerido automático: ${suggestedDifferenceCop.toLocaleString('es-CO')} COP
                </span>
              </div>

            </div>
          </div>

          {/* 4. Mensaje o Condiciones */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
              Mensaje o condiciones para el trato:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Te entrego en la tienda el fin de semana y transfiero la diferencia por Nequi / Bancolombia."
              className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl p-3 text-neutral-200 outline-none resize-none"
            />
          </div>

          {/* 5. Acciones */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#242129]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#181622] hover:bg-[#242129] text-neutral-400 font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2.5 rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E88B00]/15 transition"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Enviando...' : 'Enviar Propuesta'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
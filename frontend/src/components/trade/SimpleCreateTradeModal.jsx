// ============================================================================
// COMPONENTE: MODAL PARA PUBLICAR OFERTAS / SOLICITUDES EN BLACK MARKET
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Modo "Solo Dinero" (Venta Directa): Si el usuario ofrece cartas y marca
//   "Solo Dinero", se desbloquea la publicación directa desde el Paso 1 sin
//   obligarlo a seleccionar cartas a cambio.
// - Modo "Busco Cartas" (Compra Directa): Permite pedir cartas pagando con efectivo.
// - Modo "Intercambio / Mixto": Flujo guiado de 2 pasos (Ofrezco -> Busco).
// - Validaciones amigables en interfaz sin alerts nativos del navegador.
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Search, 
  ArrowRight, 
  Flame, 
  Sparkles, 
  Loader2, 
  HelpCircle, 
  DollarSign, 
  MapPin, 
  Banknote, 
  Repeat, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { createTradePostApi } from '@/api/trade';

export default function SimpleCreateTradeModal({
  isOpen,
  onClose,
  initialMode = 'offer', // 'offer' (Ofrezco) | 'want' (Busco)
  currentUserTradeCards = [],
  wishlistCards = [],
  preselectedCards = [],
  onTradeCreated,
}) {
  const [postMode, setPostMode] = useState(initialMode);
  const [step, setStep] = useState(1);
  const [selectedOfferCards, setSelectedOfferCards] = useState([]);
  const [wantedCards, setWantedCards] = useState([]);

  // Modalidad comercial: 'cash_only' (Solo dinero/venta), 'trade_only' (Solo permuta), 'both' (Ambos)
  const [tradeIntent, setTradeIntent] = useState('both');

  // Parámetros de publicación y tasa local
  const [location, setLocation] = useState('Medellín / Bello (Área Metropolitana)');
  const [notes, setNotes] = useState('');
  const [customRate, setCustomRate] = useState(3300);
  const [cashBudget, setCashBudget] = useState(''); // Para cuando busca cartas y ofrece presupuesto
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Estados del Buscador Reactivo (Scryfall Autocomplete)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPostMode(initialMode);
      setSelectedOfferCards(preselectedCards.length > 0 ? [...preselectedCards] : []);
      setWantedCards([]);
      setStep(initialMode === 'want' ? 2 : 1);
      setTradeIntent(initialMode === 'offer' ? 'both' : 'cash_only');
      setSearchQuery('');
      setSearchResults([]);
      setFormError(null);
    }
  }, [isOpen, initialMode, preselectedCards]);

  // Total estimado en USD de las cartas seleccionadas
  const totalOfferedUsd = useMemo(() => {
    return selectedOfferCards.reduce((acc, c) => {
      const price = parseFloat(c.price_usd || c.price || 0);
      const qty = c.quantity || 1;
      return acc + price * qty;
    }, 0);
  }, [selectedOfferCards]);

  const totalOfferedCop = Math.round(totalOfferedUsd * (Number(customRate) || 3300));

  // Búsqueda reactiva con Scryfall
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery.trim())}&order=name`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data ? data.data.slice(0, 8) : []);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleToggleOffer = (card) => {
    setFormError(null);
    setSelectedOfferCards((prev) =>
      prev.some((c) => c.id === card.id) ? prev.filter((c) => c.id !== card.id) : [...prev, card]
    );
  };

  const handleSelectSearchedCard = (scryCard) => {
    setFormError(null);
    const cardData = {
      name: scryCard.name,
      condition: 'NM',
      is_foil: false,
      image_url: scryCard.image_uris?.normal || scryCard.card_faces?.[0]?.image_uris?.normal || '',
      scryfall_card_id: scryCard.id,
      price_usd: parseFloat(scryCard.prices?.usd || 0)
    };

    if (!wantedCards.some((w) => w.name.toLowerCase() === cardData.name.toLowerCase())) {
      setWantedCards((prev) => [...prev, cardData]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleImportFromWishlist = () => {
    if (!wishlistCards.length) return;
    setFormError(null);
    const imported = wishlistCards.map((item) => ({
      name: item.card_catalog?.name || item.name || 'Carta MTG',
      condition: 'NM',
      is_foil: false,
      image_url: item.card_catalog?.image_url || item.image_url || '',
      scryfall_card_id: item.scryfall_card_id || item.id,
      price_usd: parseFloat(item.price_usd || 0)
    }));
    
    setWantedCards((prev) => {
      const existing = new Set(prev.map((c) => c.name.toLowerCase()));
      return [...prev, ...imported.filter((c) => !existing.has(c.name.toLowerCase()))];
    });
  };

  const handleSubmit = async () => {
    setFormError(null);

    // 1. Validaciones por modo
    if (postMode === 'offer') {
      if (selectedOfferCards.length === 0) {
        setFormError('Debes seleccionar al menos una carta de tu inventario para ofrecer.');
        return;
      }
      if (tradeIntent === 'trade_only' && wantedCards.length === 0) {
        setFormError('Si indicaste "Solo Permuta", agrega al menos una carta que desees a cambio.');
        return;
      }
    } else {
      if (wantedCards.length === 0) {
        setFormError('Indica al menos una carta que estés buscando.');
        return;
      }
    }

    if (!location.trim()) {
      setFormError('Por favor indica un punto de encuentro o LGS.');
      return;
    }

    try {
      setSubmitting(true);

      const isCash = tradeIntent === 'cash_only' || tradeIntent === 'both';
      const autoNotes = notes.trim() || (
        tradeIntent === 'cash_only'
          ? (postMode === 'offer' ? 'Venta directa en efectivo / transferencia.' : 'Compro directamente en efectivo.')
          : (tradeIntent === 'trade_only' ? 'Solo cambio por cartas de la lista.' : 'Abierto a cambio por cartas o dinero.')
      );

      const payload = {
        title: postMode === 'offer'
          ? `${tradeIntent === 'cash_only' ? 'En Venta' : 'Ofrezco'}: ${selectedOfferCards.map(c => c.card_catalog?.name || c.name).slice(0, 2).join(', ')}`
          : `Busco: ${wantedCards.map(w => w.name).slice(0, 2).join(', ')}`,
        content: autoNotes,
        location: location.trim(),
        accepts_cash: isCash,
        cash_amount: cashBudget ? parseFloat(cashBudget) : 0,
        preferred_usd_rate: Number(customRate) || 3300,
        offered_cards: selectedOfferCards.map((c) => ({
          name: c.card_catalog?.name || c.name || 'Carta MTG',
          scryfall_card_id: String(c.scryfall_card_id || c.scryfall_id || c.id || ''),
          condition: c.condition || 'NM',
          is_foil: Boolean(c.is_foil),
          image_url: c.card_catalog?.image_url || c.image_url || '',
          price_usd: parseFloat(c.price_usd || c.price || 0),
          quantity: Number(c.quantity || 1)
        })),
        wanted_cards: tradeIntent === 'cash_only' && postMode === 'offer' 
          ? [] 
          : wantedCards.map((w) => ({
              name: w.name,
              scryfall_card_id: String(w.scryfall_card_id || ''),
              condition: w.condition || 'NM',
              is_foil: Boolean(w.is_foil),
              image_url: w.image_url || '',
              price_usd: parseFloat(w.price_usd || 0),
              quantity: 1
            }))
      };

      await createTradePostApi(payload);
      onTradeCreated?.();
      onClose();
    } catch (err) {
      console.error('[SimpleCreateTradeModal] Error al publicar:', err);
      const detail = err.response?.data?.detail;
      const errorMsg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join('\n')
        : (detail || err.message || 'Error de conexión con el servidor.');
      setFormError(errorMsg);
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
            {postMode === 'offer' ? (
              <Flame className="w-4 h-4 text-[#E88B00]" />
            ) : (
              <HelpCircle className="w-4 h-4 text-sky-400" />
            )}
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {postMode === 'offer' ? 'Ofrecer Cartas' : 'Buscar Cartas'}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#131217] p-0.5 rounded-lg border border-neutral-800">
              <button
                type="button"
                onClick={() => { setPostMode('offer'); setStep(1); setFormError(null); }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                  postMode === 'offer' ? 'bg-[#E88B00] text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Ofrezco
              </button>
              <button
                type="button"
                onClick={() => { setPostMode('want'); setStep(2); setFormError(null); }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                  postMode === 'want' ? 'bg-sky-500 text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Busco
              </button>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notificación de Error */}
        {formError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block">Revisa lo siguiente:</span>
              <span>{formError}</span>
            </div>
            <button onClick={() => setFormError(null)} className="text-rose-400 hover:text-white">✕</button>
          </div>
        )}

        <div className="p-6 space-y-4 overflow-y-auto">
          
          {/* ======================================================== */}
          {/* PASO 1: SELECCIÓN DE CARTAS QUE OFRECES                  */}
          {/* ======================================================== */}
          {step === 1 ? (
            <div className="space-y-4">
              
              {/* Selector de Modalidad Comercial */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-neutral-400 font-bold block">
                  ¿Qué esperas a cambio de estas cartas?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTradeIntent('cash_only')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      tradeIntent === 'cash_only'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                        : 'bg-[#181622] border-[#2A2733] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px]">Solo Dinero (Venta)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTradeIntent('both')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      tradeIntent === 'both'
                        ? 'bg-[#E88B00]/20 border-[#E88B00] text-amber-300 font-bold shadow-sm'
                        : 'bg-[#181622] border-[#2A2733] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Repeat className="w-4 h-4 text-[#E88B00]" />
                    <span className="text-[10px]">Dinero o Trade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTradeIntent('trade_only')}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      tradeIntent === 'trade_only'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-sm'
                        : 'bg-[#181622] border-[#2A2733] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span className="text-[10px]">Solo Permuta</span>
                  </button>
                </div>
              </div>

              {/* Lista de cartas disponibles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Cartas para trade en tus colecciones:</span>
                  <span className="text-[#E88B00] font-bold">
                    {selectedOfferCards.length} seleccionada(s)
                  </span>
                </div>

                {currentUserTradeCards.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-[#2A2733] rounded-2xl p-4 text-neutral-500 space-y-1">
                    <p className="italic">No tienes cartas con el switch "Para Trade" en tus binders.</p>
                    <p className="text-[10px] text-neutral-400">
                      Márcalas desde tus Colecciones o usa el botón superior "Busco" para solicitar cartas.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
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

                {/* Resumen de valor */}
                {selectedOfferCards.length > 0 && (
                  <div className="p-3 bg-[#181622] border border-[#2A2733] rounded-xl flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Valor total estimado:</span>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold">${totalOfferedUsd.toFixed(2)} USD</span>
                      <span className="text-neutral-500 block text-[10px]">≈ ${totalOfferedCop.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Si es SOLO DINERO, mostramos las condiciones aquí mismo y permitimos publicar sin ir al paso 2 */}
              {tradeIntent === 'cash_only' ? (
                <div className="space-y-3 pt-2 border-t border-[#242129]">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-neutral-400 font-bold block flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-[#E88B00]" />
                        Tasa (COP / USD)
                      </label>
                      <input
                        type="number"
                        value={customRate}
                        onChange={(e) => setCustomRate(e.target.value)}
                        placeholder="3300"
                        className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] uppercase text-neutral-400 font-bold block flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#E88B00]" />
                        Punto de Encuentro / LGS
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-bold block">Notas / Condiciones de Venta</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Solo transferencia Bancolombia / Nequi o entrega en tienda."
                      className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={submitting || selectedOfferCards.length === 0}
                      onClick={handleSubmit}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{submitting ? 'Publicando...' : 'Publicar Venta en Black Market'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Si busca intercambio o mixto, avanza al paso 2 */
                <div className="flex justify-end pt-3 border-t border-[#242129]">
                  <button
                    type="button"
                    disabled={selectedOfferCards.length === 0}
                    onClick={() => {
                      if (selectedOfferCards.length === 0) {
                        setFormError('Selecciona al menos una carta para ofrecer.');
                        return;
                      }
                      setFormError(null);
                      setStep(2);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#E88B00]/10 transition"
                  >
                    <span>Indicar qué cartas buscas ({selectedOfferCards.length})</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* ======================================================== */
            /* PASO 2: CARTAS BUSCADAS Y CONDICIONES (PERMUTA O COMPRA)  */
            /* ======================================================== */
            <div className="space-y-4">
              
              {/* Importar desde Wishlist */}
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

              {/* Buscador Reactivo Scryfall */}
              <div className="space-y-1 relative">
                <label className="text-[10px] uppercase text-neutral-400 font-bold block">
                  {postMode === 'want' ? 'Cartas que buscas:' : 'Cartas que aceptarías a cambio:'}
                </label>
                <div className="flex items-center bg-[#181622] border border-[#2A2733] focus-within:border-[#E88B00] rounded-xl px-3 py-2 transition">
                  <Search className="w-4 h-4 text-neutral-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Escribe el nombre de la carta (ej: Sol Ring, Rhystic Study)..."
                    className="w-full bg-transparent text-white outline-none"
                  />
                  {isSearching && <Loader2 className="w-4 h-4 animate-spin text-[#E88B00] shrink-0 ml-2" />}
                </div>

                {/* Dropdown de Resultados */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#15141C] border border-[#2A2733] rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-50 divide-y divide-neutral-800">
                    {searchResults.map((card) => {
                      const img = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
                      return (
                        <div
                          key={card.id}
                          onClick={() => handleSelectSearchedCard(card)}
                          className="p-2.5 hover:bg-[#E88B00]/10 cursor-pointer flex items-center justify-between gap-3 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {img ? (
                              <img src={img} alt={card.name} className="w-7 h-10 object-cover rounded shrink-0" />
                            ) : (
                              <div className="w-7 h-10 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-[8px] text-neutral-500 shrink-0">
                                MTG
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{card.name}</span>
                              <span className="text-[10px] text-neutral-400 block truncate">{card.type_line}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-bold text-emerald-400 block">
                              ${card.prices?.usd || '0.00'}
                            </span>
                            <span className="text-[9px] text-[#E88B00] uppercase font-bold">+ Agregar</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lista de cartas que busca */}
              {wantedCards.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold block">
                    Cartas añadidas ({wantedCards.length}):
                  </span>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                    {wantedCards.map((w, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 flex items-center gap-2 text-xs"
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
                </div>
              )}

              {/* Si es compra directa, opción de presupuesto en efectivo */}
              {postMode === 'want' && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold block flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                    Presupuesto Disponible en Efectivo (Opcional en COP)
                  </label>
                  <input
                    type="number"
                    value={cashBudget}
                    onChange={(e) => setCashBudget(e.target.value)}
                    placeholder="Ej: 150000 COP o deja vacío si pagas a precio TCG Market"
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                  />
                </div>
              )}

              {/* Parámetros: Tasa y Ubicación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold block flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-[#E88B00]" />
                    Tasa (COP / USD)
                  </label>
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    placeholder="3300"
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none font-bold"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#E88B00]" />
                    Punto de Encuentro / LGS
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-neutral-400 font-bold block">Notas Adicionales</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Cotejo precios TCG Market. Intercambio en Dragon Hobby."
                  className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-1.5 text-neutral-200 outline-none"
                />
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between pt-4 border-t border-[#242129]">
                {postMode === 'offer' ? (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-neutral-400 hover:text-white font-bold cursor-pointer"
                  >
                    ← Volver a cartas
                  </button>
                ) : (
                  <span className="text-[10px] text-neutral-500">Solicitud de compra</span>
                )}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase text-xs tracking-wider cursor-pointer shadow-lg shadow-[#E88B00]/10 flex items-center gap-2 transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Publicando...' : 'Publicar en Black Market'}</span>
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
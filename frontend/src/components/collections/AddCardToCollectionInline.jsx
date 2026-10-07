// ---------------------------------------------------------
// COMPONENTE: BARRA RÁPIDA PARA AÑADIR CARTAS A COLECCIÓN
// ---------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, Check, Sparkles } from 'lucide-react';
import apiClient from '@/api/client';

export default function AddCardToCollectionInline({ collectionId, onCardAdded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isFoil, setIsFoil] = useState(false);
  const [isForTrade, setIsForTrade] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length < 3) {
      setSearchResults([]);
      setIsOpenDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const query = encodeURIComponent(searchTerm.trim());
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`, {
          headers: { Accept: 'application/json;q=0.9,*/*;q=0.8' },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data?.slice(0, 6) || []);
          setIsOpenDropdown(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('[AddCardToCollection] Error en Scryfall:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectCard = (card) => {
    setSelectedCard(card);
    setSearchTerm(card.name);
    setIsOpenDropdown(false);
  };

  const handleAddCard = async (e) => {
    e?.preventDefault();
    if (!selectedCard?.id || !collectionId) return;

    setIsSubmitting(true);
    try {
      await apiClient.post(`/collections/${collectionId}/cards`, {
        scryfall_card_id: selectedCard.id,
        quantity: Number(quantity),
        is_foil: isFoil,
        is_for_trade: isForTrade,
      });

      setSelectedCard(null);
      setSearchTerm('');
      setQuantity(1);
      setIsFoil(false);
      setIsForTrade(false);
      onCardAdded?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo agregar la carta a la colección.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <form
        onSubmit={handleAddCard}
        className="flex items-center bg-[#141318] border border-white/10 hover:border-white/20 focus-within:border-amber-500/80 rounded-xl p-1 shadow-md transition font-mono text-xs"
      >
        <div className="relative flex-1 flex items-center min-w-0 pl-2.5">
          <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Añadir carta a esta colección (ej: Rhystic Study, Sol Ring)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedCard(null);
            }}
            className="w-full bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none truncate"
          />

          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0 mr-1.5" />
          )}
          {selectedCard && !isSearching && (
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-1.5" />
          )}
        </div>

        <div className="h-4 w-px bg-white/10 shrink-0 mx-1" />

        {/* Cantidad */}
        <div className="flex items-center shrink-0">
          <input
            type="number"
            min="1"
            max="99"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-10 bg-neutral-950/70 border border-white/10 rounded-lg py-1 text-center font-mono text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
            title="Copias"
          />
        </div>

        {/* Toggle Foil */}
        <button
          type="button"
          onClick={() => setIsFoil(!isFoil)}
          className={`shrink-0 mx-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
            isFoil
              ? 'bg-gradient-to-r from-amber-400 via-pink-400 to-purple-500 text-black border-transparent'
              : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Foil"
        >
          <Sparkles className="w-3 h-3 inline mr-0.5" />
          Foil
        </button>

        {/* Toggle Para Trade */}
        <button
          type="button"
          onClick={() => setIsForTrade(!isForTrade)}
          className={`shrink-0 mr-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
            isForTrade
              ? 'bg-emerald-500 text-black border-emerald-500'
              : 'bg-neutral-900 border-white/10 text-neutral-400 hover:text-white'
          }`}
          title="Marcar disponible para trade"
        >
          Trade
        </button>

        {/* Botón Guardar */}
        <button
          type="submit"
          disabled={!selectedCard || isSubmitting}
          className="shrink-0 px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1 transition shadow active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>{isSubmitting ? '...' : 'Añadir'}</span>
        </button>
      </form>

      {/* Resultados de Scryfall */}
      {isOpenDropdown && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-12 bg-neutral-950 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 max-h-72 overflow-y-auto font-mono">
          {searchResults.map((card) => {
            const imgUrl = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
            return (
              <div
                key={card.id}
                onClick={() => handleSelectCard(card)}
                className="p-2 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition"
              >
                {imgUrl ? (
                  <img src={imgUrl} alt={card.name} className="w-8 aspect-[2.5/3.5] object-cover rounded shadow" loading="lazy" />
                ) : (
                  <div className="w-8 aspect-[2.5/3.5] bg-neutral-900 rounded" />
                )}
                <div className="flex-1 truncate">
                  <span className="text-xs font-semibold text-white block truncate">{card.name}</span>
                  <span className="text-[10px] text-neutral-400">
                    {(card.set || '---').toUpperCase()} · {card.type_line || 'MTG Card'}
                  </span>
                </div>
                {card.prices?.usd && (
                  <span className="text-[11px] font-bold text-amber-400 pr-2">
                    ${card.prices.usd}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
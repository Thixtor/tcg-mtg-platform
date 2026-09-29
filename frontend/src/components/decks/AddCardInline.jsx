// ---------------------------------------------------------
// COMPONENTE: BUSCADOR RÁPIDO E INLINE PARA MAZOS
// ---------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2, Sparkles, Check } from 'lucide-react';
import { addCardToDeckApi } from '@/api/decks.api';

/**
 * Buscador rápido una a una con selector de categoría y cantidad.
 * @param {Object} props
 * @param {string|number} props.deckId - ID del mazo activo.
 * @param {Function} props.onCardAdded - Callback ejecutado al insertar la carta.
 */
export default function AddCardInline({ deckId, onCardAdded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCard, setSelectedCommander] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('mainboard');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  
  const containerRef = useRef(null);

  // Cerrar lista al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda con debounce en Scryfall respetando cabeceras
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
          headers: {
            Accept: 'application/json;q=0.9,*/*;q=0.8',
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data?.slice(0, 6) || []);
          setIsOpenDropdown(true);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn('[AddCardInline] Error consultando Scryfall:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectCard = (card) => {
    setSelectedCommander(card);
    setSearchTerm(card.name);
    setIsOpenDropdown(false);
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (!selectedCard?.id || !deckId) return;

    setIsSubmitting(true);
    try {
      await addCardToDeckApi(deckId, {
        scryfall_card_id: selectedCard.id,
        quantity: Number(quantity),
        category: category
      });

      // Resetear estado
      setSelectedCommander(null);
      setSearchTerm('');
      setQuantity(1);
      onCardAdded?.();
    } catch (err) {
      console.warn('[AddCardInline] Error agregando carta:', err);
      alert(err.response?.data?.detail || 'No se pudo agregar la carta al mazo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 shadow-inner" ref={containerRef}>
      <form onSubmit={handleAddCard} className="flex flex-col sm:flex-row items-center gap-2.5">
        
        {/* Input Buscador */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar carta para añadir (ej: Sol Ring, Counterspell)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedCommander(null);
            }}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-amber-500 transition"
          />
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 absolute right-3 top-2.5" />
          )}
          {selectedCard && (
            <span className="absolute right-3 top-2 text-emerald-400">
              <Check className="w-4 h-4" />
            </span>
          )}
        </div>

        {/* Dropdown flotante de resultados */}
        {isOpenDropdown && searchResults.length > 0 && (
          <div className="absolute left-3 right-3 sm:right-auto sm:w-96 top-14 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-neutral-800">
            {searchResults.map((card) => {
              const imgUrl = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small;
              return (
                <div
                  key={card.id}
                  onClick={() => handleSelectCard(card)}
                  className="p-2 flex items-center gap-3 hover:bg-neutral-800/80 cursor-pointer transition"
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt={card.name} className="w-7 h-10 object-cover rounded" loading="lazy" />
                  ) : (
                    <div className="w-7 h-10 bg-neutral-950 rounded" />
                  )}
                  <div className="flex-1 truncate">
                    <span className="text-xs font-semibold text-white block truncate">{card.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {(card.set || '---').toUpperCase()} · {card.type_line || 'MTG Card'}
                    </span>
                    {card.artist && (
                      <span className="text-[9px] text-neutral-500 block">Ilus: {card.artist}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selector de Cantidad */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <input
            type="number"
            min="1"
            max="99"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-16 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-center text-neutral-100 focus:outline-none focus:border-amber-500"
            title="Cantidad"
          />

          {/* Selector de Categoría */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
          >
            <option value="mainboard">Mainboard</option>
            <option value="commander">Commander</option>
            <option value="sideboard">Sideboard</option>
            <option value="maybeboard">Maybeboard</option>
          </select>

          {/* Botón Añadir */}
          <button
            type="submit"
            disabled={!selectedCard || isSubmitting}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Añadiendo...' : 'Añadir'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
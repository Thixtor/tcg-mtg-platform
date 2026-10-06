// ---------------------------------------------------------
// COMPONENTE: TOP 10 CARTAS MÁS BUSCADAS (CON MANA FONT)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { searchCardsApi } from '@/api/cards';
import { ManaGlyph } from '@/components/common/ManaSymbol';
import { parseApiError } from '@/utils/apiErrors';

const RARITY_OPTIONS = [
  { label: 'Todas', value: '' },
  { label: 'Común', value: 'common' },
  { label: 'Rara', value: 'rare' },
  { label: 'Mítica', value: 'mythic' },
];

const COLOR_OPTIONS = [
  { id: '', label: 'Todos', isAll: true },
  { id: 'w', label: 'Blanco', symbol: 'w' },
  { id: 'u', label: 'Azul', symbol: 'u' },
  { id: 'b', label: 'Negro', symbol: 'b' },
  { id: 'r', label: 'Rojo', symbol: 'r' },
  { id: 'g', label: 'Verde', symbol: 'g' },
  { id: 'c', label: 'Incoloro', symbol: 'c' },
];

const TYPE_OPTIONS = [
  { label: 'Todos los tipos', value: '' },
  { label: 'Criatura', value: 'creature' },
  { label: 'Instantáneo', value: 'instant' },
  { label: 'Conjuro', value: 'sorcery' },
  { label: 'Artefacto', value: 'artifact' },
  { label: 'Encantamiento', value: 'enchantment' },
  { label: 'Planeswalker', value: 'planeswalker' },
  { label: 'Tierra', value: 'land' },
];

/**
 * Slider con ranking de las 10 cartas más buscadas con selectores de rareza, color y tipo.
 */
export default function TopCardsSlider({ isLightMode, onOpenCard }) {
  const [topCards, setTopCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados reactivos de filtrado
  const [selectedRarity, setSelectedRarity] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);

    const queryParts = ['-is:digital'];
    if (selectedRarity) queryParts.push(`r:${selectedRarity}`);
    if (selectedColor) {
      queryParts.push(selectedColor === 'c' ? 'c:c' : `c:${selectedColor}`);
    }
    if (selectedType) queryParts.push(`t:${selectedType}`);

    const payload = {
      q: queryParts.join(' '),
      order: 'edhrec',
      limit: 10,
    };

    searchCardsApi(payload, { signal: ctrl.signal })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.data || data?.items || []);
        setTopCards(list.slice(0, 10));
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn('[TopCardsSlider] Error consultando cartas:', parseApiError(err));
          setTopCards([]);
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [selectedRarity, selectedColor, selectedType]);

  return (
    <section className="space-y-4">
      {/* 1. Cabecera y Filtros */}
      <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-4 ${
        isLightMode ? 'border-neutral-300' : 'border-neutral-800'
      }`}>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-amber-500">★</span> Top 10 Cartas Más Buscadas
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
            Las cartas más populares y cotizadas según rareza, identidad de maná y tipo.
          </p>
        </div>

        {/* Controles de Selección */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Selector de Rareza */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border ${
            isLightMode ? 'bg-neutral-200/80 border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
          }`}>
            <span className={`px-2 font-medium ${isLightMode ? 'text-neutral-700' : 'text-neutral-400'}`}>
              Rareza:
            </span>
            {RARITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedRarity(opt.value)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedRarity === opt.value
                    ? 'bg-amber-600 text-white font-semibold shadow'
                    : isLightMode
                      ? 'text-neutral-700 hover:bg-neutral-300'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Selector de Color con Mana Font */}
          <div className={`flex items-center gap-1.5 p-1.5 rounded-lg border ${
            isLightMode ? 'bg-neutral-200/80 border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
          }`}>
            <span className={`px-1.5 font-medium ${isLightMode ? 'text-neutral-700' : 'text-neutral-400'}`}>
              Color:
            </span>
            {COLOR_OPTIONS.map((c) => {
              const isSelected = selectedColor === c.id;

              if (c.isAll) {
                return (
                  <button
                    key="all-colors"
                    onClick={() => setSelectedColor('')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-amber-600 text-white font-semibold shadow'
                        : isLightMode
                          ? 'text-neutral-700 hover:bg-neutral-300'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    Todos
                  </button>
                );
              }

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.id)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-neutral-900 scale-110 shadow-lg'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <ManaGlyph symbol={c.symbol} size="text-[17px]" cost={true} shadow={true} />
                </button>
              );
            })}
          </div>

          {/* Selector de Tipo */}
          <div className={`flex items-center px-2 py-1 rounded-lg border ${
            isLightMode ? 'bg-neutral-200/80 border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
          }`}>
            <span className={`pr-2 font-medium ${isLightMode ? 'text-neutral-700' : 'text-neutral-400'}`}>
              Tipo:
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`bg-transparent py-0.5 focus:outline-none cursor-pointer ${
                isLightMode ? 'text-neutral-800' : 'text-neutral-200'
              }`}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className={isLightMode ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Slider Horizontal */}
      {loading ? (
        <div className="flex gap-4 overflow-x-hidden py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`min-w-[175px] sm:min-w-[200px] h-[280px] rounded-xl animate-pulse border ${
                isLightMode ? 'bg-neutral-200 border-neutral-300' : 'bg-neutral-800/40 border-neutral-800'
              }`}
            />
          ))}
        </div>
      ) : topCards.length === 0 ? (
        <div className="py-12 text-center text-neutral-400 text-sm italic">
          No se encontraron cartas en el Top 10 para la combinación de filtros seleccionada.
        </div>
      ) : (
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-neutral-700">
          {topCards.map((card, index) => {
            const imgUrl =
              card.image_url ||
              card.image_uris?.normal ||
              card.card_faces?.[0]?.image_uris?.normal ||
              '/placeholder-card.png';

            return (
              <div
                key={card.id || index}
                onClick={() => onOpenCard && onOpenCard(card)}
                className="relative flex-shrink-0 w-[170px] sm:w-[200px] group cursor-pointer transition-transform duration-200 hover:-translate-y-1.5"
              >
                {/* Ranking Badge */}
                <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/85 backdrop-blur-md border border-amber-500/80 text-amber-400 font-extrabold text-xs flex items-center justify-center shadow-lg">
                  #{index + 1}
                </div>

                {/* Marco de Imagen */}
                <div className={`w-full aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-md group-hover:shadow-amber-500/20 group-hover:shadow-xl border ${
                  isLightMode ? 'border-neutral-300 bg-neutral-200' : 'border-neutral-800 bg-neutral-900'
                }`}>
                  <img
                    src={imgUrl}
                    alt={card.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Metadatos Rápidos */}
                <div className="mt-2 px-1">
                  <p className="text-xs sm:text-sm font-semibold truncate group-hover:text-amber-500 transition-colors">
                    {card.name}
                  </p>
                  <p className={`text-[11px] truncate ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    {card.type_line || card.type || 'MTG Card'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
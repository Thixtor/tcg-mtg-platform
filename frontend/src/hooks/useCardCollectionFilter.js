// ---------------------------------------------------------
// HOOK: FILTRADO Y ORDENAMIENTO EN MEMORIA PARA MAZOS Y BINDERS
// ---------------------------------------------------------
import { useState, useMemo } from 'react';
import { resolveCardType } from '@/utils/mtgTypeResolver';

/**
 * Extrae de forma resiliente el precio numérico en USD.
 */
export function extractCardPriceUsd(card) {
  if (!card) return 0;
  const rawPrice = 
    card.price_usd ?? 
    card.prices?.usd ?? 
    card.card_catalog?.price_usd ?? 
    card.scryfall_raw_data?.prices?.usd ?? 
    0;
  const num = parseFloat(rawPrice);
  return isNaN(num) ? 0 : num;
}

/**
 * Hook universal para filtrar y ordenar listas de cartas en Mazos y Colecciones.
 * 
 * @param {Array} cards - Lista cruda de cartas (deckCards o collectionCards)
 * @param {Object} options - Configuración de filtros iniciales
 */
export function useCardCollectionFilter(cards = [], options = {}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState(options.defaultSort || 'name');
  const [activeZone, setActiveZone] = useState(options.defaultZone || 'main');
  const [onlyFoils, setOnlyFoils] = useState(false);
  const [onlyTrade, setOnlyTrade] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);

  const filteredCards = useMemo(() => {
    let pool = [...cards];

    // 1. Filtrado por zona de mazo (si aplica)
    if (options.enableZones && activeZone) {
      if (activeZone === 'main') {
        pool = pool.filter(
          (c) => c.category === 'mainboard' || c.category === 'commander' || c.category === 'companion' || !c.category
        );
      } else {
        pool = pool.filter((c) => c.category === activeZone);
      }
    }

    // 2. Filtro de estado físico de inventario (DISPONIBLE, EN_OTRO_MAZO, FALTANTE)
    if (statusFilter) {
      pool = pool.filter((c) => c.status === statusFilter);
    }

    // 3. Filtros específicos de Colección / Binder
    if (onlyFoils) {
      pool = pool.filter((c) => c.is_foil);
    }
    if (onlyTrade) {
      pool = pool.filter((c) => c.is_for_trade);
    }

    // 4. Filtrado por texto, CMC y tipo de carta
    if (filterQuery.trim()) {
      const rawQuery = filterQuery.trim().toLowerCase();
      const normalizedQuery = rawQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Soporte para queries como "cmc:3", "cmc>=4", "mv<2"
      const cmcMatch = rawQuery.match(/^(?:cmc|mv|coste|cost)\s*([><=:]+)?\s*(\d+)$/i);

      pool = pool.filter((c) => {
        const cardCmc = c.cmc !== undefined 
          ? Number(c.cmc) 
          : (c.card_catalog?.cmc ?? c.mana_value ?? 0);

        if (cmcMatch) {
          const operator = cmcMatch[1] || ':';
          const targetValue = Number(cmcMatch[2]);
          if (operator === '>') return cardCmc > targetValue;
          if (operator === '>=') return cardCmc >= targetValue;
          if (operator === '<') return cardCmc < targetValue;
          if (operator === '<=') return cardCmc <= targetValue;
          return cardCmc === targetValue;
        }

        const isNumericOnly = !isNaN(Number(rawQuery));
        if (isNumericOnly && cardCmc === Number(rawQuery)) {
          return true;
        }

        const name = (c.card_catalog?.name || c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const typeLine = (c.card_catalog?.type_line || c.type_line || c.type || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mana = (c.mana_cost || c.card_catalog?.mana_cost || '').toLowerCase();

        return (
          name.includes(normalizedQuery) || 
          typeLine.includes(normalizedQuery) || 
          mana.includes(normalizedQuery)
        );
      });
    }

    // 5. Ordenamiento unificado
    return pool.sort((a, b) => {
      const nameA = a.card_catalog?.name || a.name || '';
      const nameB = b.card_catalog?.name || b.name || '';

      if (sortBy === 'name') return nameA.localeCompare(nameB);
      if (sortBy === 'price') return extractCardPriceUsd(b) - extractCardPriceUsd(a);
      if (sortBy === 'cmc') {
        const cmcA = a.cmc ?? a.card_catalog?.cmc ?? 0;
        const cmcB = b.cmc ?? b.card_catalog?.cmc ?? 0;
        return cmcA - cmcB;
      }
      if (sortBy === 'quantity') {
        const qtyA = a.quantity_needed ?? a.quantity ?? 1;
        const qtyB = b.quantity_needed ?? b.quantity ?? 1;
        return qtyB - qtyA;
      }
      return 0;
    });
  }, [cards, activeZone, statusFilter, onlyFoils, onlyTrade, filterQuery, sortBy, options.enableZones]);

  return {
    filterQuery,
    setFilterQuery,
    sortBy,
    setSortBy,
    activeZone,
    setActiveZone,
    onlyFoils,
    setOnlyFoils,
    onlyTrade,
    setOnlyTrade,
    statusFilter,
    setStatusFilter,
    filteredCards,
  };
}
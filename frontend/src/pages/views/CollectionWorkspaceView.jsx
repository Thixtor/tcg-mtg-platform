// ---------------------------------------------------------
// VISTA: WORKSPACE DE COLECCIÓN (ESTADOS CLAROS Y TIENDAS)
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import CollectionDetailHero from '@/components/collections/CollectionDetailHero';
import CollectionCardItem from '@/components/collections/CollectionCardItem';
import { useCardModal } from '@/context/CardModalContext';
import { calculateCollectionMetrics, getCardPriceBySource } from '@/utils/pricing';

export default function CollectionWorkspaceView({
  collection,
  collectionCards,
  loadingCards,
  subTab = 'all',
  onSubTabChange,
  priceSource = 'tcgplayer',
  onPriceSourceChange,
  cardSearchQuery,
  onCardSearchChange,
  onlyFoils,
  onToggleFoils,
  cardSortBy,
  onCardSortChange,
  onBack,
  onNavigateToCatalog,
}) {
  const { openCard } = useCardModal();

  // Filtrado por disponibilidad física del inventario
  const cardsByAvailability = useMemo(() => {
    if (subTab === 'decks') {
      return collectionCards.filter((c) => Boolean(c.in_decks_count || c.is_in_deck));
    }
    if (subTab === 'trade') {
      return collectionCards.filter((c) => Boolean(c.is_for_trade));
    }
    return collectionCards;
  }, [collectionCards, subTab]);

  // Aplicación del buscador y ordenamiento
  const processedCards = useMemo(() => {
    return cardsByAvailability
      .filter((item) => {
        const cardData = item.card_catalog || item;
        const name = (cardData.name || '').toLowerCase();
        const typeLine = (cardData.type_line || '').toLowerCase();
        const query = (cardSearchQuery || '').toLowerCase();
        const matchesQuery = name.includes(query) || typeLine.includes(query);
        const matchesFoil = onlyFoils ? item.is_foil : true;
        return matchesQuery && matchesFoil;
      })
      .sort((a, b) => {
        if (cardSortBy === 'price') {
          return getCardPriceBySource(b, priceSource) - getCardPriceBySource(a, priceSource);
        }
        if (cardSortBy === 'quantity') {
          return (b.quantity || 1) - (a.quantity || 1);
        }
        const nameA = (a.card_catalog?.name || a.name || '').toLowerCase();
        const nameB = (b.card_catalog?.name || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [cardsByAvailability, cardSearchQuery, onlyFoils, cardSortBy, priceSource]);

  // Cálculos de métricas globales según tienda
  const { count: totalCardsCount, totalValue: totalMarketValue } = useMemo(() => {
    return calculateCollectionMetrics(collectionCards, priceSource);
  }, [collectionCards, priceSource]);

  // Conteo de cartas por estado
  const deckCardsCount = useMemo(() => {
    return collectionCards.filter((c) => Boolean(c.in_decks_count || c.is_in_deck)).length;
  }, [collectionCards]);

  const tradeCardsCount = useMemo(() => {
    return collectionCards.filter((c) => Boolean(c.is_for_trade)).length;
  }, [collectionCards]);

  const heroArt = useMemo(() => {
    if (collection?.art_url) return collection.art_url;
    if (collectionCards.length > 0) {
      const sorted = [...collectionCards].sort(
        (a, b) => getCardPriceBySource(b, priceSource) - getCardPriceBySource(a, priceSource)
      );
      return sorted[0]?.card_catalog?.image_url || sorted[0]?.image_url;
    }
    return 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920&auto=format&fit=crop';
  }, [collection, collectionCards, priceSource]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* 1. Hero Banner Cinematográfico */}
      <CollectionDetailHero
        collection={collection}
        heroArt={heroArt}
        subTab={subTab}
        onSubTabChange={onSubTabChange}
        priceSource={priceSource}
        allCount={collectionCards.length}
        deckCount={deckCardsCount}
        tradeCount={tradeCardsCount}
        totalCards={totalCardsCount}
        totalValue={totalMarketValue}
        onBack={onBack}
      />

      {/* 2. Barra de Herramientas de la Galería */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-3 border-b border-white/5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={cardSearchQuery}
              onChange={(e) => onCardSearchChange(e.target.value)}
              placeholder="Buscar cartas en esta colección..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141318] border border-white/5 text-xs font-mono text-neutral-200 placeholder-neutral-500 outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de Tienda de Referencia */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141318] border border-white/5 text-xs font-mono">
              <button
                type="button"
                onClick={() => onPriceSourceChange('tcgplayer')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  priceSource === 'tcgplayer'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                TCGplayer
              </button>
              <button
                type="button"
                onClick={() => onPriceSourceChange('cardkingdom')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  priceSource === 'cardkingdom'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Card Kingdom
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleFoils}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition border cursor-pointer ${
                onlyFoils
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-[#141318] text-neutral-400 border-white/5 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter {onlyFoils && '(Foil)'}</span>
            </button>

            <div className="relative">
              <select
                value={cardSortBy}
                onChange={(e) => onCardSortChange(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 rounded-xl bg-[#141318] border border-white/5 text-xs font-mono font-bold text-neutral-300 outline-none cursor-pointer hover:border-white/20 transition"
              >
                <option value="price">Precio ▾</option>
                <option value="name">Nombre ▾</option>
                <option value="quantity">Copias ▾</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Galería de Cartas */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10">
        {loadingCards ? (
          <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>Cargando inventario de cartas...</span>
          </div>
        ) : processedCards.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 space-y-4">
            <p className="text-sm font-mono text-neutral-400">
              {cardSearchQuery 
                ? 'No se encontraron cartas con esos criterios de búsqueda.' 
                : subTab === 'decks'
                ? 'No tienes cartas asignadas a ningún deck en esta carpeta.'
                : subTab === 'trade'
                ? 'No tienes cartas marcadas para trade en esta carpeta.'
                : 'Esta colección todavía no tiene cartas agregadas.'}
            </p>
            <button
              type="button"
              onClick={onNavigateToCatalog}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono transition cursor-pointer shadow-lg shadow-purple-600/25"
            >
              Explorar Catálogo de Cartas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {processedCards.map((item) => (
              <CollectionCardItem
                key={item.id}
                item={item}
                priceSource={priceSource}
                onClick={openCard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
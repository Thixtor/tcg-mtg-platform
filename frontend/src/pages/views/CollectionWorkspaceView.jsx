// ---------------------------------------------------------
// VISTA: WORKSPACE DE COLECCIÓN (CON COMMAND BAR Y TRADE)
// ---------------------------------------------------------
import React, { useMemo } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';
import CollectionDetailHero from '@/components/collections/CollectionDetailHero';
import CollectionCardItem from '@/components/collections/CollectionCardItem';
import AddCardToCollectionInline from '@/components/collections/AddCardToCollectionInline';
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
  onCardAdded,
  onRefreshCollection,
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

  // Métricas globales
  const { count: totalCardsCount, totalValue: totalMarketValue } = useMemo(() => {
    return calculateCollectionMetrics(collectionCards, priceSource);
  }, [collectionCards, priceSource]);

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
        const topCard = sorted[0]?.card_catalog || sorted[0];
        const raw = topCard?.scryfall_raw_data || topCard;

        // Priorizar el recorte artístico puro sin marcos ni bordes negros
        return (
          raw?.image_uris?.art_crop ||
          raw?.card_faces?.[0]?.image_uris?.art_crop ||
          topCard?.image_uris?.art_crop ||
          topCard?.art_crop_url ||
          topCard?.image_url ||
          'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920&auto=format&fit=crop'
        );
      }
      return 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920&auto=format&fit=crop';
  }, [collection, collectionCards, priceSource]);

  return (
    <div className="w-full space-y-6 pb-16">
      {/* 1. Hero Banner */}
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
        onCollectionUpdated={onRefreshCollection}
      />

      {/* 2. Barra para Añadir Nuevas Cartas Directamente */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10">
        <AddCardToCollectionInline
          collectionId={collection.id}
          onCardAdded={onCardAdded || onRefreshCollection}
        />
      </div>

      {/* 3. Filtros y Búsqueda sobre las cartas ya añadidas */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-3 border-b border-white/5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={cardSearchQuery}
              onChange={(e) => onCardSearchChange(e.target.value)}
              placeholder="Filtrar cartas en esta colección..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141318] border border-white/5 text-xs font-mono text-neutral-200 placeholder-neutral-500 outline-none focus:border-amber-500 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Tienda */}
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
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-[#141318] text-neutral-400 border-white/5 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Foil</span>
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

      {/* 4. Galería de Cartas */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10">
        {loadingCards ? (
          <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
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
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs font-mono transition cursor-pointer shadow-lg shadow-amber-500/25"
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
                onToggleTrade={onRefreshCollection}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
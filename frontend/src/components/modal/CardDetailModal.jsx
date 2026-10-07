// ============================================================================
// COMPONENTE: MODAL CINEMATOGRÁFICO DE DETALLE DE CARTA (ORQUESTADOR)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Desacoplado en subcomponentes atómicos:
//   * CardImagePreview: Imagen, volteo DFC y carrusel de estilos.
//   * CardInventoryTracker: Auditoría física multiedición, contador rápido y mazos.
//   * CardMarketPricing: Cotizaciones TCG y Card Kingdom.
//   * CardOracleRules: Reglas Oracle y glifos de maná.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, 
  ExternalLink, 
  TrendingUp, 
  FolderPlus, 
  Layers, 
  Loader2 
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import ManaCost from '@/components/common/ManaSymbol';
import AddToCollectionOrDeckModal from '@/components/cards/AddToCollectionOrDeckModal';
import apiClient from '@/api/client';

import CardImagePreview from './card-detail/CardImagePreview';
import CardInventoryTracker from './card-detail/CardInventoryTracker';
import CardMarketPricing from './card-detail/CardMarketPricing';
import CardOracleRules from './card-detail/CardOracleRules';

export default function CardDetailModal({ card, isOpen, onClose }) {
  const { isLightMode } = useTheme();
  const [faceIndex, setFaceIndex] = useState(0);
  const [activeVersion, setActiveVersion] = useState(null);
  const [hoveredPrint, setHoveredPrint] = useState(null);
  const [availablePrints, setAvailablePrints] = useState([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [initialAddTab, setInitialAddTab] = useState('collection');

  const [tradeMetrics, setTradeMetrics] = useState({
    copiesForTrade: 0,
    requestedCount: 0,
    loading: true,
  });

  const [myInventory, setMyInventory] = useState({
    isLoggedIn: false,
    totalCollection: 0,
    forTradeCopies: 0,
    collectionDetails: [],
    totalInDecks: 0,
    deckDetails: [],
    loading: false,
  });

  const hasToken = typeof window !== 'undefined' && Boolean(
    localStorage.getItem('token') || 
    localStorage.getItem('access_token') || 
    localStorage.getItem('auth_token')
  );

  // 1. Sincronización Scryfall y reimpresiones
  useEffect(() => {
    if (!isOpen || !card) {
      setActiveVersion(null);
      setHoveredPrint(null);
      setAvailablePrints([]);
      setFaceIndex(0);
      setIsAddModalOpen(false);
      return;
    }

    const cardId = card.id || card.scryfall_card_id;
    let isCancelled = false;
    setLoadingDetails(true);
    setLoadingPrints(true);

    const fetchBase = async () => {
      try {
        let baseData = card;
        if (!card.oracle_text && !card.scryfall_raw_data?.oracle_text) {
          const res = await fetch(`https://api.scryfall.com/cards/${cardId}`);
          if (res.ok) baseData = await res.json();
        }
        if (!isCancelled) setActiveVersion(baseData);

        const cardName = baseData.name || card.name;
        const printsUri = baseData.prints_search_uri || 
          `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cardName)}%22+unique%3Aprints&order=released`;

        const printsRes = await fetch(printsUri);
        if (printsRes.ok) {
          const printsData = await printsRes.json();
          if (!isCancelled && printsData.data) {
            setAvailablePrints(printsData.data);
          }
        }
      } catch (err) {
        console.warn('[CardDetailModal] Error sincronizando estilos:', err);
      } finally {
        if (!isCancelled) {
          setLoadingDetails(false);
          setLoadingPrints(false);
        }
      }
    };

    fetchBase();
    return () => { isCancelled = true; };
  }, [card, isOpen]);

  // 2. Consulta de Trade Market
  useEffect(() => {
    if (!isOpen || !activeVersion) return;
    let isMounted = true;
    setTradeMetrics({ copiesForTrade: 0, requestedCount: 0, loading: true });

    const scryId = activeVersion.id || activeVersion.scryfall_card_id;
    apiClient.get(`/trade/market?scryfall_card_id=${scryId}`)
      .then((res) => {
        if (!isMounted) return;
        const items = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        const totalAvailable = res.data?.total !== undefined ? res.data.total : items.length;
        const tradeDemandScore = items.reduce((acc, curr) => acc + (curr.demand_weight || 1), 0);

        setTradeMetrics({
          copiesForTrade: totalAvailable,
          requestedCount: tradeDemandScore,
          loading: false,
        });
      })
      .catch(() => {
        if (isMounted) setTradeMetrics({ copiesForTrade: 0, requestedCount: 0, loading: false });
      });

    return () => { isMounted = false; };
  }, [activeVersion, isOpen]);

  // 3. Consulta de inventario multiedición
  const fetchMyInventoryCopies = useCallback(() => {
    if (!isOpen || !activeVersion || !hasToken) {
      setMyInventory({
        isLoggedIn: Boolean(hasToken),
        totalCollection: 0,
        forTradeCopies: 0,
        collectionDetails: [],
        totalInDecks: 0,
        deckDetails: [],
        loading: false,
      });
      return;
    }

    const scryId = activeVersion.id || activeVersion.scryfall_card_id;
    const cardName = activeVersion.name || card?.name || '';
    setMyInventory((prev) => ({ ...prev, isLoggedIn: true, loading: true }));

    apiClient.get(`/collections/cards/my-copies/${scryId}`, {
      params: { card_name: cardName }
    })
      .then((res) => {
        setMyInventory({
          isLoggedIn: true,
          totalCollection: res.data?.total_collection || 0,
          forTradeCopies: res.data?.for_trade_copies || 0,
          collectionDetails: res.data?.collection_details || [],
          totalInDecks: res.data?.total_in_decks || (res.data?.deck_details || []).length,
          deckDetails: res.data?.deck_details || [],
          loading: false,
        });
      })
      .catch(() => {
        setMyInventory({
          isLoggedIn: true,
          totalCollection: 0,
          forTradeCopies: 0,
          collectionDetails: [],
          totalInDecks: 0,
          deckDetails: [],
          loading: false,
        });
      });
  }, [isOpen, activeVersion, hasToken, card]);

  useEffect(() => {
    fetchMyInventoryCopies();
  }, [fetchMyInventoryCopies]);

  // Normalización de datos de la carta
  const normalizedCard = useMemo(() => {
    const activeData = hoveredPrint || activeVersion || card;
    if (!activeData) return null;

    const raw = activeData.scryfall_raw_data || activeData;
    const faces = raw.card_faces || null;
    const isMultiFace = Array.isArray(faces) && faces.length > 1;
    const currentFace = isMultiFace ? faces[faceIndex] : raw;

    const imageUrl =
      currentFace?.image_uris?.normal ||
      currentFace?.image_uris?.large ||
      raw.image_uris?.normal ||
      raw.image_url ||
      activeData.image_url ||
      '/placeholder-card.png';

    const name = currentFace?.name || raw.name || activeData.name || 'Carta Desconocida';
    const manaCost = currentFace?.mana_cost !== undefined ? currentFace.mana_cost : raw.mana_cost || '';
    const typeLine = currentFace?.type_line || raw.type_line || activeData.type_line || '';
    const oracleText = currentFace?.oracle_text || raw.oracle_text || '';
    const printedText = currentFace?.printed_text || raw.printed_text || null;
    const flavorText = currentFace?.flavor_text || raw.flavor_text || '';
    const power = currentFace?.power !== undefined ? currentFace.power : raw.power;
    const toughness = currentFace?.toughness !== undefined ? currentFace.toughness : raw.toughness;
    const loyalty = currentFace?.loyalty !== undefined ? currentFace.loyalty : raw.loyalty;

    const setCode = (raw.set || activeData.set_code || activeData.set || '').toUpperCase();
    const setName = raw.set_name || setCode;
    const collectorNumber = raw.collector_number || '';
    const rarity = raw.rarity || activeData.rarity || 'common';

    const prices = raw.prices || activeData.prices || {};
    const tcgPrice = prices.usd || activeData.tcg_price || null;
    const tcgPriceFoil = prices.usd_foil || activeData.tcg_foil_price || null;

    const ckPriceRetail = raw.cardkingdom_price_retail || raw.purchase_uris?.cardkingdom ? (prices.usd ? (parseFloat(prices.usd) * 1.08).toFixed(2) : null) : null;
    const ckPriceBuy = raw.cardkingdom_price_buylist || (ckPriceRetail ? (parseFloat(ckPriceRetail) * 0.65).toFixed(2) : null);

    const scryfallUri = raw.scryfall_uri || `https://scryfall.com/search?q=!%22${encodeURIComponent(name)}%22`;

    return {
      id: raw.id,
      isMultiFace,
      name,
      imageUrl,
      manaCost,
      typeLine,
      oracleText,
      printedText,
      flavorText,
      power,
      toughness,
      loyalty,
      setCode,
      setName,
      collectorNumber,
      rarity,
      tcgPrice,
      tcgPriceFoil,
      ckPriceRetail,
      ckPriceBuy,
      scryfallUri,
    };
  }, [hoveredPrint, activeVersion, card, faceIndex]);

  if (!isOpen || !normalizedCard) return null;

  const appDemand = (() => {
    if (tradeMetrics.loading) return { label: 'Calculando...', color: 'text-neutral-400 bg-neutral-800/40 border-neutral-700' };
    const { copiesForTrade, requestedCount } = tradeMetrics;
    if (copiesForTrade === 0 && requestedCount === 0) return { label: 'Sin Actividad de Trade', color: 'text-neutral-400 bg-neutral-800/40 border-neutral-700' };
    if (copiesForTrade > 0 && requestedCount > copiesForTrade * 2) return { label: 'Alta Demanda en la App', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (copiesForTrade > 0) return { label: 'Demanda Equilibrada', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    return { label: 'Buscada (Sin Copias para Trade)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  })();

  const handleOpenAdd = (tab) => {
    setInitialAddTab(tab);
    setIsAddModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn font-sans">
        <div className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl border ${
          isLightMode ? 'bg-[#FAF7F2] text-[#24211E] border-neutral-300' : 'bg-[#121214] text-neutral-100 border-neutral-800'
        }`}>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-3.5 right-3.5 z-40 p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
              isLightMode 
                ? 'bg-neutral-200/90 hover:bg-neutral-300 text-neutral-800 border border-neutral-300' 
                : 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. Columna Izquierda: Visor de Carta e Inventario con Contador */}
          <div className={`md:w-5/12 p-6 flex flex-col justify-between overflow-y-auto space-y-4 border-b md:border-b-0 md:border-r ${
            isLightMode ? 'bg-[#EFEAE1] border-neutral-300' : 'bg-[#0B0B0C] border-neutral-800'
          }`}>
            <CardImagePreview
              normalizedCard={normalizedCard}
              activeVersion={activeVersion}
              baseCardId={card.id}
              faceIndex={faceIndex}
              onToggleFace={() => setFaceIndex((p) => (p === 0 ? 1 : 0))}
              availablePrints={availablePrints}
              loadingPrints={loadingPrints}
              onSelectPrint={(p) => { setActiveVersion(p); setFaceIndex(0); }}
              onHoverPrint={setHoveredPrint}
              onLeavePrint={() => setHoveredPrint(null)}
            />

            <CardInventoryTracker
              myInventory={myInventory}
              tradeMetrics={tradeMetrics}
              onInventoryUpdated={fetchMyInventoryCopies}
              isLightMode={isLightMode}
            />
          </div>

          {/* 2. Columna Derecha: Información, Reglas y Acciones */}
          <div className="md:w-7/12 p-6 overflow-y-auto space-y-4 max-h-[65vh] md:max-h-none scrollbar-thin scrollbar-thumb-neutral-700 flex flex-col justify-between">
            <div className="space-y-4">
              {loadingDetails && (
                <div className="flex items-center gap-2 text-xs font-mono text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cargando detalles de la versión seleccionada...</span>
                </div>
              )}

              {/* Título y Coste */}
              <div className="border-b pb-3 pr-12 border-neutral-700/40">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                    {normalizedCard.name}
                  </h3>
                  {normalizedCard.manaCost && (
                    <div className="shrink-0 pt-1">
                      <ManaCost costString={normalizedCard.manaCost} size="text-[13px]" gap="gap-1" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={`text-xs sm:text-sm font-semibold ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    {normalizedCard.typeLine}
                  </span>
                  
                  <div className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1.5 ml-auto ${appDemand.color}`}>
                    <TrendingUp className="w-3 h-3" />
                    <span>{appDemand.label}</span>
                  </div>
                </div>
              </div>

              {/* Precios de Mercado */}
              <CardMarketPricing normalizedCard={normalizedCard} isLightMode={isLightMode} />

              {/* Reglas de Juego */}
              <CardOracleRules normalizedCard={normalizedCard} isLightMode={isLightMode} />

              {/* P/T o Lealtad */}
              {(normalizedCard.power !== undefined || normalizedCard.loyalty !== undefined) && (
                <div className="flex justify-end">
                  <div className={`px-4 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wider border ${
                    isLightMode ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-neutral-900 border-neutral-700 text-amber-400'
                  }`}>
                    {normalizedCard.power !== undefined
                      ? `${normalizedCard.power} / ${normalizedCard.toughness}`
                      : `Lealtad: ${normalizedCard.loyalty}`}
                  </div>
                </div>
              )}

              {/* Metadatos de Edición */}
              <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                <div className={`p-2.5 rounded-lg border ${
                  isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Edición</span>
                  <span className="font-semibold truncate block" title={normalizedCard.setName}>
                    {normalizedCard.setName} ({normalizedCard.setCode})
                  </span>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Coleccionista</span>
                  <span className="font-semibold block">
                    #{normalizedCard.collectorNumber || '—'}
                  </span>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Rareza</span>
                  <span className="font-semibold capitalize block">
                    {normalizedCard.rarity}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra Inferior de Acciones */}
            <div className="pt-3 border-t border-neutral-700/40 flex flex-wrap items-center justify-between gap-2.5 font-mono">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAdd('collection')}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm border border-neutral-700 active:scale-95 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Añadir a Carpeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAdd('deck')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Añadir a Mazo</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={normalizedCard.scryfallUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-mono transition-colors"
                >
                  <span>Scryfall</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    isLightMode ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {isAddModalOpen && (
        <AddToCollectionOrDeckModal
          card={activeVersion || card}
          initialTab={initialAddTab}
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            fetchMyInventoryCopies();
          }}
        />
      )}
    </>
  );
}
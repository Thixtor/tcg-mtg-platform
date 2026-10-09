// TCG/frontend/src/components/modal/CardDetailModal.jsx
// ============================================================================
// COMPONENTE: MODAL CINEMATOGRÁFICO DE DETALLE DE CARTA (ORQUESTADOR RESPONSIVE)
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
  const [activeVersion, setActiveVersion] = useState(card || null);
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

  // 1. Sincronización Scryfall y BD local
  useEffect(() => {
    if (!isOpen || !card) {
      setActiveVersion(null);
      setHoveredPrint(null);
      setAvailablePrints([]);
      setFaceIndex(0);
      setIsAddModalOpen(false);
      return;
    }

    setActiveVersion(card);

    const cardId = card.id || card.scryfall_card_id;
    let isCancelled = false;
    setLoadingDetails(true);
    setLoadingPrints(true);

    const fetchBase = async () => {
      try {
        let baseData = { ...card };

        // 1.1 Intentar enriquecer con el endpoint de detalle local
        try {
          const localRes = await apiClient.get(`/cards/${cardId}`);
          if (localRes?.data) {
            baseData = {
              ...baseData,
              ...localRes.data,
              // Preservar precios si la respuesta local no los traía
              prices: localRes.data.prices || baseData.prices
            };
          }
        } catch (localErr) {
          console.warn('[CardDetailModal] Error consultando backend local:', localErr);
        }

        // 1.2 Si faltan precios o número de coleccionista, consultar la API en vivo de Scryfall
        const hasLivePrices = Boolean(baseData.prices?.usd || baseData.prices?.usd_foil || baseData.tcg_price);
        if (!hasLivePrices || !baseData.collector_number) {
          try {
            const scryRes = await fetch(`https://api.scryfall.com/cards/${cardId}`);
            if (scryRes.ok) {
              const scryJson = await scryRes.json();
              baseData = { ...baseData, ...scryJson };
            }
          } catch (scryErr) {
            console.warn('[CardDetailModal] Fallback a Scryfall API falló:', scryErr);
          }
        }

        if (!isCancelled) {
          setActiveVersion(baseData);
        }

        // 1.3 Obtener impresiones/ediciones de esta carta
        const cardName = baseData.name || card.name;
        if (!cardName) return;

        const printsUri = baseData.prints_search_uri || 
          `https://api.scryfall.com/cards/search?q=%21%22${encodeURIComponent(cardName)}%22+unique%3Aprints&order=released`;

        const printsRes = await fetch(printsUri);
        if (printsRes.ok) {
          const printsData = await printsRes.json();
          if (!isCancelled && Array.isArray(printsData.data)) {
            setAvailablePrints(printsData.data);

            // Identificar la versión exacta abierta y cargar sus precios/número de inmediato
            const currentMatchingPrint = printsData.data.find(
              (p) => p.id === cardId || (p.set && p.set.toLowerCase() === (baseData.set || '').toLowerCase())
            );
            if (currentMatchingPrint) {
              setActiveVersion((prev) => ({
                ...prev,
                ...currentMatchingPrint,
                prices: currentMatchingPrint.prices || prev?.prices
              }));
            }
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
    if (!scryId) return;

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
    if (!scryId) return;

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

  // Normalización de datos para la UI
  const normalizedCard = useMemo(() => {
    const activeData = hoveredPrint || activeVersion || card;
    if (!activeData) return null;

    const raw = activeData.scryfall_raw_data || activeData;
    const faces = raw.card_faces || activeData.card_faces || null;
    const isMultiFace = Array.isArray(faces) && faces.length > 1;
    const currentFace = isMultiFace ? faces[faceIndex] : raw;

    const imageUrl =
      currentFace?.image_uris?.normal ||
      currentFace?.image_uris?.large ||
      raw.image_uris?.normal ||
      raw.image_uris?.large ||
      currentFace?.image_url ||
      raw.image_url ||
      activeData.image_url ||
      card?.image_url ||
      '/placeholder-card.png';

    const name = currentFace?.name || raw.name || activeData.name || card?.name || 'Carta Desconocida';
    const manaCost = currentFace?.mana_cost !== undefined ? currentFace.mana_cost : (raw.mana_cost || activeData.mana_cost || card?.mana_cost || '');
    const typeLine = currentFace?.type_line || raw.type_line || activeData.type_line || card?.type_line || '';
    const oracleText = currentFace?.oracle_text || raw.oracle_text || activeData.oracle_text || card?.oracle_text || '';
    const printedText = currentFace?.printed_text || raw.printed_text || null;
    const flavorText = currentFace?.flavor_text || raw.flavor_text || '';
    const power = currentFace?.power !== undefined ? currentFace.power : (raw.power ?? activeData.power);
    const toughness = currentFace?.toughness !== undefined ? currentFace.toughness : (raw.toughness ?? activeData.toughness);
    const loyalty = currentFace?.loyalty !== undefined ? currentFace.loyalty : (raw.loyalty ?? activeData.loyalty);

    const setCode = (raw.set || activeData.set_code || activeData.set || card?.set || '').toUpperCase();
    const setName = raw.set_name || activeData.set_name || setCode;
    const collectorNumber = raw.collector_number || activeData.collector_number || card?.collector_number || '';
    const rarity = raw.rarity || activeData.rarity || card?.rarity || 'common';

    // Extracción robusta de precios
    const prices = raw.prices || activeData.prices || card?.prices || {};
    const tcgPrice = prices.usd ?? activeData.tcg_price ?? raw.tcg_price ?? card?.tcg_price ?? null;
    const tcgPriceFoil = prices.usd_foil ?? activeData.tcg_foil_price ?? raw.tcg_foil_price ?? card?.tcg_foil_price ?? null;

    const rawCkRetail = 
      activeData.cardkingdom_price_retail ?? 
      raw.cardkingdom_price_retail ?? 
      card?.cardkingdom_price_retail ??
      prices.cardkingdom ?? 
      prices.cardkingdom_retail ?? 
      activeData.ck_price ?? 
      null;

    const rawCkBuy = 
      activeData.cardkingdom_price_buylist ?? 
      raw.cardkingdom_price_buylist ?? 
      card?.cardkingdom_price_buylist ??
      prices.cardkingdom_buylist ?? 
      null;

    const rawCkFoil = 
      activeData.cardkingdom_price_foil ?? 
      raw.cardkingdom_price_foil ?? 
      card?.cardkingdom_price_foil ??
      prices.cardkingdom_foil ?? 
      null;

    const ckPriceRetail = rawCkRetail !== null && rawCkRetail !== undefined && !isNaN(parseFloat(rawCkRetail))
      ? parseFloat(rawCkRetail).toFixed(2)
      : null;

    const ckPriceBuy = rawCkBuy !== null && rawCkBuy !== undefined && !isNaN(parseFloat(rawCkBuy))
      ? parseFloat(rawCkBuy).toFixed(2)
      : null;

    const ckPriceFoil = rawCkFoil !== null && rawCkFoil !== undefined && !isNaN(parseFloat(rawCkFoil))
      ? parseFloat(rawCkFoil).toFixed(2)
      : null;

    const scryfallUri = raw.scryfall_uri || activeData.scryfall_uri || `https://scryfall.com/search?q=!%22${encodeURIComponent(name)}%22`;

    return {
      id: raw.id || activeData.id || card?.id,
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
      prices,
      tcgPrice,
      tcgPriceFoil,
      ckPriceRetail,
      ckPriceBuy,
      ckPriceFoil,
      scryfallUri,
    };
  }, [hoveredPrint, activeVersion, card, faceIndex]);

  if (!isOpen || !normalizedCard) return null;

  const appDemand = (() => {
    if (tradeMetrics.loading) return { label: 'Calculando...', color: 'text-neutral-400 bg-neutral-800/40 border-neutral-700' };
    const { copiesForTrade, requestedCount } = tradeMetrics;
    if (copiesForTrade === 0 && requestedCount === 0) return { label: 'Sin Actividad', color: 'text-neutral-400 bg-neutral-800/40 border-neutral-700' };
    if (copiesForTrade > 0 && requestedCount > copiesForTrade * 2) return { label: 'Alta Demanda', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (copiesForTrade > 0) return { label: 'Demanda Equilibrada', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    return { label: 'Buscada', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  })();

  const handleOpenAdd = (tab) => {
    setInitialAddTab(tab);
    setIsAddModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn font-sans">
        <div className={`relative w-full max-w-5xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-2xl border ${
          isLightMode ? 'bg-[#FAF7F2] text-[#24211E] border-neutral-300' : 'bg-[#121214] text-neutral-100 border-neutral-800'
        }`}>

          <button
            type="button"
            onClick={onClose}
            className={`absolute top-3 right-3 z-40 p-2 sm:p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
              isLightMode 
                ? 'bg-neutral-200/90 hover:bg-neutral-300 text-neutral-800 border border-neutral-300' 
                : 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
            title="Cerrar ventana"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 1. Columna Izquierda: Visor e Inventario */}
          <div className={`w-full md:w-5/12 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto space-y-4 border-b md:border-b-0 md:border-r shrink-0 ${
            isLightMode ? 'bg-[#EFEAE1] border-neutral-300' : 'bg-[#0B0B0C] border-neutral-800'
          }`}>
            <CardImagePreview
              normalizedCard={normalizedCard}
              activeVersion={activeVersion}
              baseCardId={card.id || card.scryfall_card_id}
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

          {/* 2. Columna Derecha: Información y Precios */}
          <div className="w-full md:w-7/12 p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 flex flex-col justify-between scrollbar-thin scrollbar-thumb-neutral-700">
            <div className="space-y-4">
              {loadingDetails && (
                <div className="flex items-center gap-2 text-xs font-mono text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">Sincronizando detalles...</span>
                </div>
              )}

              {/* Título, Coste y Demanda */}
              <div className="border-b pb-3 pr-10 border-neutral-700/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tight break-words">
                    {normalizedCard.name}
                  </h3>
                  {normalizedCard.manaCost && (
                    <div className="shrink-0">
                      <ManaCost costString={normalizedCard.manaCost} size="text-[12px] sm:text-[14px]" gap="gap-1" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                    {normalizedCard.typeLine}
                  </span>
                  
                  <div className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold border flex items-center gap-1 ml-auto ${appDemand.color}`}>
                    <TrendingUp className="w-3 h-3 shrink-0" />
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
                  <div className={`px-3 py-1 rounded-lg font-mono font-bold text-xs sm:text-sm tracking-wider border ${
                    isLightMode ? 'bg-neutral-200 border-neutral-300 text-neutral-900' : 'bg-neutral-900 border-neutral-700 text-amber-400'
                  }`}>
                    {normalizedCard.power !== undefined
                      ? `${normalizedCard.power} / ${normalizedCard.toughness}`
                      : `Lealtad: ${normalizedCard.loyalty}`}
                  </div>
                </div>
              )}

              {/* Metadatos de Edición */}
              <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs font-mono">
                <div className={`p-2 rounded-lg border ${
                  isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                  <span className="text-neutral-500 block text-[9px] uppercase font-bold">Edición</span>
                  <span className="font-semibold truncate block" title={normalizedCard.setName}>
                    {normalizedCard.setCode || 'STD'}
                  </span>
                </div>

                <div className={`p-2 rounded-lg border ${
                  isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                  <span className="text-neutral-500 block text-[9px] uppercase font-bold">Número</span>
                  <span className="font-semibold block truncate">
                    #{normalizedCard.collectorNumber || '—'}
                  </span>
                </div>

                <div className={`p-2 rounded-lg border ${
                  isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                  <span className="text-neutral-500 block text-[9px] uppercase font-bold">Rareza</span>
                  <span className="font-semibold capitalize block truncate">
                    {normalizedCard.rarity}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra Inferior de Acciones */}
            <div className="pt-3 mt-3 border-t border-neutral-700/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-mono">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleOpenAdd('collection')}
                  className="px-2.5 py-2 sm:py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm border border-neutral-700 active:scale-95 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Carpeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAdd('deck')}
                  className="px-2.5 py-2 sm:py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Mazo</span>
                </button>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                <a
                  href={normalizedCard.scryfallUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-amber-500 hover:text-amber-400 font-mono"
                >
                  <span>Scryfall</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
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
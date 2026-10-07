// ---------------------------------------------------------
// COMPONENTE: MODAL CINEMATOGRÁFICO DE DETALLE DE CARTA (MTG)
// CON VOLTEO RÁPIDO DE CARAS (DFC) Y AUDITORÍA FÍSICA
// ---------------------------------------------------------
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  ArrowLeftRight, 
  DollarSign, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ShoppingBag,
  Store,
  Palette,
  FolderPlus,
  Layers,
  Box,
  Swords,
  Sparkles,
  RotateCw
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import ManaCost, { ManaGlyph } from '@/components/common/ManaSymbol';
import AddToCollectionOrDeckModal from '@/components/cards/AddToCollectionOrDeckModal';
import apiClient from '@/api/client';

function FormattedRulesText({ text, isLightMode }) {
  if (!text) return <p className="italic text-neutral-500">Sin texto de reglas activo.</p>;

  return (
    <div className="space-y-2">
      {text.split('\n').map((paragraph, pIdx) => {
        const parts = paragraph.split(/(\{[^}]+\})/g);
        return (
          <p key={pIdx} className="leading-relaxed">
            {parts.map((part, idx) => {
              if (part.startsWith('{') && part.endsWith('}')) {
                return (
                  <span key={idx} className="inline-block mx-0.5 align-middle">
                    <ManaGlyph symbol={part} size="text-[12px]" cost={true} shadow={true} />
                  </span>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

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

  useEffect(() => {
    if (!isOpen || !activeVersion) return;

    if (!hasToken) {
      setMyInventory({
        isLoggedIn: false,
        totalCollection: 0,
        forTradeCopies: 0,
        collectionDetails: [],
        totalInDecks: 0,
        deckDetails: [],
        loading: false,
      });
      return;
    }

    let isMounted = true;
    const scryId = activeVersion.id || activeVersion.scryfall_card_id;
    setMyInventory((prev) => ({ ...prev, isLoggedIn: true, loading: true }));

    apiClient.get(`/collections/cards/my-copies/${scryId}`)
      .then((res) => {
        if (!isMounted) return;
        setMyInventory({
          isLoggedIn: true,
          totalCollection: res.data?.total_collection || 0,
          forTradeCopies: res.data?.for_trade_copies || 0,
          collectionDetails: res.data?.collection_details || [],
          totalInDecks: res.data?.total_in_decks || 0,
          deckDetails: res.data?.deck_details || [],
          loading: false,
        });
      })
      .catch(() => {
        if (isMounted) {
          setMyInventory({
            isLoggedIn: true,
            totalCollection: 0,
            forTradeCopies: 0,
            collectionDetails: [],
            totalInDecks: 0,
            deckDetails: [],
            loading: false,
          });
        }
      });

    return () => { isMounted = false; };
  }, [activeVersion, isOpen, hasToken]);

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

  const toggleFace = () => setFaceIndex((prev) => (prev === 0 ? 1 : 0));

  const getAppTradeDemand = () => {
    if (tradeMetrics.loading) {
      return { label: 'Calculando...', color: 'text-neutral-400 bg-neutral-800/40 border-neutral-700' };
    }

    const { copiesForTrade, requestedCount } = tradeMetrics;

    if (copiesForTrade === 0 && requestedCount === 0) {
      return { label: 'Sin Actividad de Trade', color: 'text-neutral-400 bg-neutral-800/40 border-neutral-700' };
    }
    if (copiesForTrade > 0 && requestedCount > copiesForTrade * 2) {
      return { label: 'Alta Demanda en la App', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    }
    if (copiesForTrade > 0) {
      return { label: 'Demanda Equilibrada', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
    return { label: 'Buscada (Sin Copias para Trade)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
  };

  const appDemand = getAppTradeDemand();

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
            onClick={onClose}
            className={`absolute top-3.5 right-3.5 z-40 p-2 rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 ${
              isLightMode 
                ? 'bg-neutral-200/90 hover:bg-neutral-300 text-neutral-800 border border-neutral-300' 
                : 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 1. Columna Izquierda: Imagen y Volteo */}
          <div className={`md:w-5/12 p-6 flex flex-col justify-between overflow-y-auto space-y-4 border-b md:border-b-0 md:border-r ${
            isLightMode ? 'bg-[#EFEAE1] border-neutral-300' : 'bg-[#0B0B0C] border-neutral-800'
          }`}>
            <div className="w-full flex flex-col items-center">
              <div className="relative group w-full max-w-[240px] aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-2xl border border-neutral-700/60 bg-neutral-950 transition-all duration-300">
                <img
                  src={normalizedCard.imageUrl}
                  alt={normalizedCard.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Botón Flotante directo sobre la ilustración */}
                {normalizedCard.isMultiFace && (
                  <button
                    onClick={toggleFace}
                    title="Girar carta"
                    className="absolute bottom-2.5 right-2.5 p-2 rounded-full bg-black/80 hover:bg-amber-500 hover:text-black text-white border border-white/20 transition-all shadow-xl cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Botón para alternar cara */}
              {normalizedCard.isMultiFace && (
                <button
                  onClick={toggleFace}
                  className="mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer font-mono"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Voltear ({faceIndex === 0 ? 'Cara Posterior' : 'Cara Frontal'})</span>
                </button>
              )}

              {/* Selector de Impresiones */}
              <div className="w-full mt-4">
                <div className="flex items-center justify-between text-xs mb-2 px-1">
                  <span className="font-bold flex items-center gap-1.5 text-neutral-400">
                    <Palette className="w-3.5 h-3.5 text-amber-500" /> 
                    Estilos y Ediciones ({availablePrints.length || 1})
                  </span>
                  {loadingPrints && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                </div>

                {availablePrints.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto p-1.5 scrollbar-thin scrollbar-thumb-neutral-700 max-w-full rounded-lg bg-neutral-900/30 border border-neutral-800/60">
                    {availablePrints.map((print) => {
                      const isSelected = (activeVersion?.id || card.id) === print.id;
                      const thumb = print.image_uris?.small || print.card_faces?.[0]?.image_uris?.small;

                      return (
                        <button
                          key={print.id}
                          onClick={() => { setActiveVersion(print); setFaceIndex(0); }}
                          onMouseEnter={() => setHoveredPrint(print)}
                          onMouseLeave={() => setHoveredPrint(null)}
                          title={`${print.set_name} (#${print.collector_number})`}
                          className={`relative shrink-0 w-11 h-15 rounded overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? 'border-amber-500 ring-2 ring-amber-500/50 scale-105 shadow-md brightness-105'
                              : 'border-neutral-700/80 opacity-60 hover:opacity-100 hover:border-amber-400 hover:scale-105 hover:brightness-110'
                          }`}
                        >
                          {thumb ? (
                            <img src={thumb} alt={print.set} className="w-full h-full object-cover pointer-events-none" />
                          ) : (
                            <span className="text-[9px] font-mono p-1 uppercase">{print.set}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic px-1">Única impresión registrada en catálogo.</p>
                )}
              </div>
            </div>

            {/* SECCIÓN INFORMATIVA INFERIOR: BINDERS, MAZOS Y TRADE */}
            <div className="w-full space-y-2.5">
              <div className={`w-full p-3 rounded-xl border text-xs transition-colors space-y-2.5 ${
                isLightMode ? 'bg-white border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
              }`}>
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold">En Colección (Binders)</span>
                    </div>

                    {myInventory.loading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                    ) : myInventory.isLoggedIn ? (
                      myInventory.totalCollection > 0 ? (
                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                          <CheckCircle2 className="inline w-3 h-3 mr-1" />
                          {myInventory.totalCollection} en físico
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/40 px-2 py-0.5 rounded border border-neutral-700/40">
                          0 copias
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-400">Modo visitante</span>
                    )}
                  </div>

                  {myInventory.isLoggedIn && myInventory.collectionDetails.length > 0 && (
                    <div className="mt-1.5 pl-5 space-y-0.5 text-[11px] text-neutral-300">
                      {myInventory.collectionDetails.map((d) => (
                        <div key={d.user_card_id} className="flex items-center justify-between">
                          <span className="truncate max-w-[160px]" title={d.collection_name}>
                            • {d.collection_name}
                          </span>
                          <span className="font-mono text-neutral-400">
                            {d.quantity}x {d.is_foil ? <Sparkles className="inline w-2.5 h-2.5 text-amber-400" /> : null} ({d.condition})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800/60" />

                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="font-bold">En Mazos Activos</span>
                    </div>

                    {myInventory.loading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                    ) : myInventory.isLoggedIn ? (
                      myInventory.totalInDecks > 0 ? (
                        <span className="font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-[11px]">
                          {myInventory.totalInDecks} en lista
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800/40 px-2 py-0.5 rounded border border-neutral-700/40">
                          0 en mazos
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-400">—</span>
                    )}
                  </div>

                  {myInventory.isLoggedIn && myInventory.deckDetails.length > 0 && (
                    <div className="mt-1.5 pl-5 space-y-0.5 text-[11px] text-neutral-300">
                      {myInventory.deckDetails.map((d) => (
                        <div key={d.deck_card_id} className="flex items-center justify-between">
                          <span className="truncate max-w-[160px]" title={d.deck_name}>
                            • {d.deck_name}
                          </span>
                          <span className="font-mono text-neutral-400">
                            {d.quantity}x ({d.category})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs ${
                isLightMode ? 'bg-white border-neutral-300' : 'bg-neutral-900/80 border-neutral-800'
              }`}>
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold block">Disponibilidad para Trade</span>
                    <span className="text-[10px] text-neutral-400">En la comunidad</span>
                  </div>
                </div>

                {tradeMetrics.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                ) : tradeMetrics.copiesForTrade > 0 ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {tradeMetrics.copiesForTrade} copia{tradeMetrics.copiesForTrade > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-neutral-400 bg-neutral-800/40 px-2 py-0.5 rounded border border-neutral-700/40">
                    <AlertCircle className="w-3 h-3" />
                    Sin copias activas
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Columna Derecha: Información y Reglas */}
          <div className="md:w-7/12 p-6 overflow-y-auto space-y-4 max-h-[65vh] md:max-h-none scrollbar-thin scrollbar-thumb-neutral-700 flex flex-col justify-between">
            <div className="space-y-4">
              {loadingDetails && (
                <div className="flex items-center gap-2 text-xs font-mono text-amber-500 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cargando detalles de la versión seleccionada...</span>
                </div>
              )}

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

              {/* Precios */}
              <div className={`p-3.5 rounded-xl border ${
                isLightMode ? 'bg-[#F4EFE6] border-neutral-300' : 'bg-neutral-900/90 border-neutral-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    Precios de esta Versión ({normalizedCard.setCode})
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">Card Kingdom & TCGplayer</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
                      <Store className="w-3 h-3 text-sky-400" /> TCG Market
                    </span>
                    <span className="font-bold text-emerald-400">
                      {normalizedCard.tcgPrice ? `$${normalizedCard.tcgPrice}` : 'N/D'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
                      <Store className="w-3 h-3 text-amber-400" /> TCG Foil
                    </span>
                    <span className="font-bold text-amber-300">
                      {normalizedCard.tcgPriceFoil ? `$${normalizedCard.tcgPriceFoil}` : 'N/D'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-amber-500" /> CK Retail
                    </span>
                    <span className="font-bold text-neutral-100">
                      {normalizedCard.ckPriceRetail ? `$${normalizedCard.ckPriceRetail}` : 'N/D'}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-neutral-950/40 border border-neutral-800">
                    <span className="text-[10px] text-neutral-400 block flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-indigo-400" /> CK Buylist
                    </span>
                    <span className="font-bold text-indigo-300">
                      {normalizedCard.ckPriceBuy ? `$${normalizedCard.ckPriceBuy}` : 'N/D'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reglas Oracle */}
              <div className={`p-4 rounded-xl text-xs sm:text-sm leading-relaxed border space-y-3 ${
                isLightMode ? 'bg-white border-neutral-200' : 'bg-neutral-900/60 border-neutral-800'
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                    Texto de Reglas (Oracle)
                  </span>
                  <FormattedRulesText text={normalizedCard.oracleText} isLightMode={isLightMode} />
                </div>

                {normalizedCard.printedText && normalizedCard.printedText !== normalizedCard.oracleText && (
                  <div className="pt-2 border-t border-neutral-800/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                      Texto Impreso en esta Versión
                    </span>
                    <p className="text-xs text-neutral-300 italic">{normalizedCard.printedText}</p>
                  </div>
                )}

                {normalizedCard.flavorText && (
                  <div className="pt-2 border-t border-neutral-800/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block mb-0.5">
                      Ambientación
                    </span>
                    <p className="text-xs italic text-neutral-400 leading-normal">
                      "{normalizedCard.flavorText}"
                    </p>
                  </div>
                )}
              </div>

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

              {/* Metadatos */}
              <div className="grid grid-cols-3 gap-2.5 text-xs">
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
                  <span className="font-semibold block font-mono">
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

            {/* Barra Inferior */}
            <div className="pt-3 border-t border-neutral-700/40 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAdd('collection')}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm border border-neutral-700 active:scale-95 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Añadir a Carpeta</span>
                </button>

                <button
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
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </>
  );
}
// ---------------------------------------------------------
// MODAL DE DETALLE, ANÁLISIS DE MERCADO Y REGLAS DE CARTA
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { getCurrentPricesApi, getPriceHistoryApi } from '../../api/prices';
import { PriceChart } from './PriceChart';

// Formatos principales de MTG a supervisar
const TRACKED_FORMATS = [
  { key: 'commander', label: 'Commander' },
  { key: 'modern', label: 'Modern' },
  { key: 'pioneer', label: 'Pioneer' },
  { key: 'standard', label: 'Standard' },
  { key: 'legacy', label: 'Legacy' },
  { key: 'pauper', label: 'Pauper' },
];

export function CardDetailModal({ card, onClose }) {
  // Pestaña activa: 'market' (cotizaciones y gráfica) o 'rules' (texto, legalidades y lore)
  const [activeTab, setActiveTab] = useState('market');

  const [currentPrices, setCurrentPrices] = useState(null);
  const [historyPoints, setHistoryPoints] = useState([]);
  const [store, setStore] = useState('cardkingdom'); // 'cardkingdom' | 'tcgplayer'
  const [finish, setFinish] = useState('normal');      // 'normal' | 'foil'
  const [days, setDays] = useState(90);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Extracción robusta de imagen y metadatos Scryfall
  const raw = card?.scryfall_raw_data || {};
  const imageUrl =
    card?.image_url ||
    raw.image_uris?.normal ||
    raw.image_uris?.large ||
    raw.card_faces?.[0]?.image_uris?.normal ||
    null;

  const cardName = card?.name || 'Carta sin nombre';
  const manaCost = raw.mana_cost || '';
  const typeLine = card?.type_line || raw.type_line || 'Tipo desconocido';
  const oracleText = raw.oracle_text || card?.oracle_text || 'Sin texto de reglas registrado.';
  const flavorText = raw.flavor_text || null;
  const powerToughness = raw.power && raw.toughness ? `${raw.power}/${raw.toughness}` : null;
  const loyalty = raw.loyalty ? `Lealtad: ${raw.loyalty}` : null;
  const legalities = raw.legalities || {};
  const artist = raw.artist || 'Artista no especificado';
  const setCode = (card?.set || raw.set || '').toUpperCase();
  const collectorNum = raw.collector_number || 'N/A';

  // ---------------------------------------------------------
  // 1. CARGA DE PRECIOS VIGENTES
  // ---------------------------------------------------------
  useEffect(() => {
    if (!card?.id) return;
    getCurrentPricesApi(card.id)
      .then(setCurrentPrices)
      .catch((err) => console.error('Error al cargar cotizaciones vigentes:', err));
  }, [card?.id]);

  // ---------------------------------------------------------
  // 2. CARGA DE SERIE HISTÓRICA PARA LA GRÁFICA
  // ---------------------------------------------------------
  useEffect(() => {
    if (!card?.id) return;
    setLoadingPrices(true);
    getPriceHistoryApi(card.id, store, finish, days)
      .then((data) => {
        setHistoryPoints(data.puntos || []);
      })
      .catch((err) => {
        console.error('Error al cargar serie histórica:', err);
        setHistoryPoints([]);
      })
      .finally(() => {
        setLoadingPrices(false);
      });
  }, [card?.id, store, finish, days]);

  // Cálculo de spread entre tiendas si existen ambos precios normales
  const ckPrice = currentPrices?.cardkingdom_usd;
  const tcgPrice = currentPrices?.tcgplayer_usd;
  const priceSpread =
    ckPrice && tcgPrice
      ? {
          diff: Math.abs(ckPrice - tcgPrice).toFixed(2),
          cheaper: ckPrice < tcgPrice ? 'Card Kingdom' : ckPrice > tcgPrice ? 'TCGplayer' : 'Igual',
        }
      : null;

  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        
        {/* Botón de cierre superior */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-full transition-colors focus:outline-none"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* --------------------------------------------------------- */}
        {/* COLUMNA IZQUIERDA: IMAGEN CON ASPECT RATIO OFICIAL        */}
        {/* --------------------------------------------------------- */}
        <div className="w-full md:w-5/12 bg-neutral-950 p-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800">
          <div
            className="w-full max-w-[260px] relative rounded-xl overflow-hidden shadow-2xl flex items-center justify-center bg-neutral-900"
            style={{ aspectRatio: '2.5 / 3.5' }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={cardName}
                className="w-full h-full object-contain select-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center text-neutral-500">
                <span className="text-4xl mb-2">🃏</span>
                <span className="text-xs">Sin vista previa oficial</span>
              </div>
            )}
          </div>

          <div className="text-center mt-3 space-y-0.5">
            <p className="text-[11px] text-neutral-400 font-medium">Ilus. {artist}</p>
            <p className="text-[10px] text-neutral-600">
              © Wizards of the Coast LLC · Scryfall API[cite: 2]
            </p>
          </div>
        </div>

        {/* --------------------------------------------------------- */}
        {/* COLUMNA DERECHA: PESTAÑAS Y CONTENIDO                     */}
        {/* --------------------------------------------------------- */}
        <div className="w-full md:w-7/12 p-5 md:p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Header del modal */}
            <div className="flex items-center justify-between gap-2 mb-1 pr-8">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 font-mono text-xs rounded uppercase font-bold">
                  {setCode}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  #{collectorNum}
                </span>
              </div>
              {manaCost && (
                <span className="text-xs font-mono font-semibold tracking-wider text-amber-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  {manaCost}
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-extrabold text-neutral-100 leading-tight">
              {cardName}
            </h2>
            <p className="text-xs text-neutral-400 mb-4 font-medium">{typeLine}</p>

            {/* Selector de pestañas */}
            <div className="flex border-b border-neutral-800 mb-4 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('market')}
                className={`pb-2 transition-colors relative ${
                  activeTab === 'market'
                    ? 'text-amber-400 border-b-2 border-amber-500'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                📊 Mercado & Histórico
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`pb-2 transition-colors relative ${
                  activeTab === 'rules'
                    ? 'text-amber-400 border-b-2 border-amber-500'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                📜 Reglas & Formatos
              </button>
            </div>

            {/* --------------------------------------------------------- */}
            {/* PESTAÑA 1: MERCADO Y GRÁFICAS                            */}
            {/* --------------------------------------------------------- */}
            {activeTab === 'market' && (
              <div className="space-y-4">
                {/* Cuadros de precios actuales */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                    <span className="text-xs text-neutral-400 block font-medium">Card Kingdom</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-bold text-emerald-400">
                        {ckPrice ? `$${ckPrice.toFixed(2)}` : 'N/A'}
                      </span>
                      {currentPrices?.cardkingdom_foil_usd && (
                        <span className="text-[11px] text-amber-400 font-medium">
                          Foil: ${currentPrices.cardkingdom_foil_usd.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                    <span className="text-xs text-neutral-400 block font-medium">TCGplayer</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-bold text-sky-400">
                        {tcgPrice ? `$${tcgPrice.toFixed(2)}` : 'N/A'}
                      </span>
                      {currentPrices?.tcgplayer_foil_usd && (
                        <span className="text-[11px] text-amber-400 font-medium">
                          Foil: ${currentPrices.tcgplayer_foil_usd.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banner de Spread / Arbitraje */}
                {priceSpread && (
                  <div className="px-3 py-1.5 bg-neutral-950/60 border border-neutral-800/80 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">
                      Spread de mercado:{' '}
                      <strong className="text-neutral-200">${priceSpread.diff} USD</strong>
                    </span>
                    <span className="text-emerald-400 font-medium">
                      Más bajo en: {priceSpread.cheaper}
                    </span>
                  </div>
                )}

                {/* Controles de la Gráfica */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/60 text-xs">
                  {/* Selector Tienda */}
                  <div className="flex rounded-lg overflow-hidden border border-neutral-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setStore('cardkingdom')}
                      className={`px-2.5 py-1 ${
                        store === 'cardkingdom'
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      CK
                    </button>
                    <button
                      type="button"
                      onClick={() => setStore('tcgplayer')}
                      className={`px-2.5 py-1 ${
                        store === 'tcgplayer'
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      TCG
                    </button>
                  </div>

                  {/* Selector Acabado */}
                  <div className="flex rounded-lg overflow-hidden border border-neutral-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFinish('normal')}
                      className={`px-2.5 py-1 ${
                        finish === 'normal'
                          ? 'bg-neutral-700 text-white font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinish('foil')}
                      className={`px-2.5 py-1 ${
                        finish === 'foil'
                          ? 'bg-neutral-700 text-amber-300 font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      ✨ Foil
                    </button>
                  </div>

                  {/* Selector Rango Días */}
                  <div className="flex rounded-lg overflow-hidden border border-neutral-800 text-[11px]">
                    {[30, 90, 180].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(d)}
                        className={`px-2 py-1 ${
                          days === d
                            ? 'bg-neutral-700 text-white font-semibold'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contenedor Gráfica */}
                <div className="w-full h-40 bg-neutral-950 border border-neutral-800 rounded-xl p-2 relative flex items-center justify-center">
                  {loadingPrices ? (
                    <span className="text-xs text-neutral-500 animate-pulse">
                      Cargando serie temporal...
                    </span>
                  ) : historyPoints.length > 0 ? (
                    <PriceChart data={historyPoints} />
                  ) : (
                    <span className="text-xs text-neutral-500 text-center px-4">
                      Sin cotizaciones registradas para {store.toUpperCase()} ({finish}) en {days} días.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------- */}
            {/* PESTAÑA 2: REGLAS, STATS Y LEGALIDADES                    */}
            {/* --------------------------------------------------------- */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                {/* Cuadro de texto Oracle */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                  <p className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line font-serif">
                    {oracleText}
                  </p>
                  {flavorText && (
                    <p className="text-[11px] text-neutral-500 italic pt-2 border-t border-neutral-900 font-serif">
                      "{flavorText}"
                    </p>
                  )}
                  {(powerToughness || loyalty) && (
                    <div className="pt-2 flex justify-end font-bold text-xs text-amber-400 font-mono">
                      {powerToughness || loyalty}
                    </div>
                  )}
                </div>

                {/* Badges de Formatos y Legalidades */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Legalidad de Formatos
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {TRACKED_FORMATS.map(({ key, label }) => {
                      const status = legalities[key] || 'not_legal';
                      const isLegal = status === 'legal';
                      const isRestricted = status === 'restricted';

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-950 border border-neutral-800/80 rounded-lg text-xs"
                        >
                          <span className="text-neutral-300 font-medium">{label}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isLegal
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : isRestricted
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                                : 'bg-neutral-900 text-neutral-500'
                            }`}
                          >
                            {isLegal ? 'Legal' : isRestricted ? 'Restringida' : 'No Legal'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pie de acciones del modal */}
          <div className="mt-5 pt-3 border-t border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
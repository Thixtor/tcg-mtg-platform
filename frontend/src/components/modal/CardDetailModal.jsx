// ---------------------------------------------------------
// MODAL DE DETALLE Y ANALÍTICA DE MERCADO
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { getCurrentPricesApi, getPriceHistoryApi } from '../../api/prices';
import { PriceChart } from './PriceChart';

export function CardDetailModal({ card, onClose }) {
  const [currentPrices, setCurrentPrices] = useState(null);
  const [historyPoints, setHistoryPoints] = useState([]);
  const [store, setStore] = useState('cardkingdom'); // 'cardkingdom' | 'tcgplayer'
  const [finish, setFinish] = useState('normal');      // 'normal' | 'foil'
  const [days, setDays] = useState(90);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const imageUrl = card?.image_url || card?.scryfall_raw_data?.image_uris?.normal;

  useEffect(() => {
    if (!card?.id) return;
    getCurrentPricesApi(card.id)
      .then(setCurrentPrices)
      .catch((err) => console.error('Error al cargar cotizaciones vigentes:', err));
  }, [card?.id]);

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

  if (!card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Botón de cierre */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-full transition-colors"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        {/* Columna Izquierda: Imagen */}
        <div className="w-full md:w-5/12 bg-neutral-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800">
          <div className="w-full max-w-[280px] aspect-[2.5/3.5] relative rounded-lg overflow-hidden shadow-2xl">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full h-full object-contain select-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
                Sin vista previa
              </div>
            )}
          </div>
          <span className="text-[11px] text-neutral-500 mt-4 text-center">
            Ilustración © Wizards of the Coast[cite: 1]
          </span>
        </div>

        {/* Columna Derecha: Cotizaciones */}
        <div className="w-full md:w-7/12 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 font-mono text-xs rounded uppercase font-semibold">
                {(card.set || card.scryfall_raw_data?.set || '').toUpperCase()}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                #{card.scryfall_raw_data?.collector_number || 'N/A'}
              </span>
            </div>
            
            <h2 className="text-xl font-bold text-neutral-100">{card.name}</h2>
            <p className="text-xs text-neutral-400 mb-4">{card.type_line}</p>

            {/* Fichas de precios actuales */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-xs text-neutral-400 block font-medium">Card Kingdom</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-emerald-400">
                    {currentPrices?.cardkingdom_usd ? `$${currentPrices.cardkingdom_usd.toFixed(2)}` : 'N/A'}
                  </span>
                  {currentPrices?.cardkingdom_foil_usd && (
                    <span className="text-xs text-amber-400 font-medium">
                      Foil: ${currentPrices.cardkingdom_foil_usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-xs text-neutral-400 block font-medium">TCGplayer</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-bold text-sky-400">
                    {currentPrices?.tcgplayer_usd ? `$${currentPrices.tcgplayer_usd.toFixed(2)}` : 'N/A'}
                  </span>
                  {currentPrices?.tcgplayer_foil_usd && (
                    <span className="text-xs text-amber-400 font-medium">
                      Foil: ${currentPrices.tcgplayer_foil_usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filtros de la gráfica */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-neutral-950/70 p-2 rounded-lg border border-neutral-800/60">
              <div className="flex rounded-md overflow-hidden border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setStore('cardkingdom')}
                  className={`px-2.5 py-1 ${store === 'cardkingdom' ? 'bg-amber-600 text-white font-semibold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                >
                  CK
                </button>
                <button
                  type="button"
                  onClick={() => setStore('tcgplayer')}
                  className={`px-2.5 py-1 ${store === 'tcgplayer' ? 'bg-amber-600 text-white font-semibold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                >
                  TCGplayer
                </button>
              </div>

              <div className="flex rounded-md overflow-hidden border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFinish('normal')}
                  className={`px-2.5 py-1 ${finish === 'normal' ? 'bg-neutral-700 text-white font-semibold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setFinish('foil')}
                  className={`px-2.5 py-1 ${finish === 'foil' ? 'bg-neutral-700 text-amber-300 font-semibold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                >
                  ✨ Foil
                </button>
              </div>

              <div className="flex rounded-md overflow-hidden border border-neutral-800 text-xs">
                {[30, 90, 180].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`px-2 py-1 ${days === d ? 'bg-neutral-700 text-white font-semibold' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Contenedor Gráfica */}
            <div className="w-full h-44 bg-neutral-950 border border-neutral-800 rounded-xl p-2 relative flex items-center justify-center">
              {loadingPrices ? (
                <span className="text-xs text-neutral-500 animate-pulse">Cargando serie temporal...</span>
              ) : historyPoints.length > 0 ? (
                <PriceChart data={historyPoints} />
              ) : (
                <span className="text-xs text-neutral-500">Sin datos de cotización en el rango seleccionado</span>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-neutral-800">
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
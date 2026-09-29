// ---------------------------------------------------------
// MODAL: SIMULADOR DE MANO INICIAL Y MULLIGAN DE LONDRES
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { X, Dices, RotateCcw, ArrowDownCircle, CheckCircle2 } from 'lucide-react';

export default function OpeningHandSimulatorModal({ isOpen, onClose, cards, deckName }) {
  const [deckPool, setDeckPool] = useState([]);
  const [currentHand, setCurrentHand] = useState([]);
  const [mulliganCount, setMulliganCount] = useState(0);
  const [bottomCards, setBottomCards] = useState([]);

  // Expande las cartas según quantity_needed y excluye comandantes
  const buildFullDeckPool = useCallback(() => {
    const pool = [];
    cards
      .filter((c) => c.category !== 'commander')
      .forEach((c) => {
        const qty = c.quantity_needed || 1;
        for (let i = 0; i < qty; i++) {
          pool.push({
            ...c,
            uniqueInstanceId: `${c.deck_card_id || c.scryfall_card_id}_${i}_${Math.random()}`
          });
        }
      });
    return pool;
  }, [cards]);

  const drawHand = useCallback((pool, mulligans = 0) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const hand = shuffled.slice(0, 7);
    setCurrentHand(hand);
    setMulliganCount(mulligans);
    setBottomCards([]);
  }, []);

  const resetSimulation = () => {
    const pool = buildFullDeckPool();
    setDeckPool(pool);
    drawHand(pool, 0);
  };

  useEffect(() => {
    if (isOpen) {
      resetSimulation();
    }
  }, [isOpen, buildFullDeckPool]);

  if (!isOpen) return null;

  const handleTakeMulligan = () => {
    drawHand(deckPool, mulliganCount + 1);
  };

  const toggleSelectBottomCard = (instanceId) => {
    if (mulliganCount === 0) return;

    if (bottomCards.includes(instanceId)) {
      setBottomCards(bottomCards.filter((id) => id !== instanceId));
    } else {
      if (bottomCards.length < mulliganCount) {
        setBottomCards([...bottomCards, instanceId]);
      }
    }
  };

  const landsInHand = currentHand.filter((c) =>
    (c.type_line || c.name || '').toLowerCase().includes('land') ||
    (c.type_line || '').toLowerCase().includes('tierra')
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-5xl w-full flex flex-col overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Probador de Mano Inicial & Mulligan</h3>
              <p className="text-xs text-neutral-400 font-mono">{deckName} ({deckPool.length} cartas en biblioteca)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Control y Resumen */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-neutral-300 font-mono">
              Mulligans tomados: <strong className="text-amber-400 font-bold">{mulliganCount}</strong>
            </span>
            <span className="text-neutral-300 font-mono">
              Tierras en mano: <strong className="text-emerald-400 font-bold">{landsInHand} / 7</strong>
            </span>
            {mulliganCount > 0 && (
              <span className="text-neutral-400 font-mono">
                Regla de Londres: Selecciona <strong className="text-rose-400">{mulliganCount}</strong> carta(s) para poner en el fondo ({bottomCards.length}/{mulliganCount})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTakeMulligan}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" /> Tomar Mulligan
            </button>
            <button
              onClick={resetSimulation}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold flex items-center gap-1.5 transition shadow"
            >
              <Dices className="w-3.5 h-3.5" /> Nueva Mano (Reset)
            </button>
          </div>
        </div>

        {/* Área de Visualización de las 7 Cartas */}
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {currentHand.map((card) => {
              const isMarkedBottom = bottomCards.includes(card.uniqueInstanceId);
              return (
                <div
                  key={card.uniqueInstanceId}
                  onClick={() => toggleSelectBottomCard(card.uniqueInstanceId)}
                  className={`group relative rounded-xl border overflow-hidden cursor-pointer transition transform duration-200 flex flex-col bg-neutral-950 ${
                    isMarkedBottom
                      ? 'border-rose-500 opacity-40 scale-95'
                      : 'border-neutral-800 hover:border-amber-500 hover:-translate-y-1'
                  }`}
                >
                  <div className="aspect-[2.5/3.5] w-full bg-neutral-900 relative">
                    {card.image_url ? (
                      <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2 text-center text-[10px] text-neutral-400">
                        {card.name}
                      </div>
                    )}

                    {isMarkedBottom && (
                      <div className="absolute inset-0 bg-rose-950/70 flex flex-col items-center justify-center text-rose-300 font-mono text-[10px] font-bold p-1 text-center">
                        <ArrowDownCircle className="w-5 h-5 mb-1" />
                        Al fondo de biblioteca
                      </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-neutral-800/80 bg-neutral-950">
                    <p className="text-[11px] font-semibold text-white truncate">{card.name}</p>
                    <span className="text-[9px] text-neutral-400 font-mono block truncate">
                      {(card.type_line || card.category || 'MTG Card')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie Informativo */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <span>Simulación probabilística basada en la baraja activa.</span>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
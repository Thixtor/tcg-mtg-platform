// ---------------------------------------------------------
// COMPONENTE GRÁFICA VECTORIAL DE PRECIOS (SVG)
// ---------------------------------------------------------
import React from 'react';

export function PriceChart({ data }) {
  if (!data || data.length < 2) {
    return <span className="text-xs text-neutral-500">Puntos insuficientes para graficar</span>;
  }

  const prices = data.map((d) => Number(d.precio_usd));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const width = 400;
  const height = 140;
  const padding = 20;

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((Number(d.precio_usd) - minPrice) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const firstDate = data[0].fecha;
  const lastDate = data[data.length - 1].fecha;

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((d, idx) => {
          if (idx === 0 || idx === data.length - 1) {
            const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
            const y = height - padding - ((Number(d.precio_usd) - minPrice) / range) * (height - padding * 2);
            return <circle key={idx} cx={x} cy={y} r="3.5" className="fill-emerald-400 stroke-neutral-900 stroke-2" />;
          }
          return null;
        })}
      </svg>

      <div className="flex justify-between items-center text-[10px] text-neutral-500 px-2 font-mono">
        <span>{firstDate} (${prices[0].toFixed(2)})</span>
        <span>Máx: ${maxPrice.toFixed(2)} \vert{} Mín: ${minPrice.toFixed(2)}</span>
        <span>{lastDate} (${prices[prices.length - 1].toFixed(2)})</span>
      </div>
    </div>
  );
}
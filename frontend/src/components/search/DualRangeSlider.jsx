// ---------------------------------------------------------
// COMPONENTE: DUAL RANGE SLIDER (PUNTAS RECTAS & SIN BLOQUEO)
// ---------------------------------------------------------
import React from 'react';

export default function DualRangeSlider({
  min = 0,
  max = 16,
  step = 1,
  valueMin = 0,
  valueMax = 16,
  onChangeMin,
  onChangeMax,
  accentColor = 'amber', // 'amber' | 'emerald'
}) {
  const percentMin = Math.round(((valueMin - min) / (max - min)) * 100);
  const percentMax = Math.round(((valueMax - min) / (max - min)) * 100);

  const handleMinChange = (e) => {
    const val = Math.min(Number(e.target.value), valueMax);
    onChangeMin(val);
  };

  const handleMaxChange = (e) => {
    const val = Math.max(Number(e.target.value), valueMin);
    onChangeMax(val);
  };

  const activeBg = accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-[#E88B00]';
  const thumbAccent = accentColor === 'emerald' ? 'accent-emerald-400' : 'accent-[#E88B00]';

  // Si el valor mínimo está muy cerca del máximo, elevamos el z-index del mínimo para que siempre sea arrastrable
  const isMinCloserToMax = valueMin > max - (max - min) * 0.15;

  return (
    <div className="relative w-full h-7 flex items-center select-none">
      {/* Pista base de fondo recta */}
      <div className="absolute w-full h-1.5 rounded-none bg-[#2A2733] pointer-events-none" />

      {/* Rango activo coloreado entre ambos puntos */}
      <div
        className={`absolute h-1.5 rounded-none ${activeBg} pointer-events-none transition-all duration-75`}
        style={{
          left: `${percentMin}%`,
          width: `${percentMax - percentMin}%`,
        }}
      />

      {/* Thumb 1: Límite Inferior (Mínimo) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMin}
        onChange={handleMinChange}
        className={`absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer ${thumbAccent} ${
          isMinCloserToMax ? 'z-30' : 'z-20'
        } focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto pointer-events-none`}
      />

      {/* Thumb 2: Límite Superior (Máximo) */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valueMax}
        onChange={handleMaxChange}
        className={`absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer ${thumbAccent} ${
          isMinCloserToMax ? 'z-20' : 'z-25'
        } focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto pointer-events-none`}
      />
    </div>
  );
}
// ---------------------------------------------------------
// 6. COMPONENTE SEARCHBAR CON FEEDBACK VISUAL
// ---------------------------------------------------------
import React from 'react';

export function SearchBar({ value, onChange, onClear, placeholder = 'Buscar por nombre (ej: Sol Ring, Black Lotus)...' }) {
  return (
    <div className="relative w-full max-w-2xl mx-auto my-4">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-11 pr-10 text-sm bg-neutral-900 border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"
        />
        {/* Icono de búsqueda */}
        <span className="absolute left-3.5 text-neutral-400 select-none">
          🔍
        </span>
        {/* Botón de limpiar input */}
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 text-neutral-400 hover:text-neutral-200 text-sm font-semibold p-1"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
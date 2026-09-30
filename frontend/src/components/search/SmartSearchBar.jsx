// ---------------------------------------------------------
// COMPONENTE: OMNIBOX DE BÚSQUEDA RÁPIDA (MANA FONT INTEGRADO)
// ---------------------------------------------------------
import React, { useState, useRef, useMemo } from 'react';
import { Search, Sparkles, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

const SUGGESTIONS_MAP = {
  't:': [
    { label: 'Criatura', val: 'creature' },
    { label: 'Instantáneo', val: 'instant' },
    { label: 'Conjuro', val: 'sorcery' },
    { label: 'Artefacto', val: 'artifact' },
    { label: 'Encantamiento', val: 'enchantment' },
    { label: 'Tierra', val: 'land' },
    { label: 'Planeswalker', val: 'planeswalker' },
    { label: 'Batalla', val: 'battle' }
  ],
  'c:': [
    { label: 'Blanco', val: 'w', icon: 'ms-w' },
    { label: 'Azul', val: 'u', icon: 'ms-u' },
    { label: 'Negro', val: 'b', icon: 'ms-b' },
    { label: 'Rojo', val: 'r', icon: 'ms-r' },
    { label: 'Verde', val: 'g', icon: 'ms-g' },
    { label: 'Incoloro', val: 'c', icon: 'ms-c' }
  ],
  'r:': [
    { label: 'Común', val: 'common' },
    { label: 'Infrecuente', val: 'uncommon' },
    { label: 'Rara', val: 'rare' },
    { label: 'Mítica', val: 'mythic' }
  ],
  'f:': [
    { label: 'Commander', val: 'commander' },
    { label: 'Modern', val: 'modern' },
    { label: 'Standard', val: 'standard' },
    { label: 'Pioneer', val: 'pioneer' }
  ]
};

// Atajos rápidos enfocados en tipos de carta
const CARD_TYPE_PILLS = [
  { id: 'creature', label: 'Criaturas', syntax: 't:creature' },
  { id: 'instant', label: 'Instantáneos', syntax: 't:instant' },
  { id: 'sorcery', label: 'Conjuros', syntax: 't:sorcery' },
  { id: 'artifact', label: 'Artefactos', syntax: 't:artifact' },
  { id: 'enchantment', label: 'Encantamientos', syntax: 't:enchantment' },
  { id: 'land', label: 'Tierras', syntax: 't:land' },
  { id: 'planeswalker', label: 'Planeswalkers', syntax: 't:planeswalker' },
  { id: 'battle', label: 'Batallas', syntax: 't:battle' },
];

export function SmartSearchBar({ value, onChange, onClear }) {
  const [activeSuggestionKey, setActiveSuggestionKey] = useState(null);
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  const inputRef = useRef(null);

  // ---------------------------------------------------------
  // MANEJADORES DE ENTRADA Y SINTAXIS
  // ---------------------------------------------------------
  const handleInputChange = (e) => {
    const text = e.target.value;
    onChange(text);

    const words = text.split(/\s+/);
    const currentWord = words[words.length - 1].toLowerCase();

    const matchedKey = Object.keys(SUGGESTIONS_MAP).find(
      (k) => currentWord === k || currentWord.startsWith(k)
    );

    if (matchedKey && currentWord === matchedKey) {
      setActiveSuggestionKey(matchedKey);
    } else {
      setActiveSuggestionKey(null);
    }
  };

  const applySuggestion = (val) => {
    const words = value.trim().split(/\s+/);
    words[words.length - 1] = `${activeSuggestionKey}${val}`;
    const nextVal = `${words.join(' ')} `;
    onChange(nextVal);
    setActiveSuggestionKey(null);
    inputRef.current?.focus();
  };

  const toggleTypePill = (syntax) => {
    let nextText = value;
    if (nextText.includes(syntax)) {
      nextText = nextText.replace(syntax, '').replace(/\s+/g, ' ').trim();
    } else {
      nextText = `${nextText.trim()} ${syntax}`.trim();
    }
    onChange(nextText ? `${nextText} ` : '');
    inputRef.current?.focus();
  };

  const toggleColor = (colorCode) => {
    const match = value.match(/\bc:([wubrgc]+)\b/i);
    if (!match) {
      onChange(`${value.trim()} c:${colorCode} `.trimStart());
    } else {
      let currentColors = match[1].toLowerCase();
      if (currentColors.includes(colorCode)) {
        currentColors = currentColors.replace(colorCode, '');
      } else {
        currentColors += colorCode;
      }

      let updated = '';
      if (currentColors.length === 0) {
        updated = value.replace(match[0], '').replace(/\s+/g, ' ').trim();
      } else {
        updated = value.replace(match[0], `c:${currentColors}`);
      }
      onChange(updated ? `${updated} ` : '');
    }
    inputRef.current?.focus();
  };

  const activeColors = useMemo(() => {
    const match = value.match(/\bc:([wubrgc]+)\b/i);
    return match ? match[1].toLowerCase() : '';
  }, [value]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 mb-6">
      {/* --------------------------------------------------------- */}
      {/* BARRA DE TEXTO REACTIVA                                   */}
      {/* --------------------------------------------------------- */}
      <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl px-3.5 py-2.5 shadow-xl focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
        <Search className="w-5 h-5 text-neutral-400 mr-2 flex-shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="Busca por nombre o escribe operadores (ej. Sol Ring t:artifact c:c mv<=2)..."
          className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 text-sm md:text-base focus:outline-none font-mono"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setActiveSuggestionKey(null);
            }}
            className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors mr-2"
            title="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* --------------------------------------------------------- */}
        {/* RUEDA DE SÍMBOLOS OFICIALES DE MANA FONT (SIN LETRAS)     */}
        {/* --------------------------------------------------------- */}
        <div className="flex items-center gap-1.5 border-l border-neutral-800 pl-3 py-0.5">
          {[
            { id: 'w', sym: 'w', title: 'Blanco {W}' },
            { id: 'u', sym: 'u', title: 'Azul {U}' },
            { id: 'b', sym: 'b', title: 'Negro {B}' },
            { id: 'r', sym: 'r', title: 'Rojo {R}' },
            { id: 'g', sym: 'g', title: 'Verde {G}' },
            { id: 'c', sym: 'c', title: 'Incoloro {C}' },
          ].map((c) => {
            const isSelected = activeColors.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColor(c.id)}
                className={`w-6 h-6 flex items-center justify-center rounded-full transition-transform duration-150 ${
                  isSelected
                    ? 'scale-125 ring-2 ring-amber-400 ring-offset-1 ring-offset-neutral-900 shadow-md'
                    : 'opacity-40 hover:opacity-90 hover:scale-110'
                }`}
                title={c.title}
              >
                <i className={`ms ms-${c.sym} ms-cost ms-shadow text-[15px]`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Menú de sugerencias en vivo */}
      {activeSuggestionKey && SUGGESTIONS_MAP[activeSuggestionKey] && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-neutral-950 border border-amber-500/40 rounded-xl shadow-xl animate-fadeIn">
          <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 mr-2 px-1">
            <Sparkles className="w-3.5 h-3.5" /> Elige {activeSuggestionKey}:
          </span>
          {SUGGESTIONS_MAP[activeSuggestionKey].map((item) => (
            <button
              key={item.val}
              type="button"
              onClick={() => applySuggestion(item.val)}
              className="text-xs px-2.5 py-1 bg-neutral-900 hover:bg-amber-600 text-neutral-200 hover:text-white rounded-lg font-mono transition-colors border border-neutral-800 hover:border-transparent flex items-center gap-1.5"
            >
              {item.icon && <i className={`ms ${item.icon} ms-cost text-[12px]`} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------- */}
      {/* ATAJOS RÁPIDOS Y BOTÓN DE GUÍA                            */}
      {/* --------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar flex-1">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider pl-1 whitespace-nowrap">
            Tipos:
          </span>
          {CARD_TYPE_PILLS.map((pill) => {
            const isActive = value.includes(pill.syntax);
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => toggleTypePill(pill.syntax)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowSyntaxGuide((prev) => !prev)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-400 hover:text-amber-300 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Guía de Sintaxis</span>
          {showSyntaxGuide ? (
            <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>
      </div>

      {/* Guía Desplegable de Sintaxis */}
      {showSyntaxGuide && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 shadow-xl text-xs space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
            <span className="font-bold text-neutral-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Operadores de Sintaxis Scryfall
            </span>
            <span className="text-[11px] text-neutral-500">
              Combina cualquier operador con espacios
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px]">
            <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 space-y-1">
              <div className="text-amber-400 font-bold flex items-center gap-1">
                <span>Colores (c:)</span>
              </div>
              <div className="text-neutral-300 flex items-center gap-1">
                <i className="ms ms-u ms-cost text-[11px]" />
                <span>c:u</span>
                <span className="text-neutral-500 font-sans ml-auto">Azul</span>
              </div>
              <div className="text-neutral-300 flex items-center gap-1">
                <i className="ms ms-r ms-cost text-[11px]" />
                <i className="ms ms-g ms-cost text-[11px]" />
                <span>c:rg</span>
                <span className="text-neutral-500 font-sans ml-auto">Rojo/Verde</span>
              </div>
              <div className="text-neutral-300 flex items-center gap-1">
                <i className="ms ms-c ms-cost text-[11px]" />
                <span>c:c</span>
                <span className="text-neutral-500 font-sans ml-auto">Incoloro</span>
              </div>
            </div>

            <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 space-y-1">
              <div className="text-amber-400 font-bold">Tipos (t:)</div>
              <div className="text-neutral-300">t:creature <span className="text-neutral-500 font-sans">Criatura</span></div>
              <div className="text-neutral-300">t:instant <span className="text-neutral-500 font-sans">Instantáneo</span></div>
              <div className="text-neutral-300">t:dragon <span className="text-neutral-500 font-sans">Subtipo</span></div>
            </div>

            <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 space-y-1">
              <div className="text-amber-400 font-bold">Coste y Stats</div>
              <div className="text-neutral-300">mv&lt;=3 <span className="text-neutral-500 font-sans">Mana &le; 3</span></div>
              <div className="text-neutral-300">pow&gt;=5 <span className="text-neutral-500 font-sans">Fuerza &ge; 5</span></div>
              <div className="text-neutral-300">tou&gt;=4 <span className="text-neutral-500 font-sans">Resistencia</span></div>
            </div>

            <div className="bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800/60 space-y-1">
              <div className="text-amber-400 font-bold">Reglas y Formatos</div>
              <div className="text-neutral-300">f:commander <span className="text-neutral-500 font-sans">Formato</span></div>
              <div className="text-neutral-300">o:"draw a card" <span className="text-neutral-500 font-sans">Regla</span></div>
              <div className="text-neutral-300">kw:flying <span className="text-neutral-500 font-sans">Habilidad</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
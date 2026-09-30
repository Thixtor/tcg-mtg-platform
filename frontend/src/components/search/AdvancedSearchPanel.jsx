// ---------------------------------------------------------
// COMPONENTE: PANEL DE BÚSQUEDA AVANZADA (INTERFAZ LIMPIA)
// ---------------------------------------------------------
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, RotateCcw, Sparkles, X, Plus, Info } from 'lucide-react';
import { getAutocompleteApi } from '../../api/cards';

const FORMATS = [
  { id: '', label: 'Cualquier Formato' },
  { id: 'commander', label: 'Commander' },
  { id: 'modern', label: 'Modern' },
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'vintage', label: 'Vintage' },
  { id: 'pauper', label: 'Pauper' },
];

const RARITIES = [
  { id: 'common', label: 'Común' },
  { id: 'uncommon', label: 'Infrecuente' },
  { id: 'rare', label: 'Rara' },
  { id: 'mythic', label: 'Mítica' },
];

const CANONICAL_CARD_TYPES = [
  { id: 'creature', label: 'Criatura' },
  { id: 'instant', label: 'Instantáneo' },
  { id: 'sorcery', label: 'Conjuro' },
  { id: 'artifact', label: 'Artefacto' },
  { id: 'enchantment', label: 'Encantamiento' },
  { id: 'land', label: 'Tierra' },
  { id: 'planeswalker', label: 'Planeswalker' },
  { id: 'battle', label: 'Batalla' },
  { id: 'kindred', label: 'Kindred' },
  { id: 'dungeon', label: 'Mazmorra' },
  { id: 'plane', label: 'Plano' },
  { id: 'scheme', label: 'Plan' },
  { id: 'conspiracy', label: 'Conspiración' },
];

const PRESET_ORACLE_OPTIONS = [
  { label: 'Destruir objetivo', syntax: 'destroy target' },
  { label: 'Exiliar objetivo', syntax: 'exile target' },
  { label: 'Robar carta', syntax: 'draw a card' },
  { label: 'Contrarrestar', syntax: 'counter target' },
  { label: 'Limpieza de mesa', syntax: 'destroy all' },
  { label: 'Crear Tesoro', syntax: 'create a Treasure' },
  { label: 'Buscar en biblioteca', syntax: 'search your library' },
  { label: 'Contador +1/+1', syntax: '+1/+1 counter' },
];

const QUICK_SKILL_PILLS = [
  'Flying', 'Deathtouch', 'Trample', 'Haste', 'Lifelink', 'Vigilance',
  'First strike', 'Hexproof', 'Ward', 'Flash', 'Cascade', 'Crew'
];

export function AdvancedSearchPanel({ onSearch, onClear, currentQuery = '' }) {
  // ---------------------------------------------------------
  // 1. ESTADO DE LOS FILTROS
  // ---------------------------------------------------------
  const [name, setName] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [artist, setArtist] = useState('');

  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [oracleSuggestions, setOracleSuggestions] = useState([]);
  const [artistSuggestions, setArtistSuggestions] = useState([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);

  const [activeDropdown, setActiveDropdown] = useState(null);

  const [selectedColors, setSelectedColors] = useState([]);
  const [colorMode, setColorMode] = useState('includes');

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedRarities, setSelectedRarities] = useState([]);
  const [format, setFormat] = useState('');

  const [cmcOp, setCmcOp] = useState('<=');
  const [cmcVal, setCmcVal] = useState('');

  const [powerOp, setPowerOp] = useState('>=');
  const [powerVal, setPowerVal] = useState('');

  const [toughnessOp, setToughnessOp] = useState('>=');
  const [toughnessVal, setToughnessVal] = useState('');

  const [setCode, setSetCode] = useState('');

  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------
  // 2. EFECTOS REACTIVOS DE AUTOCOMPLETADO
  // ---------------------------------------------------------
  useEffect(() => {
    if (name.trim().length < 2) {
      setNameSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      getAutocompleteApi('name', name, ctrl.signal)
        .then(setNameSuggestions)
        .catch(() => setNameSuggestions([]));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [name]);

  useEffect(() => {
    if (oracleText.trim().length < 2) {
      setOracleSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      getAutocompleteApi('oracle', oracleText, ctrl.signal)
        .then(setOracleSuggestions)
        .catch(() => setOracleSuggestions([]));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [oracleText]);

  useEffect(() => {
    if (artist.trim().length < 2) {
      setArtistSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      getAutocompleteApi('artist', artist, ctrl.signal)
        .then(setArtistSuggestions)
        .catch(() => setArtistSuggestions([]));
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [artist]);

  useEffect(() => {
    if (keywordInput.trim().length < 1) {
      setKeywordSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      getAutocompleteApi('keyword', keywordInput, ctrl.signal)
        .then((res) => {
          setKeywordSuggestions(res.filter((k) => !selectedKeywords.includes(k)));
        })
        .catch(() => setKeywordSuggestions([]));
    }, 120);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [keywordInput, selectedKeywords]);

  // ---------------------------------------------------------
  // 3. COMPILADOR EN TIEMPO REAL DE SINTAXIS SCRYFALL
  // ---------------------------------------------------------
  const compiledQuery = useMemo(() => {
    const tokens = [];

    if (name.trim()) tokens.push(name.trim());
    if (oracleText.trim()) tokens.push(`o:"${oracleText.trim()}"`);

    selectedKeywords.forEach((k) => {
      tokens.push(`kw:"${k}"`);
    });

    if (artist.trim()) tokens.push(`a:"${artist.trim()}"`);

    if (selectedColors.length > 0) {
      const cStr = selectedColors.join('');
      if (colorMode === 'includes') tokens.push(`c:${cStr}`);
      else if (colorMode === 'exact') tokens.push(`c=${cStr}`);
      else if (colorMode === 'at_most') tokens.push(`c<=${cStr}`);
      else if (colorMode === 'identity') tokens.push(`id<=${cStr}`);
    }

    selectedTypes.forEach((t) => tokens.push(`t:${t}`));
    selectedRarities.forEach((r) => tokens.push(`r:${r}`));
    if (format) tokens.push(`f:${format}`);

    if (cmcVal !== '') tokens.push(`mv${cmcOp}${cmcVal}`);
    if (powerVal !== '') tokens.push(`pow${powerOp}${powerVal}`);
    if (toughnessVal !== '') tokens.push(`tou${toughnessOp}${toughnessVal}`);

    if (setCode.trim()) tokens.push(`s:${setCode.trim().toLowerCase()}`);

    return tokens.join(' ');
  }, [
    name, oracleText, selectedKeywords, artist,
    selectedColors, colorMode, selectedTypes, selectedRarities,
    format, cmcOp, cmcVal, powerOp, powerVal,
    toughnessOp, toughnessVal, setCode
  ]);

  const addKeyword = (kw) => {
    const clean = kw.trim();
    if (clean && !selectedKeywords.includes(clean)) {
      setSelectedKeywords((prev) => [...prev, clean]);
    }
    setKeywordInput('');
    setKeywordSuggestions([]);
    setActiveDropdown(null);
  };

  const removeKeyword = (kw) => {
    setSelectedKeywords((prev) => prev.filter((item) => item !== kw));
  };

  const toggleColor = (c) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const toggleType = (tId) => {
    setSelectedTypes((prev) =>
      prev.includes(tId) ? prev.filter((x) => x !== tId) : [...prev, tId]
    );
  };

  const toggleRarity = (r) => {
    setSelectedRarities((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const handleReset = () => {
    setName('');
    setOracleText('');
    setSelectedKeywords([]);
    setKeywordInput('');
    setArtist('');
    setSelectedColors([]);
    setColorMode('includes');
    setSelectedTypes([]);
    setSelectedRarities([]);
    setFormat('');
    setCmcOp('<=');
    setCmcVal('');
    setPowerOp('>=');
    setPowerVal('');
    setToughnessOp('>=');
    setToughnessVal('');
    setSetCode('');
    setActiveDropdown(null);
    onClear && onClear();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (compiledQuery.trim()) {
      onSearch(compiledQuery.trim());
    }
  };

  return (
    <form
      ref={panelRef}
      onSubmit={handleSubmit}
      className="w-full max-w-6xl mx-auto space-y-5 animate-fadeIn text-neutral-200"
    >
      {/* --------------------------------------------------------- */}
      {/* NOTA ACLARATORIA DE IDIOMA                                */}
      {/* --------------------------------------------------------- */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-neutral-900/80 border border-neutral-800 rounded-xl text-xs text-neutral-400">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          <strong className="text-neutral-200">Nota de búsqueda:</strong> Los nombres de cartas, textos de reglas y palabras clave están registrados en <strong className="text-amber-400">inglés</strong>. Ingresa los términos en inglés en los campos de texto para encontrar resultados.
        </span>
      </div>

      {/* --------------------------------------------------------- */}
      {/* BARRA SUPERIOR: SINTAXIS SCRYFALL                         */}
      {/* --------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-2.5 shadow-2xl focus-within:border-amber-500/80 transition-colors">
        <div className="flex-1 flex items-center px-3 py-1 font-mono text-sm overflow-x-auto no-scrollbar">
          {compiledQuery ? (
            <span className="text-amber-400 font-semibold tracking-wide">
              {compiledQuery}
            </span>
          ) : (
            <span className="text-neutral-500 italic">
              — tu búsqueda con sintaxis Scryfall aparecerá aquí —
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-md active:scale-98"
          >
            <Search className="w-4 h-4" />
            <span>Buscar</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* GRID DE FILTROS EN 3 COLUMNAS                             */}
      {/* --------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* COLUMNA 1: TEXTOS Y TIPOS DE CARTA */}
        <div className="space-y-5">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
              Texto de la Carta
            </h3>

            {/* Input Nombre */}
            <div className="space-y-1 relative">
              <label className="text-xs text-neutral-400">Nombre de la carta (en inglés)</label>
              <input
                type="text"
                value={name}
                onFocus={() => setActiveDropdown('name')}
                onChange={(e) => {
                  setName(e.target.value);
                  setActiveDropdown('name');
                }}
                placeholder="ej. Lightning Bolt, Counterspell"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
              {activeDropdown === 'name' && nameSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto">
                  {nameSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setName(sug);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-amber-400 transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Oráculo */}
            <div className="space-y-1.5 relative">
              <label className="text-xs text-neutral-400">Texto del oráculo / reglas (en inglés)</label>
              <input
                type="text"
                value={oracleText}
                onFocus={() => setActiveDropdown('oracle')}
                onChange={(e) => {
                  setOracleText(e.target.value);
                  setActiveDropdown('oracle');
                }}
                placeholder="ej. draw a card, destroy target..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono"
              />
              {activeDropdown === 'oracle' && oracleSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl py-1 max-h-44 overflow-y-auto">
                  {oracleSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setOracleText(sug);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-amber-400 transition-colors line-clamp-1 font-mono"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              {/* Botones predefinidos en español */}
              <div className="flex flex-wrap gap-1 pt-1">
                {PRESET_ORACLE_OPTIONS.map((item) => (
                  <button
                    key={item.syntax}
                    type="button"
                    onClick={() => {
                      setOracleText(item.syntax);
                      setActiveDropdown(null);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                      oracleText === item.syntax
                        ? 'bg-amber-600/30 text-amber-300 border-amber-500/60 font-semibold'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-amber-300 hover:border-amber-500/40'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Palabras Clave (Skills) */}
            <div className="space-y-1.5 relative">
              <label className="text-xs text-neutral-400">Palabras clave / Habilidades</label>
              <div className="flex flex-wrap gap-1.5 min-h-[34px] p-1.5 bg-neutral-950 border border-neutral-800 rounded-xl focus-within:border-amber-500 transition-colors">
                {selectedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold animate-fadeIn"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={keywordInput}
                  onFocus={() => setActiveDropdown('keyword')}
                  onChange={(e) => {
                    setKeywordInput(e.target.value);
                    setActiveDropdown('keyword');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keywordInput.trim()) {
                      e.preventDefault();
                      addKeyword(keywordInput.trim());
                    }
                  }}
                  placeholder={selectedKeywords.length === 0 ? 'ej. Flying, Trample, Ward...' : '+ habilidad'}
                  className="flex-1 bg-transparent px-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none min-w-[80px]"
                />
              </div>

              {activeDropdown === 'keyword' && keywordSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl py-1 max-h-40 overflow-y-auto">
                  {keywordSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => addKeyword(sug)}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-amber-400 transition-colors flex items-center justify-between"
                    >
                      <span>{sug}</span>
                      <Plus className="w-3 h-3 text-amber-500" />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK_SKILL_PILLS.filter((k) => !selectedKeywords.includes(k))
                  .slice(0, 6)
                  .map((pop) => (
                    <button
                      key={pop}
                      type="button"
                      onClick={() => addKeyword(pop)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-300 hover:border-amber-500/40 transition-colors"
                    >
                      + {pop}
                    </button>
                  ))}
              </div>
            </div>

            {/* Input Artista */}
            <div className="space-y-1 relative">
              <label className="text-xs text-neutral-400">Artista / Ilustrador</label>
              <input
                type="text"
                value={artist}
                onFocus={() => setActiveDropdown('artist')}
                onChange={(e) => {
                  setArtist(e.target.value);
                  setActiveDropdown('artist');
                }}
                placeholder="ej. Rebecca Guay, Seb McKinnon"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
              {activeDropdown === 'artist' && artistSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl py-1 max-h-40 overflow-y-auto">
                  {artistSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setArtist(sug);
                        setActiveDropdown(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800 hover:text-amber-400 transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tipos de Carta */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
                Tipos de Carta
              </h3>
              {selectedTypes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTypes([])}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300"
                >
                  Limpiar tipos
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {CANONICAL_CARD_TYPES.map((t) => {
                const isSelected = selectedTypes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-500 font-semibold shadow-xs'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA 2: COLOR (SÍMBOLOS DESTACADOS EN TAMAÑO) */}
        <div className="space-y-5">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
                Color e Identidad
              </h3>
              {selectedColors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedColors([])}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300"
                >
                  Limpiar colores
                </button>
              )}
            </div>

            {/* Símbolos vectoriales en tamaño 24px dentro de botón 40x40px */}
            <div className="flex items-center justify-between gap-1.5 py-2 px-1 bg-neutral-950/60 rounded-xl border border-neutral-800/80">
              {[
                { id: 'w', sym: 'w', title: 'Blanco {W}' },
                { id: 'u', sym: 'u', title: 'Azul {U}' },
                { id: 'b', sym: 'b', title: 'Negro {B}' },
                { id: 'r', sym: 'r', title: 'Rojo {R}' },
                { id: 'g', sym: 'g', title: 'Verde {G}' },
                { id: 'c', sym: 'c', title: 'Incoloro {C}' },
              ].map((c) => {
                const isSelected = selectedColors.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleColor(c.id)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                      isSelected
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-lg scale-110'
                        : 'border border-transparent hover:bg-neutral-800/70 opacity-40 hover:opacity-100 hover:scale-105'
                    }`}
                    title={c.title}
                  >
                    <i className={`ms ms-${c.sym} ms-cost ms-shadow text-2xl`} />
                  </button>
                );
              })}
            </div>

            {/* Modos de Color en Español */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              {[
                { id: 'includes', label: 'Incluye (c:)' },
                { id: 'exact', label: 'Exactamente (c=)' },
                { id: 'at_most', label: 'Como máximo (c<=)' },
                { id: 'identity', label: 'Identidad (id<=)' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setColorMode(mode.id)}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                    colorMode === mode.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-semibold shadow-xs'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rareza */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
              Rareza de Impresión
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {RARITIES.map((r) => {
                const isSelected = selectedRarities.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRarity(r.id)}
                    className={`py-2 px-2.5 rounded-xl border text-xs text-center transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-500 font-semibold shadow-xs'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formato Legal */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
              Formato Legal
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {FORMATS.map((f) => {
                const isSelected = format === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`py-2 px-2.5 rounded-xl border text-xs text-center transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-500 font-semibold shadow-xs'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMNA 3: ESTADÍSTICAS Y EDICIÓN */}
        <div className="space-y-5">
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
              Estadísticas
            </h3>

            {/* Valor de Maná */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 w-28">Valor de maná (MV)</span>
              <select
                value={cmcOp}
                onChange={(e) => setCmcOp(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
              >
                <option value="<=">&le;</option>
                <option value=">=">&ge;</option>
                <option value="=">=</option>
                <option value="<">&lt;</option>
                <option value=">">&gt;</option>
              </select>
              <input
                type="number"
                min="0"
                max="16"
                value={cmcVal}
                onChange={(e) => setCmcVal(e.target.value)}
                placeholder="0 - 16"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Fuerza */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 w-28">Fuerza (Power)</span>
              <select
                value={powerOp}
                onChange={(e) => setPowerOp(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
              >
                <option value=">=">&ge;</option>
                <option value="<=">&le;</option>
                <option value="=">=</option>
              </select>
              <input
                type="number"
                min="0"
                max="20"
                value={powerVal}
                onChange={(e) => setPowerVal(e.target.value)}
                placeholder="0 - 20"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Resistencia */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 w-28">Resistencia (Toughness)</span>
              <select
                value={toughnessOp}
                onChange={(e) => setToughnessOp(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-200 focus:outline-none"
              >
                <option value=">=">&ge;</option>
                <option value="<=">&le;</option>
                <option value="=">=</option>
              </select>
              <input
                type="number"
                min="0"
                max="20"
                value={toughnessVal}
                onChange={(e) => setToughnessVal(e.target.value)}
                placeholder="0 - 20"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Edición */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
              Edición / Expansión
            </h3>
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Código de set (3–5 letras)</label>
              <input
                type="text"
                maxLength={5}
                value={setCode}
                onChange={(e) => setSetCode(e.target.value)}
                placeholder="ej. MKM, LTR, NEO, MH3..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 uppercase font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Ingresa el código oficial de la expansión (ej: <code className="text-neutral-400">BLB</code> para Bloomburrow, <code className="text-neutral-400">LTR</code> para Lord of the Rings).
            </p>
          </div>
        </div>

      </div>
    </form>
  );
}
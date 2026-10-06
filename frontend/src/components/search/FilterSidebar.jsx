// ---------------------------------------------------------
// COMPONENTE: BARRA LATERAL FACETADA CINEMATOGRÁFICA (SIN BORDES)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Sparkles, 
  Flame, 
  Shield, 
  Swords, 
  Zap, 
  Layers,
  Plus
} from 'lucide-react';

const COLOR_SYMBOLS = [
  { id: 'w', sym: 'w', label: 'Blanco' },
  { id: 'u', sym: 'u', label: 'Azul' },
  { id: 'b', sym: 'b', label: 'Negro' },
  { id: 'r', sym: 'r', label: 'Rojo' },
  { id: 'g', sym: 'g', label: 'Verde' },
  { id: 'c', sym: 'c', label: 'Incoloro' },
];

const GUILD_SHORTCUTS = [
  { label: 'W/U', val: 'wu' },
  { label: 'U/B', val: 'ub' },
  { label: 'B/R', val: 'br' },
  { label: 'R/G', val: 'rg' },
  { label: 'G/W', val: 'gw' },
  { label: 'W/B', val: 'wb' },
  { label: 'U/R', val: 'ur' },
  { label: 'B/G', val: 'bg' },
  { label: 'R/W', val: 'rw' },
  { label: 'G/U', val: 'gu' },
];

const CARD_TYPES = [
  { id: 'creature', label: 'Criatura', icon: Swords },
  { id: 'instant', label: 'Instantáneo', icon: Zap },
  { id: 'sorcery', label: 'Conjuro', icon: Flame },
  { id: 'artifact', label: 'Artefacto', icon: Shield },
  { id: 'enchantment', label: 'Encantamiento', icon: Sparkles },
  { id: 'planeswalker', label: 'Planeswalker', icon: Layers },
  { id: 'land', label: 'Tierra', icon: Filter },
  { id: 'battle', label: 'Batalla', icon: Swords },
];

const RARITIES = [
  { id: 'common', label: 'Común' },
  { id: 'uncommon', label: 'Infrecuente' },
  { id: 'rare', label: 'Rara' },
  { id: 'mythic', label: 'Mítica' },
];

const FORMATS = [
  { id: '', label: 'Cualquier Formato' },
  { id: 'commander', label: 'Commander' },
  { id: 'modern', label: 'Modern' },
  { id: 'standard', label: 'Standard' },
  { id: 'pioneer', label: 'Pioneer' },
  { id: 'legacy', label: 'Legacy' },
  { id: 'pauper', label: 'Pauper' },
];

const POPULAR_KEYWORDS = [
  'Flying', 'Deathtouch', 'Trample', 'Haste', 'Lifelink', 
  'Vigilance', 'First strike', 'Hexproof', 'Ward', 'Cascade'
];

export function FilterSidebar({
  oracleText = '',
  onChangeOracleText,
  selectedColors = [],
  onToggleColor,
  colorMode = 'includes',
  onChangeColorMode,
  selectedTypes = [],
  onToggleType,
  selectedRarities = [],
  onToggleRarity,
  cmcMax = 16,
  onChangeCmcMax,
  powerVal = '',
  onChangePowerVal,
  toughnessVal = '',
  onChangeToughnessVal,
  format = '',
  onChangeFormat,
  maxPrice = '',
  onChangeMaxPrice,
  setCode = '',
  onChangeSetCode,
  artist = '',
  onChangeArtist,
  selectedKeywords = [],
  onToggleKeyword,
  isLightMode = false,
}) {
  const [openSections, setOpenSections] = useState({
    text: true,
    color: true,
    types: true,
    rarity: true,
    cmc: true,
    stats: false,
    format: false,
    price: false,
    more: false,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
      {/* Contenedor sin bordes: degradado ambiental y sombra profunda tipo Homepage */}
      <div className={`backdrop-blur-md rounded-2xl p-5 shadow-xl space-y-5 transition-colors ${
        isLightMode 
          ? 'bg-white/80 shadow-neutral-200/60 text-neutral-800' 
          : 'bg-[#121214]/90 shadow-black/50 text-neutral-200'
      }`}>
        
        {/* Cabecera sin líneas rígidas */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-500 flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros Avanzados
          </span>
        </div>

        {/* 1. TEXTO / EFECTO DE LA CARTA (Antes Oracle) */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('text')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Texto o efecto de la carta</span>
            {openSections.text ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.text && (
            <div className="pt-1">
              <input
                id="filter-oracle-text"
                name="oracleText"
                type="text"
                value={oracleText}
                onChange={(e) => onChangeOracleText(e.target.value)}
                placeholder="ej. draw a card, destroy target..."
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono outline-none transition-all shadow-inner ${
                  isLightMode 
                    ? 'bg-[#FAF7F2] text-neutral-900 placeholder-neutral-400 focus:ring-1 focus:ring-amber-500' 
                    : 'bg-black/40 text-neutral-100 placeholder-neutral-600 focus:ring-1 focus:ring-amber-500/80'
                }`}
              />
            </div>
          )}
        </div>

        {/* 2. IDENTIDAD DE COLOR */}
        <div className="space-y-2.5 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('color')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Identidad de Color</span>
            {openSections.color ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.color && (
            <div className="space-y-3 pt-1">
              {/* Rueda de glifos de Mana Font sin bordes duros */}
              <div className={`flex items-center justify-between gap-1 p-2 rounded-2xl shadow-inner ${
                isLightMode ? 'bg-[#FAF7F2]' : 'bg-black/40'
              }`}>
                {COLOR_SYMBOLS.map((c) => {
                  const isSelected = selectedColors.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onToggleColor(c.id)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/25 scale-110 font-bold'
                          : 'opacity-40 hover:opacity-100 hover:scale-105'
                      }`}
                      title={c.label}
                    >
                      <i className={`ms ms-${c.sym} ms-cost ms-shadow text-xl`} />
                    </button>
                  );
                })}
              </div>

              {/* Atajos de Gremios */}
              <div className="flex flex-wrap gap-1">
                {GUILD_SHORTCUTS.map((g) => {
                  const active = g.val.split('').every((col) => selectedColors.includes(col)) && selectedColors.length === 2;
                  return (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => {
                        const cols = g.val.split('');
                        if (active) {
                          cols.forEach(c => onToggleColor(c));
                        } else {
                          selectedColors.forEach(c => onToggleColor(c));
                          cols.forEach(c => onToggleColor(c));
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-lg font-mono transition-all cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                          : isLightMode 
                            ? 'bg-[#EAE4D7] text-neutral-700 hover:bg-[#DDD5C5]' 
                            : 'bg-black/30 text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {/* Modos de Color */}
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {[
                  { id: 'includes', label: 'Incluye (c:)' },
                  { id: 'exact', label: 'Exacto (c=)' },
                  { id: 'at_most', label: 'Máximo (c<=)' },
                  { id: 'identity', label: 'Identidad (id<=)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeColorMode(m.id)}
                    className={`py-1.5 px-2 rounded-xl text-center transition-all cursor-pointer ${
                      colorMode === m.id
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                        : isLightMode 
                          ? 'bg-[#FAF7F2] text-neutral-600 hover:text-neutral-900' 
                          : 'bg-black/30 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. TIPO DE CARTA */}
        <div className="space-y-2.5 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('types')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Tipo de Carta</span>
            {openSections.types ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.types && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {CARD_TYPES.map((t) => {
                const IconComponent = t.icon;
                const isSelected = selectedTypes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleType(t.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                        : isLightMode 
                          ? 'bg-[#FAF7F2] text-neutral-600 hover:text-neutral-900 hover:bg-[#EAE4D7]' 
                          : 'bg-black/30 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                    }`}
                  >
                    <IconComponent className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. RAREZA */}
        <div className="space-y-2.5 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('rarity')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Rareza</span>
            {openSections.rarity ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.rarity && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {RARITIES.map((r) => {
                const isSelected = selectedRarities.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onToggleRarity(r.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                        : isLightMode 
                          ? 'bg-[#FAF7F2] text-neutral-600 hover:text-neutral-900 hover:bg-[#EAE4D7]' 
                          : 'bg-black/30 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. COSTO DE MANÁ (CMC) */}
        <div className="space-y-2 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('cmc')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Costo de Maná (CMC)</span>
            {openSections.cmc ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.cmc && (
            <div className="space-y-2 pt-1 px-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>0</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-bold">
                  {cmcMax >= 16 ? 'Cualquiera' : `≤ ${cmcMax}`}
                </span>
                <span>16</span>
              </div>
              <input
                id="filter-cmc-range"
                name="cmcRange"
                type="range"
                min="0"
                max="16"
                value={cmcMax}
                onChange={(e) => onChangeCmcMax(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-black/40 rounded-lg cursor-pointer h-1.5"
              />
            </div>
          )}
        </div>

        {/* 6. ESTADÍSTICAS */}
        <div className="space-y-2 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('stats')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Fuerza y Resistencia</span>
            {openSections.stats ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.stats && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label htmlFor="filter-power" className="text-[10px] text-neutral-400 block mb-1 font-mono">Fuerza (≥)</label>
                <input
                  id="filter-power"
                  name="powerVal"
                  type="number"
                  min="0"
                  max="20"
                  value={powerVal}
                  onChange={(e) => onChangePowerVal(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl px-2.5 py-1.5 text-xs outline-none transition-colors ${
                    isLightMode ? 'bg-[#FAF7F2] text-neutral-900 focus:ring-1 focus:ring-amber-500' : 'bg-black/40 text-neutral-100 focus:ring-1 focus:ring-amber-500/80'
                  }`}
                />
              </div>
              <div>
                <label htmlFor="filter-toughness" className="text-[10px] text-neutral-400 block mb-1 font-mono">Resistencia (≥)</label>
                <input
                  id="filter-toughness"
                  name="toughnessVal"
                  type="number"
                  min="0"
                  max="20"
                  value={toughnessVal}
                  onChange={(e) => onChangeToughnessVal(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl px-2.5 py-1.5 text-xs outline-none transition-colors ${
                    isLightMode ? 'bg-[#FAF7F2] text-neutral-900 focus:ring-1 focus:ring-amber-500' : 'bg-black/40 text-neutral-100 focus:ring-1 focus:ring-amber-500/80'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. FORMATO LEGAL */}
        <div className="space-y-2 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('format')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Formato Legal</span>
            {openSections.format ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.format && (
            <div className="pt-1">
              <select
                id="filter-format-select"
                name="formatSelect"
                value={format}
                onChange={(e) => onChangeFormat(e.target.value)}
                className={`w-full rounded-xl px-2.5 py-2 text-xs outline-none font-mono cursor-pointer ${
                  isLightMode 
                    ? 'bg-[#FAF7F2] text-neutral-800 focus:ring-1 focus:ring-amber-500' 
                    : 'bg-black/40 text-neutral-200 focus:ring-1 focus:ring-amber-500/80'
                }`}
              >
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id} className={isLightMode ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-neutral-200'}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 8. PRECIO */}
        <div className="space-y-2 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className={`w-full flex items-center justify-between text-xs font-bold transition-colors ${
              isLightMode ? 'text-neutral-800 hover:text-black' : 'text-neutral-300 hover:text-white'
            }`}
          >
            <span>Precio Máximo (USD)</span>
            {openSections.price ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.price && (
            <div className="pt-1 flex items-center gap-1.5">
              <span className="text-xs text-neutral-500 font-mono">$</span>
              <input
                id="filter-price-usd"
                name="maxPrice"
                type="number"
                step="0.25"
                min="0"
                value={maxPrice}
                onChange={(e) => onChangeMaxPrice(e.target.value)}
                placeholder="ej. 1.00, 5.00"
                className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-mono outline-none transition-colors ${
                  isLightMode 
                    ? 'bg-[#FAF7F2] text-neutral-900 placeholder-neutral-400 focus:ring-1 focus:ring-amber-500' 
                    : 'bg-black/40 text-neutral-100 placeholder-neutral-600 focus:ring-1 focus:ring-amber-500/80'
                }`}
              />
            </div>
          )}
        </div>

        {/* 9. MÁS FILTROS */}
        <div className="space-y-2.5 pt-3">
          <button
            type="button"
            onClick={() => toggleSection('more')}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              isLightMode 
                ? 'bg-[#EAE4D7] hover:bg-[#DDD5C5] text-neutral-800' 
                : 'bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            <span>{openSections.more ? 'Menos filtros' : 'Más filtros'}</span>
          </button>

          {openSections.more && (
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label htmlFor="filter-set-code" className="text-[11px] text-neutral-400 block mb-1 font-mono">Código de Edición</label>
                <input
                  id="filter-set-code"
                  name="setCode"
                  type="text"
                  maxLength={5}
                  value={setCode}
                  onChange={(e) => onChangeSetCode(e.target.value.toUpperCase())}
                  placeholder="ej. MKM, LTR"
                  className={`w-full rounded-xl px-2.5 py-1.5 text-xs uppercase font-mono outline-none transition-colors ${
                    isLightMode ? 'bg-[#FAF7F2] text-neutral-900 focus:ring-1 focus:ring-amber-500' : 'bg-black/40 text-neutral-100 focus:ring-1 focus:ring-amber-500/80'
                  }`}
                />
              </div>

              <div>
                <label htmlFor="filter-artist" className="text-[11px] text-neutral-400 block mb-1 font-mono">Artista</label>
                <input
                  id="filter-artist"
                  name="artist"
                  type="text"
                  value={artist}
                  onChange={(e) => onChangeArtist(e.target.value)}
                  placeholder="ej. Rebecca Guay"
                  className={`w-full rounded-xl px-2.5 py-1.5 text-xs outline-none transition-colors ${
                    isLightMode ? 'bg-[#FAF7F2] text-neutral-900 focus:ring-1 focus:ring-amber-500' : 'bg-black/40 text-neutral-100 focus:ring-1 focus:ring-amber-500/80'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1 font-mono">Palabras Clave</label>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {POPULAR_KEYWORDS.map((kw) => {
                    const isSelected = selectedKeywords.includes(kw);
                    return (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => onToggleKeyword(kw)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                            : isLightMode 
                              ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7]' 
                              : 'bg-black/30 text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        {kw}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}
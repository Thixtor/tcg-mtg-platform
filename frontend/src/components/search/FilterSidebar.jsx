// ---------------------------------------------------------
// COMPONENTE: BARRA LATERAL FACETADA CINEMATOGRÁFICA (FLUIDA)
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
    <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 text-neutral-200">
      {/* Contenedor sin bordes duros: gradiente suave y sombra cinematográfica */}
      <div className="bg-gradient-to-b from-neutral-900/60 via-neutral-900/30 to-transparent backdrop-blur-md rounded-3xl p-5 shadow-2xl border border-white/5 space-y-5">
        
        {/* Cabecera elegante */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <span className="text-xs font-bold tracking-wider uppercase text-amber-400 flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-500" /> Filtros del Explorador
          </span>
        </div>

        {/* 1. BÚSQUEDA DE TEXTO / REGLAS */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => toggleSection('text')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <span>Texto de Reglas (Oráculo)</span>
            {openSections.text ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.text && (
            <div className="pt-1">
              <input
                type="text"
                value={oracleText}
                onChange={(e) => onChangeOracleText(e.target.value)}
                placeholder="ej. draw a card, destroy target..."
                className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-amber-500/80 rounded-xl px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none font-mono transition-colors"
              />
            </div>
          )}
        </div>

        {/* 2. IDENTIDAD DE COLOR */}
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('color')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <span>Identidad de Color</span>
            {openSections.color ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.color && (
            <div className="space-y-3 pt-1">
              {/* Rueda de glifos de Mana Font en escala destacada */}
              <div className="flex items-center justify-between gap-1 p-2 bg-black/40 rounded-2xl border border-white/5">
                {COLOR_SYMBOLS.map((c) => {
                  const isSelected = selectedColors.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onToggleColor(c.id)}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                        isSelected
                          ? 'bg-amber-500/25 border-2 border-amber-400 shadow-lg shadow-amber-500/20 scale-110'
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
                      className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-all ${
                        active
                          ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-md shadow-amber-600/30'
                          : 'bg-black/30 border-white/5 text-neutral-400 hover:text-white hover:bg-neutral-800/50'
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
                    className={`py-1.5 px-2 rounded-xl border text-center transition-all ${
                      colorMode === m.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-semibold shadow-xs'
                        : 'bg-black/30 text-neutral-400 border-white/5 hover:text-neutral-200'
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
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('types')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
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
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs text-left transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-400 font-semibold shadow-md shadow-amber-600/30'
                        : 'bg-black/30 text-neutral-400 border-white/5 hover:border-white/10 hover:text-neutral-200'
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
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('rarity')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
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
                    className={`py-1.5 px-2 rounded-xl border text-xs text-center transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-400 font-semibold shadow-md shadow-amber-600/30'
                        : 'bg-black/30 text-neutral-400 border-white/5 hover:border-white/10 hover:text-neutral-200'
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
        <div className="space-y-2 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('cmc')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <span>Costo de Maná (CMC)</span>
            {openSections.cmc ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.cmc && (
            <div className="space-y-2 pt-1 px-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>0</span>
                <span className="px-2 py-0.5 rounded-lg bg-black/50 border border-white/10 text-amber-400 font-bold">
                  {cmcMax >= 16 ? 'Cualquiera' : `≤ ${cmcMax}`}
                </span>
                <span>16</span>
              </div>
              <input
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
        <div className="space-y-2 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('stats')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <span>Estadísticas (Criaturas)</span>
            {openSections.stats ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.stats && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Fuerza (≥)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={powerVal}
                  onChange={(e) => onChangePowerVal(e.target.value)}
                  placeholder="0"
                  className="w-full bg-black/40 border border-white/10 focus:border-amber-500/80 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Resistencia (≥)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={toughnessVal}
                  onChange={(e) => onChangeToughnessVal(e.target.value)}
                  placeholder="0"
                  className="w-full bg-black/40 border border-white/10 focus:border-amber-500/80 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. FORMATO LEGAL */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('format')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <span>Formato Legal</span>
            {openSections.format ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.format && (
            <div className="pt-1">
              <select
                value={format}
                onChange={(e) => onChangeFormat(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
              >
                {FORMATS.map((f) => (
                  <option key={f.id} value={f.id} className="bg-neutral-900 text-neutral-200">{f.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 8. PRECIO */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
          >
            <span>Precio Máximo (USD)</span>
            {openSections.price ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />}
          </button>

          {openSections.price && (
            <div className="pt-1 flex items-center gap-1.5">
              <span className="text-xs text-neutral-500 font-mono">$</span>
              <input
                type="number"
                step="0.25"
                min="0"
                value={maxPrice}
                onChange={(e) => onChangeMaxPrice(e.target.value)}
                placeholder="ej. 1.00, 5.00"
                className="w-full bg-black/40 border border-white/10 focus:border-amber-500/80 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none transition-colors"
              />
            </div>
          )}
        </div>

        {/* 9. MÁS FILTROS */}
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => toggleSection('more')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-neutral-300 hover:text-amber-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            <span>{openSections.more ? 'Menos filtros' : 'Más filtros'}</span>
          </button>

          {openSections.more && (
            <div className="space-y-3 pt-2 animate-fadeIn text-xs">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Código de Edición</label>
                <input
                  type="text"
                  maxLength={5}
                  value={setCode}
                  onChange={(e) => onChangeSetCode(e.target.value.toUpperCase())}
                  placeholder="ej. MKM, LTR"
                  className="w-full bg-black/40 border border-white/10 focus:border-amber-500/80 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 uppercase font-mono focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Artista</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => onChangeArtist(e.target.value)}
                  placeholder="ej. Rebecca Guay"
                  className="w-full bg-black/40 border border-white/10 focus:border-amber-500/80 rounded-xl px-2.5 py-1.5 text-xs text-neutral-100 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Palabras Clave</label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {POPULAR_KEYWORDS.map((kw) => {
                    const isSelected = selectedKeywords.includes(kw);
                    return (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => onToggleKeyword(kw)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-400 font-semibold'
                            : 'bg-black/30 border-white/5 text-neutral-400 hover:text-white'
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
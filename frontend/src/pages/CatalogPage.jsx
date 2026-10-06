// ---------------------------------------------------------
// PÁGINA: CATÁLOGO MTG (RANGO DUAL COMPLETO: CMC Y PRECIO TCG)
// ---------------------------------------------------------
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  SlidersHorizontal,
  X,
  Compass,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

import { useCardSearch } from '../hooks/useCardSearch';
import { SmartSearchBar } from '../components/search/SmartSearchBar';
import VisualFilterPanel from '../components/search/VisualFilterPanel';
import MechanicsFilterPanel from '../components/search/MechanicsFilterPanel';
import QueryExplanationBanner from '../components/search/QueryExplanationBanner';
import { CardGrid } from '../components/cards/CardGrid';
import { useCardModal } from '@/context/CardModalContext';
import { useTheme } from '@/context/ThemeContext';

export function CatalogPage({ initialSearch = '', onClearInitialSearch }) {
  const { isLightMode } = useTheme();

  const {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    error,
  } = useCardSearch();

  const { openCard } = useCardModal();

  // Dos modos limpios: Búsqueda Rápida y Búsqueda Avanzada
  const [searchMode, setSearchMode] = useState('quick');

  // Estados de filtros
  const [inputQuery, setInputQuery] = useState('');
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedRarities, setSelectedRarities] = useState([]);
  const [cmcMin, setCmcMin] = useState(0);
  const [cmcMax, setCmcMax] = useState(16);
  const [isLegendary, setIsLegendary] = useState(null); // null, true, false
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(100);
  const [priceSource, setPriceSource] = useState('tcgplayer'); // 'tcgplayer' | 'cardkingdom'
  const [format, setFormat] = useState('');
  const [selectedMechanics, setSelectedMechanics] = useState([]);

  // Recepción de búsqueda externa
  useEffect(() => {
    if (initialSearch && initialSearch.trim()) {
      setSearchMode('quick');
      setSearchTerm(initialSearch.trim());
      onClearInitialSearch?.();
    }
  }, [initialSearch, setSearchTerm, onClearInitialSearch]);

  const handleToggleMechanic = (mechanicObj) => {
    setSelectedMechanics((prev) => {
      const exists = prev.some((m) => m.id === mechanicObj.id);
      if (exists) {
        return prev.filter((m) => m.id !== mechanicObj.id);
      }
      return [...prev, mechanicObj];
    });
  };

  // Compilación de sintaxis Scryfall
  const compiledAdvancedQuery = useMemo(() => {
    if (searchMode === 'quick') return searchTerm;

    const tokens = [];
    if (inputQuery.trim()) tokens.push(inputQuery.trim());

    if (selectedColors.length > 0) {
      tokens.push(`c:${selectedColors.join('')}`);
    }

    selectedTypes.forEach((t) => tokens.push(`t:${t}`));
    selectedRarities.forEach((r) => tokens.push(`r:${r}`));

    // Condición de Legendaria
    if (isLegendary === true) tokens.push('t:legendary');
    else if (isLegendary === false) tokens.push('-t:legendary');

    // Rango Dual de Coste de Maná (CMC)
    if (cmcMin > 0) tokens.push(`mv>=${cmcMin}`);
    if (cmcMax < 16) tokens.push(`mv<=${cmcMax}`);

    // Rango Dual de Precio (Min y Max)
    if (priceMin > 0) tokens.push(`usd>=${priceMin}`);
    if (priceMax < 100) tokens.push(`usd<=${priceMax}`);

    if (format) tokens.push(`f:${format}`);

    // Mecánicas seleccionadas
    selectedMechanics.forEach((m) => {
      if (m.customQuery) tokens.push(m.customQuery);
      else if (m.scryfallKw) tokens.push(`kw:"${m.scryfallKw}"`);
    });

    return tokens.join(' ');
  }, [
    searchMode,
    searchTerm,
    inputQuery,
    selectedColors,
    selectedTypes,
    selectedRarities,
    isLegendary,
    cmcMin,
    cmcMax,
    priceMin,
    priceMax,
    priceSource,
    format,
    selectedMechanics,
  ]);

  // Explicación en lenguaje natural
  const naturalExplanation = useMemo(() => {
    const parts = [];

    if (isLegendary === true) parts.push('Cartas legendarias');
    else if (isLegendary === false) parts.push('Cartas no legendarias');

    if (selectedTypes.length > 0) {
      const typeLabels = {
        creature: 'criaturas',
        instant: 'instantáneos',
        sorcery: 'conjuros',
        artifact: 'artefactos',
        enchantment: 'encantamientos',
        planeswalker: 'planeswalkers',
        land: 'tierras',
      };
      const typesStr = selectedTypes.map((t) => typeLabels[t] || t).join(' o ');
      if (parts.length > 0) parts.push(`de tipo ${typesStr}`);
      else parts.push(typesStr.charAt(0).toUpperCase() + typesStr.slice(1));
    } else if (parts.length === 0) {
      parts.push('Cartas');
    }

    if (selectedColors.length > 0) {
      const colorLabels = { w: 'blancas', u: 'azules', b: 'negras', r: 'rojas', g: 'verdes', c: 'incoloras' };
      parts.push(selectedColors.map((c) => colorLabels[c] || c).join('/'));
    }

    // Explicación de CMC
    if (cmcMin > 0 && cmcMax < 16) {
      parts.push(`de coste entre ${cmcMin} y ${cmcMax}`);
    } else if (cmcMin > 0) {
      parts.push(`de coste ${cmcMin} o más`);
    } else if (cmcMax < 16) {
      parts.push(`de coste ${cmcMax} o menos`);
    }

    // Explicación de Precio con referencia exacta
    const sourceName = priceSource === 'cardkingdom' ? 'Card Kingdom' : 'TCGplayer Market';
    if (priceMin > 0 && priceMax < 100) {
      parts.push(`con precio entre $${priceMin} y $${priceMax} USD (${sourceName})`);
    } else if (priceMin > 0) {
      parts.push(`con precio desde $${priceMin} USD (${sourceName})`);
    } else if (priceMax < 100) {
      parts.push(`con precio hasta $${priceMax} USD (${sourceName})`);
    }

    if (selectedMechanics.length > 0) {
      parts.push(`con ${selectedMechanics.map((m) => m.label.toLowerCase()).join(', ')}`);
    }

    if (format) {
      parts.push(`legales en ${format.toUpperCase()}`);
    }

    return parts.join(' ');
  }, [isLegendary, selectedTypes, selectedColors, cmcMin, cmcMax, priceMin, priceMax, priceSource, selectedMechanics, format]);

  // Sincronización automática en modo avanzado
  useEffect(() => {
    if (searchMode === 'advanced') {
      setSearchTerm(compiledAdvancedQuery);
    }
  }, [compiledAdvancedQuery, searchMode, setSearchTerm]);

  const handleResetAllFilters = () => {
    setInputQuery('');
    setSelectedColors([]);
    setSelectedTypes([]);
    setSelectedRarities([]);
    setIsLegendary(null);
    setCmcMin(0);
    setCmcMax(16);
    setPriceMin(0);
    setPriceMax(100);
    setPriceSource('tcgplayer');
    setFormat('');
    setSelectedMechanics([]);
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(
    inputQuery ||
    selectedColors.length > 0 ||
    selectedTypes.length > 0 ||
    selectedRarities.length > 0 ||
    isLegendary !== null ||
    cmcMin > 0 ||
    cmcMax < 16 ||
    priceMin > 0 ||
    priceMax < 100 ||
    format ||
    selectedMechanics.length > 0
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      
      {/* 1. HERO BANNER FULL-BLEED */}
      <section className="relative w-full overflow-hidden select-none">
        <div 
          className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 md:w-1/2 bg-cover bg-center pointer-events-none opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1920&auto=format&fit=crop)',
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0B0B0B]/80 pointer-events-none" />

        <div className="max-w-[1920px] mx-auto px-6 sm:px-8 pt-10 pb-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-mono font-bold tracking-wider uppercase">
            <Compass className="w-3.5 h-3.5" />
            <span>Catálogo Oficial & Cotizaciones en Tiempo Real</span>
          </div>

          <div className="space-y-2 max-w-4xl">
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-none ${
              isLightMode ? 'text-neutral-900' : 'text-white'
            }`}>
              Explorador de Cartas
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono max-w-2xl leading-relaxed">
              Consulta el catálogo completo de Magic: The Gathering con precios de mercado en tiempo real, efectos y el texto oficial de cada carta.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSearchMode('quick')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                searchMode === 'quick'
                  ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-lg shadow-amber-500/20'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Búsqueda Rápida</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode('advanced')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                searchMode === 'advanced'
                  ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-lg shadow-amber-500/20'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Búsqueda Avanzada</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. ÁREA DE TRABAJO */}
      <div className="flex-1 max-w-[1920px] mx-auto w-full px-6 sm:px-8 pb-12 space-y-6">
        
        {/* MODO 1: BÚSQUEDA RÁPIDA */}
        {searchMode === 'quick' ? (
          <div className="space-y-6">
            <SmartSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              isLightMode={isLightMode}
            />
            <CardGrid
              cards={results}
              loading={loading}
              onSelectCard={(card) => openCard(card)}
              isLightMode={isLightMode}
            />
          </div>
        ) : (
          /* MODO 2: BÚSQUEDA AVANZADA INTEGRAL */
          <div className="space-y-6">
            
            {/* Input por nombre */}
            <div className="flex items-center gap-3 bg-neutral-900/80 border border-neutral-800 rounded-xl px-4 py-3 shadow-lg focus-within:border-amber-500 transition-all">
              <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <input
                id="advanced-catalog-search-input"
                name="advancedQuery"
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Buscar por nombre en inglés (ej. Lightning Bolt, Rhystic Study)..."
                className="w-full bg-transparent text-xs sm:text-sm outline-none font-mono text-neutral-100 placeholder-neutral-500"
              />
              {inputQuery && (
                <button
                  type="button"
                  onClick={() => setInputQuery('')}
                  className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchTerm(compiledAdvancedQuery)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition shadow-md active:scale-95 flex-shrink-0 cursor-pointer"
              >
                <span>Buscar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Panel de Filtros Visuales con Sliders Duales (CMC y Precio) */}
            <VisualFilterPanel
              selectedTypes={selectedTypes}
              onToggleType={(t) => setSelectedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
              selectedColors={selectedColors}
              onToggleColor={(c) => setSelectedColors((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
              selectedFormat={format}
              onSelectFormat={setFormat}
              selectedRarities={selectedRarities}
              onToggleRarity={(r) => setSelectedRarities((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])}
              isLegendary={isLegendary}
              onToggleLegendary={setIsLegendary}
              cmcMin={cmcMin}
              onChangeCmcMin={setCmcMin}
              cmcMax={cmcMax}
              onChangeCmcMax={setCmcMax}
              priceMin={priceMin}
              onChangePriceMin={setPriceMin}
              priceMax={priceMax}
              onChangePriceMax={setPriceMax}
              priceSource={priceSource}
              onChangePriceSource={setPriceSource}
              onResetFilters={handleResetAllFilters}
              isLightMode={isLightMode}
            />

            {/* Panel de Mecánicas */}
            <MechanicsFilterPanel
              selectedMechanics={selectedMechanics.map((m) => m.id)}
              onToggleMechanic={handleToggleMechanic}
              isLightMode={isLightMode}
            />

            {/* Banner en Lenguaje Natural */}
            <QueryExplanationBanner
              explanationText={hasActiveFilters ? naturalExplanation : 'Mostrando cartas populares de Magic: The Gathering.'}
              scryfallQuery={compiledAdvancedQuery}
              isLightMode={isLightMode}
            />

            {/* Barra de Estado & Chips Activos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-2 border-b border-neutral-800 font-mono text-xs">
              <div className="flex items-center gap-3">
                <span className="text-neutral-400">
                  <strong className="text-amber-400 font-bold">{results.length}</strong> cartas encontradas
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer todo</span>
                  </button>
                )}
              </div>

              {/* Chips de filtros activos */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {isLegendary !== null && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                      <span>{isLegendary ? 'Solo Legendarias' : 'No Legendarias'}</span>
                      <button type="button" onClick={() => setIsLegendary(null)}>
                        <X className="w-2.5 h-2.5 text-amber-400 hover:text-white" />
                      </button>
                    </span>
                  )}

                  {selectedColors.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200">
                      <i className={`ms ms-${c} ms-cost text-[10px]`} />
                      <button type="button" onClick={() => setSelectedColors(prev => prev.filter(x => x !== c))}>
                        <X className="w-2.5 h-2.5 text-neutral-400 hover:text-white" />
                      </button>
                    </span>
                  ))}

                  {selectedTypes.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200 capitalize">
                      <span>{t}</span>
                      <button type="button" onClick={() => setSelectedTypes(prev => prev.filter(x => x !== t))}>
                        <X className="w-2.5 h-2.5 text-neutral-400 hover:text-white" />
                      </button>
                    </span>
                  ))}

                  {(cmcMin > 0 || cmcMax < 16) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200 font-mono">
                      <span>{`CMC: ${cmcMin} - ${cmcMax >= 16 ? '16+' : cmcMax}`}</span>
                      <button type="button" onClick={() => { setCmcMin(0); setCmcMax(16); }}>
                        <X className="w-2.5 h-2.5 text-neutral-400 hover:text-white" />
                      </button>
                    </span>
                  )}

                  {(priceMin > 0 || priceMax < 100) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-[11px] text-emerald-400 font-mono">
                      <span>{`Precio: $${priceMin} - ${priceMax >= 100 ? 'Max' : `$${priceMax}`} USD (${priceSource === 'cardkingdom' ? 'CK' : 'TCG'})`}</span>
                      <button type="button" onClick={() => { setPriceMin(0); setPriceMax(100); }}>
                        <X className="w-2.5 h-2.5 text-emerald-400 hover:text-white" />
                      </button>
                    </span>
                  )}

                  {selectedMechanics.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400">
                      <span>{m.label}</span>
                      <button type="button" onClick={() => handleToggleMechanic(m)}>
                        <X className="w-2.5 h-2.5 text-amber-400 hover:text-white" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Grilla a Pantalla Completa */}
            <section className="w-full space-y-4">
              {error && (
                <div className="text-center py-6 px-4 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-xl font-mono">
                  {error}
                </div>
              )}

              {!loading && !error && results.length === 0 && (
                <div className="text-center py-20 text-xs text-neutral-500 font-mono">
                  No se encontraron cartas que coincidan con los criterios seleccionados.
                </div>
              )}

              <CardGrid
                cards={results}
                loading={loading}
                onSelectCard={(card) => openCard(card)}
                isLightMode={isLightMode}
              />
            </section>
          </div>
        )}

      </div>
    </div>
  );
}
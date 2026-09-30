// ---------------------------------------------------------
// PÁGINA PRINCIPAL: CATÁLOGO MTG (LAYOUT FLUIDO Y CINEMATOGRÁFICO)
// ---------------------------------------------------------
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal,
  X 
} from 'lucide-react';
import { useCardSearch } from '../hooks/useCardSearch';
import { SmartSearchBar } from '../components/search/SmartSearchBar';
import { FilterSidebar } from '../components/search/FilterSidebar';
import { CardGrid } from '../components/cards/CardGrid';
import { CardDetailModal } from '../components/modal/CardDetailModal';

export function CatalogPage() {
  const {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    error,
  } = useCardSearch();

  // Conmutador de modo
  const [searchMode, setSearchMode] = useState('advanced');

  // Estados de filtros avanzados
  const [inputQuery, setInputQuery] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [selectedColors, setSelectedColors] = useState([]);
  const [colorMode, setColorMode] = useState('includes');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedRarities, setSelectedRarities] = useState([]);
  const [cmcMax, setCmcMax] = useState(16);
  const [powerVal, setPowerVal] = useState('');
  const [toughnessVal, setToughnessVal] = useState('');
  const [format, setFormat] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [setCode, setSetCode] = useState('');
  const [artist, setArtist] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState([]);

  const [selectedCard, setSelectedCard] = useState(null);

  // ---------------------------------------------------------
  // COMPILADOR DE SINTAXIS SCRYFALL (INTERNO / TRANSPARENTE)
  // ---------------------------------------------------------
  const compiledAdvancedQuery = useMemo(() => {
    if (searchMode === 'quick') return searchTerm;

    const tokens = [];
    if (inputQuery.trim()) tokens.push(inputQuery.trim());
    if (oracleText.trim()) tokens.push(`o:"${oracleText.trim()}"`);

    if (selectedColors.length > 0) {
      const cStr = selectedColors.join('');
      if (colorMode === 'includes') tokens.push(`c:${cStr}`);
      else if (colorMode === 'exact') tokens.push(`c=${cStr}`);
      else if (colorMode === 'at_most') tokens.push(`c<=${cStr}`);
      else if (colorMode === 'identity') tokens.push(`id<=${cStr}`);
    }

    selectedTypes.forEach((t) => tokens.push(`t:${t}`));
    selectedRarities.forEach((r) => tokens.push(`r:${r}`));

    if (cmcMax < 16) tokens.push(`mv<=${cmcMax}`);
    if (powerVal !== '') tokens.push(`pow>=${powerVal}`);
    if (toughnessVal !== '') tokens.push(`tou>=${toughnessVal}`);
    if (format) tokens.push(`f:${format}`);
    if (maxPrice) tokens.push(`usd<=${maxPrice}`);
    if (setCode.trim()) tokens.push(`s:${setCode.trim().toLowerCase()}`);
    if (artist.trim()) tokens.push(`a:"${artist.trim()}"`);
    selectedKeywords.forEach((kw) => tokens.push(`kw:"${kw}"`));

    return tokens.join(' ');
  }, [
    searchMode,
    searchTerm,
    inputQuery,
    oracleText,
    selectedColors,
    colorMode,
    selectedTypes,
    selectedRarities,
    cmcMax,
    powerVal,
    toughnessVal,
    format,
    maxPrice,
    setCode,
    artist,
    selectedKeywords,
  ]);

  // Sincronizar automáticamente en modo avanzado
  React.useEffect(() => {
    if (searchMode === 'advanced') {
      setSearchTerm(compiledAdvancedQuery);
    }
  }, [compiledAdvancedQuery, searchMode, setSearchTerm]);

  const handleResetAllFilters = () => {
    setInputQuery('');
    setOracleText('');
    setSelectedColors([]);
    setColorMode('includes');
    setSelectedTypes([]);
    setSelectedRarities([]);
    setCmcMax(16);
    setPowerVal('');
    setToughnessVal('');
    setFormat('');
    setMaxPrice('');
    setSetCode('');
    setArtist('');
    setSelectedKeywords([]);
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(
    selectedColors.length > 0 ||
    selectedTypes.length > 0 ||
    selectedRarities.length > 0 ||
    cmcMax < 16 ||
    format ||
    maxPrice ||
    oracleText ||
    setCode ||
    artist ||
    selectedKeywords.length > 0
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 px-4 md:px-8 py-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* --------------------------------------------------------- */}
      {/* CABECERA ESTILO BANNER CINEMATOGRÁFICO                    */}
      {/* --------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-900/80 via-neutral-900/40 to-neutral-950 p-6 md:p-8 border border-white/5 shadow-2xl backdrop-blur-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              Explorador de Cartas MTG
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 font-light max-w-xl">
              Catálogo visual, análisis de cotizaciones de mercado y reglas del juego.
            </p>
          </div>

          {/* Conmutador de Modo */}
          <div className="inline-flex bg-black/40 backdrop-blur-md p-1 rounded-2xl border border-white/10 self-start md:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => setSearchMode('quick')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                searchMode === 'quick'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Búsqueda Rápida</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchMode('advanced')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                searchMode === 'advanced'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Búsqueda Avanzada</span>
            </button>
          </div>
        </div>

        {/* Resplandor ambiental de fondo */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* --------------------------------------------------------- */}
      {/* VISTA 1: BÚSQUEDA RÁPIDA                                  */}
      {/* --------------------------------------------------------- */}
      {searchMode === 'quick' ? (
        <div className="space-y-6">
          <SmartSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
          />
          <CardGrid
            cards={results}
            loading={loading}
            onSelectCard={(card) => setSelectedCard(card)}
          />
        </div>
      ) : (
        /* --------------------------------------------------------- */
        /* VISTA 2: BÚSQUEDA AVANZADA (FLUIDA)                       */
        /* --------------------------------------------------------- */
        <div className="space-y-5">
          {/* Barra de Búsqueda Flotante */}
          <div className="flex items-center gap-3 bg-neutral-900/60 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl focus-within:border-amber-500/80 transition-all">
            <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Buscar por nombre en inglés (ej. Lightning Bolt, Rhystic Study)..."
              className="w-full bg-transparent text-sm md:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none font-mono"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => setInputQuery('')}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchTerm(compiledAdvancedQuery)}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all shadow-lg shadow-amber-600/30 active:scale-98 flex-shrink-0"
            >
              <span>Buscar</span>
            </button>
          </div>

          {/* Chips de Filtros Activos (solo se muestran si hay filtros aplicados) */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 min-h-[32px] pt-1">
              <span className="text-xs text-neutral-500 font-medium mr-1">Filtros activos:</span>
              
              {selectedColors.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200">
                  <i className={`ms ms-${c} ms-cost text-[11px]`} />
                  <button type="button" onClick={() => setSelectedColors(prev => prev.filter(x => x !== c))}>
                    <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                  </button>
                </span>
              ))}

              {selectedTypes.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 capitalize">
                  <span>{t}</span>
                  <button type="button" onClick={() => setSelectedTypes(prev => prev.filter(x => x !== t))}>
                    <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                  </button>
                </span>
              ))}

              {selectedRarities.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 capitalize">
                  <span>{r}</span>
                  <button type="button" onClick={() => setSelectedRarities(prev => prev.filter(x => x !== r))}>
                    <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                  </button>
                </span>
              ))}

              {cmcMax < 16 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200">
                  <span>CMC ≤ {cmcMax}</span>
                  <button type="button" onClick={() => setCmcMax(16)}>
                    <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                  </button>
                </span>
              )}

              {format && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200 capitalize">
                  <span>{format}</span>
                  <button type="button" onClick={() => setFormat('')}>
                    <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                  </button>
                </span>
              )}

              {maxPrice && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-200">
                  <span>≤ ${maxPrice}</span>
                  <button type="button" onClick={() => setMaxPrice('')}>
                    <X className="w-3 h-3 text-neutral-400 hover:text-white" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-xs text-amber-500 hover:text-amber-400 ml-2 underline transition-colors"
              >
                Limpiar todo
              </button>
            </div>
          )}

          {/* Contenido: Barra Lateral + Grilla */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <FilterSidebar
              oracleText={oracleText}
              onChangeOracleText={setOracleText}
              selectedColors={selectedColors}
              onToggleColor={(c) => setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              colorMode={colorMode}
              onChangeColorMode={setColorMode}
              selectedTypes={selectedTypes}
              onToggleType={(t) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
              selectedRarities={selectedRarities}
              onToggleRarity={(r) => setSelectedRarities(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
              cmcMax={cmcMax}
              onChangeCmcMax={setCmcMax}
              powerVal={powerVal}
              onChangePowerVal={setPowerVal}
              toughnessVal={toughnessVal}
              onChangeToughnessVal={setToughnessVal}
              format={format}
              onChangeFormat={setFormat}
              maxPrice={maxPrice}
              onChangeMaxPrice={setMaxPrice}
              setCode={setCode}
              onChangeSetCode={setSetCode}
              artist={artist}
              onChangeArtist={setArtist}
              selectedKeywords={selectedKeywords}
              onToggleKeyword={(kw) => setSelectedKeywords(prev => prev.includes(kw) ? prev.filter(x => x !== kw) : [...prev, kw])}
            />

            <section className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-white/5">
                <span>
                  <strong className="text-white font-semibold">{results.length}</strong> cartas encontradas
                </span>
              </div>

              {error && (
                <div className="text-center py-6 px-4 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-2xl">
                  {error}
                </div>
              )}

              {!loading && !error && results.length === 0 && (
                <div className="text-center py-20 text-xs text-neutral-500">
                  No se encontraron cartas que coincidan con los criterios seleccionados.
                </div>
              )}

              <CardGrid
                cards={results}
                loading={loading}
                onSelectCard={(card) => setSelectedCard(card)}
              />
            </section>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </main>
  );
}
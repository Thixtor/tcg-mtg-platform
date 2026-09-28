// ---------------------------------------------------------
// PÁGINA: CONSTRUCTOR Y AUDITOR DE MAZOS (DECKBUILDER)
// ---------------------------------------------------------
import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  Share2,
  Flame,
  ArrowRight,
  TrendingUp,
  Sparkles,
  BarChart3,
  Shield,
  Coins
} from 'lucide-react';

export default function DecksPage({ userId, onOpenCreateDeckModal, onNavigateToTradeWall }) {
  // ---------------------------------------------------------
  // 1. ESTADO Y DATOS DE PRUEBA / MOCK DATA
  // ---------------------------------------------------------
  const [selectedDeckId, setSelectedDeckId] = useState('deck-1');

  const decksList = [
    {
      id: 'deck-1',
      name: 'Urza, Lord High Artificer',
      format: 'Commander / EDH',
      cardCount: 100,
      totalCount: 100,
      readinessPct: 85,
      totalPriceUsd: 640.0,
      commanderImg: 'https://cards.scryfall.io/normal/front/9/e/9e7fb3c0-5159-4d1f-8490-ce4c9a60f567.jpg',
      colorIdentity: ['U'],
      archetype: 'Artifacts / Combo',
      stats: { available: 85, inOtherDeck: 7, missing: 8, avgCmc: 2.45, missingCost: 85.0 }
    },
    {
      id: 'deck-2',
      name: 'Atraxa Superfriends',
      format: 'Commander / EDH',
      cardCount: 100,
      totalCount: 100,
      readinessPct: 92,
      totalPriceUsd: 890.0,
      commanderImg: 'https://cards.scryfall.io/normal/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg',
      colorIdentity: ['W', 'U', 'B', 'G'],
      archetype: 'Planeswalkers / Proliferate',
      stats: { available: 92, inOtherDeck: 5, missing: 3, avgCmc: 3.10, missingCost: 42.0 }
    },
    {
      id: 'deck-3',
      name: 'Mono Red Burn',
      format: 'Modern',
      cardCount: 75,
      totalCount: 75,
      readinessPct: 100,
      totalPriceUsd: 215.0,
      commanderImg: 'https://cards.scryfall.io/normal/front/f/2/f29ba16f-c8fb-42fe-aabf-87089cb214a7.jpg',
      colorIdentity: ['R'],
      archetype: 'Aggro / Spells',
      stats: { available: 75, inOtherDeck: 0, missing: 0, avgCmc: 1.55, missingCost: 0.0 }
    }
  ];

  const activeDeck = decksList.find((d) => d.id === selectedDeckId) || decksList[0];

  const manaCurveData = [
    { cmc: '0', count: 4, height: 18 },
    { cmc: '1', count: 12, height: 38 },
    { cmc: '2', count: 18, height: 54, isPeak: true },
    { cmc: '3', count: 14, height: 44 },
    { cmc: '4', count: 9, height: 30 },
    { cmc: '5', count: 5, height: 20 },
    { cmc: '6', count: 2, height: 12 },
    { cmc: '7+', count: 1, height: 8 }
  ];

  const activeDeckCards = [
    {
      id: 'c1',
      name: 'Mox Amber',
      type: 'Artifact Legendary',
      category: 'Artefactos',
      manaCost: '{0}',
      priceUsd: 48.5,
      status: 'FALTANTE', // FALTANTE | EN_OTRO_MAZO | DISPONIBLE
      statusDetail: 'No posees copia física en binders',
      img: 'https://cards.scryfall.io/normal/front/6/6/66024e69-ad60-4c9a-a022-44abc74a8175.jpg'
    },
    {
      id: 'c2',
      name: 'Mana Vault',
      type: 'Artifact',
      category: 'Artefactos',
      manaCost: '{1}',
      priceUsd: 72.0,
      status: 'EN_OTRO_MAZO',
      statusDetail: 'Asignado en: Mazo Atraxa Superfriends',
      deckAssignment: 'Atraxa Superfriends',
      img: 'https://cards.scryfall.io/normal/front/c/f/cfdf9706-acdb-48fc-89db-93bc50b3b9ad.jpg'
    },
    {
      id: 'c3',
      name: 'Sol Ring',
      type: 'Artifact',
      category: 'Artefactos',
      manaCost: '{1}',
      priceUsd: 1.85,
      status: 'DISPONIBLE',
      statusDetail: 'Binder A • Pág. 3 #12 (Copia libre)',
      img: 'https://cards.scryfall.io/normal/front/1/7/17700a94-4363-4903-90d1-ad81832b49df.jpg'
    },
    {
      id: 'c4',
      name: 'Aetherflux Reservoir',
      type: 'Artifact Wincon',
      category: 'Artefactos',
      manaCost: '{4}',
      priceUsd: 14.2,
      status: 'DISPONIBLE',
      statusDetail: 'Binder B • Pág. 1 #4 (Copia libre)',
      img: 'https://cards.scryfall.io/normal/front/9/6/96b6b365-561f-4b94-b432-601932a4e63b.jpg'
    },
    {
      id: 'c5',
      name: 'Rhystic Study',
      type: 'Enchantment',
      category: 'Instantáneos & Encantamientos',
      manaCost: '{2}{U}',
      priceUsd: 36.5,
      status: 'FALTANTE',
      statusDetail: 'Falta copia física • Cruce encontrado con @Valeria_Cards',
      img: 'https://cards.scryfall.io/normal/front/d/6/d6914dba-0d27-4055-ac34-b3ebf5802221.jpg'
    },
    {
      id: 'c6',
      name: 'Cyclonic Rift',
      type: 'Instant',
      category: 'Instantáneos & Encantamientos',
      manaCost: '{1}{U}',
      priceUsd: 34.0,
      status: 'DISPONIBLE',
      statusDetail: 'Binder A • Pág. 7 #2 (Foil)',
      img: 'https://cards.scryfall.io/normal/front/f/f/ff08e5ed-f47b-4d8e-8b8b-41675dccef8b.jpg'
    },
    {
      id: 'c7',
      name: 'Force of Negation',
      type: 'Instant',
      category: 'Instantáneos & Encantamientos',
      manaCost: '{1}{U}{U}',
      priceUsd: 42.0,
      status: 'EN_OTRO_MAZO',
      statusDetail: 'Asignado actualmente a: Mono Red Burn (Sideboard)',
      deckAssignment: 'Mono Red Burn',
      img: 'https://cards.scryfall.io/normal/front/e/8/e82fa4bc-038b-4828-afd4-e4cf0b00574f.jpg'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* --------------------------------------------------------- */}
      {/* 2. HERO PRINCIPAL & BARRA DE MÉTRICAS KPI                 */}
      {/* --------------------------------------------------------- */}
      <section className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-neutral-800/70">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Constructor y Auditor de Mazos</span>
                <span className="text-neutral-500 font-normal text-base">(Deckbuilder)</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                Regla: Máximo 10 Mazos
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Audita en tiempo real copias físicas en tus binders, detecta conflictos de uso entre mazos y sincroniza faltantes con el muro de intercambio P2P.
            </p>
          </div>

          {/* Capacidad y Botón Crear Mazo */}
          <div className="flex items-center gap-4">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3.5 py-2 flex items-center gap-3">
              <div>
                <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Capacidad de Mazos</div>
                <div className="text-xs font-mono font-bold text-neutral-200">
                  <span className="text-amber-400 text-sm">{decksList.length}</span> / 10 Mazos
                </div>
              </div>
              <div className="w-16 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  style={{ width: `${(decksList.length / 10) * 100}%` }}
                />
              </div>
            </div>

            <button
              onClick={onOpenCreateDeckModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Mazo</span>
            </button>
          </div>
        </div>

        {/* 4 Tarjetas de Métricas KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Total Mazos Activos</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-white">{decksList.length}</span>
              <span className="text-[11px] font-mono text-neutral-500">2 EDH, 1 Modern</span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-400 font-medium">● Formatos verificados</div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Completitud Física</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-emerald-400">88%</span>
              <span className="text-[11px] font-mono text-neutral-400">promedio</span>
            </div>
            <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '88%' }} />
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Cartas Faltantes</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-rose-400">18</span>
              <span className="text-[11px] font-mono text-neutral-400">en Wishlist</span>
            </div>
            <div className="mt-1 text-[11px] text-amber-400 font-medium">4 con cruce P2P hoy</div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span className="font-medium">Valor Acumulado</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl md:text-2xl font-mono font-bold text-amber-400">$1,420</span>
              <span className="text-[11px] font-mono text-neutral-400">USD</span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-neutral-500">≈ 5,650,000 COP</div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 3. CONSOLA PRINCIPAL EN 2 COLUMNAS                        */}
      {/* --------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* COLUMNA IZQUIERDA: GESTOR DEL MAZO ACTIVO (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Selector de Mazos (Tabs Horizontales) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Seleccionar Mazo Activo</span>
              <span className="text-[11px] font-mono text-neutral-500">{decksList.length} de 10 mazos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {decksList.map((deck) => (
                <button
                  key={deck.id}
                  onClick={() => setSelectedDeckId(deck.id)}
                  className={`text-left p-3 rounded-xl transition flex items-center gap-3 overflow-hidden border ${
                    selectedDeckId === deck.id
                      ? 'bg-neutral-900 border-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="w-12 aspect-[2.5/3.5] rounded-lg overflow-hidden border border-neutral-700 shadow shrink-0 bg-neutral-950">
                    <img src={deck.commanderImg} alt={deck.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">{deck.name}</span>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{deck.format}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-1 rounded border border-emerald-800/40">
                        {deck.readinessPct}% Listo
                      </span>
                      <span className="text-[10px] font-mono text-neutral-300 font-semibold">${deck.totalPriceUsd}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Inspector del Mazo Seleccionado */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-5">
            
            {/* Header del Mazo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="w-16 shrink-0 aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 border-amber-500/80 shadow-lg bg-neutral-950">
                  <img src={activeDeck.commanderImg} alt={activeDeck.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">{activeDeck.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-950/60 border border-blue-800 text-blue-300">
                      Comandante
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                      Legal en Commander
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-neutral-400 font-mono">
                    <span>Cartas: <strong className="text-neutral-200">{activeDeck.cardCount}/100</strong></span>
                    <span>•</span>
                    <span>CMC Promedio: <strong className="text-amber-400">{activeDeck.stats.avgCmc}</strong></span>
                    <span>•</span>
                    <span>Arquetipo: <span className="text-neutral-300 font-sans">{activeDeck.archetype}</span></span>
                  </div>
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 flex items-center gap-1.5 transition">
                  <Search className="w-3.5 h-3.5" /> Auditar Físico
                </button>
                <button className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 flex items-center gap-1.5 transition">
                  <Share2 className="w-3.5 h-3.5" /> Exportar
                </button>
                <button
                  onClick={onNavigateToTradeWall}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg border border-amber-500/30 flex items-center gap-1.5 transition"
                >
                  <Flame className="w-3.5 h-3.5" /> Enviar Faltantes a Wishlist
                </button>
              </div>
            </div>

            {/* Curva de Maná (Histograma SVG) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80">
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span className="font-semibold uppercase tracking-wider">Curva de Maná (Mana Value / CMC)</span>
                  <span>Cartas no-tierra: 65</span>
                </div>
                <div className="flex items-end justify-between gap-2 h-16 pt-2 px-1">
                  {manaCurveData.map((bar) => (
                    <div key={bar.cmc} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[9px] font-mono ${bar.isPeak ? 'text-amber-400 font-bold' : 'text-neutral-400'}`}>
                        {bar.count}
                      </span>
                      <div
                        className={`w-full rounded-t transition ${
                          bar.isPeak ? 'bg-amber-500 shadow-sm shadow-amber-500/50' : 'bg-blue-500/70 hover:bg-blue-400'
                        }`}
                        style={{ height: `${bar.height}px` }}
                        title={`CMC ${bar.cmc}: ${bar.count} cartas`}
                      />
                      <span className={`text-[10px] font-mono ${bar.isPeak ? 'text-amber-400 font-bold' : 'text-neutral-400'}`}>
                        {bar.cmc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribución de Tierras y Hechizos */}
              <div className="md:col-span-4 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-neutral-800 space-y-2">
                <div className="text-[11px] font-mono text-neutral-400 font-semibold uppercase tracking-wider">
                  Composición del Mazo
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Tierras</span>
                    <strong className="text-neutral-200">35 (35%)</strong>
                  </div>
                  <div className="bg-neutral-900 p-2 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Hechizos</span>
                    <strong className="text-neutral-200">65 (65%)</strong>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Fuentes de Maná Azul: <strong className="text-neutral-200 font-mono">42</strong></span>
                </div>
              </div>
            </div>

            {/* Listado de Cartas Auditadas por Estado Físico */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Inventario Físico de Cartas
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">(Auditoría en tiempo real)</span>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> {activeDeck.stats.available} Disp.
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> {activeDeck.stats.inOtherDeck} En otro mazo
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> {activeDeck.stats.missing} Faltantes
                  </span>
                </div>
              </div>

              {/* Contenedor de Filas de Cartas */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/60 divide-y divide-neutral-800/60">
                {activeDeckCards.map((card) => (
                  <div
                    key={card.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-800/40 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-neutral-500 w-4">1x</span>
                      <div className="w-8 aspect-[2.5/3.5] rounded overflow-hidden bg-neutral-950 shrink-0 border border-neutral-700">
                        <img src={card.img} alt={card.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                          <span className="truncate">{card.name}</span>
                          <span className="text-[10px] font-mono text-neutral-500 font-normal">{card.type}</span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 truncate">{card.statusDetail}</div>
                      </div>
                    </div>

                    {/* Precios, Coste y Badge de Auditoría */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono font-bold text-neutral-300 w-16 text-right">
                        ${card.priceUsd.toFixed(2)}
                      </span>

                      {/* Badge FALTANTE */}
                      {card.status === 'FALTANTE' && (
                        <>
                          <span className="w-28 text-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-950/60 border border-rose-800/60 text-rose-400">
                            FALTANTE
                          </span>
                          <button
                            onClick={onNavigateToTradeWall}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono rounded transition"
                          >
                            + Wishlist
                          </button>
                        </>
                      )}

                      {/* Badge EN OTRO MAZO */}
                      {card.status === 'EN_OTRO_MAZO' && (
                        <>
                          <span className="w-28 text-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-950/60 border border-amber-800/60 text-amber-400">
                            EN OTRO MAZO
                          </span>
                          <button className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-mono rounded transition">
                            Reasignar
                          </button>
                        </>
                      )}

                      {/* Badge DISPONIBLE */}
                      {card.status === 'DISPONIBLE' && (
                        <>
                          <span className="w-28 text-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                            DISPONIBLE
                          </span>
                          <span className="w-16 text-center text-[10px] font-mono text-neutral-500">Listo</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* COLUMNA DERECHA: WIDGETS DE AUDITORÍA Y MATCHMAKING (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Widget 1: Resumen de Inventario Físico */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Auditoría Física del Mazo
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {activeDeck.name.slice(0, 14)}...
              </span>
            </div>

            <div className="bg-neutral-950/70 rounded-xl p-4 border border-neutral-800/80 flex items-center gap-5">
              {/* Dona SVG de Progreso */}
              <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-neutral-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  />
                  <path
                    className="text-emerald-500"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${activeDeck.readinessPct}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-mono font-extrabold text-white">{activeDeck.readinessPct}%</span>
                  <span className="text-[8px] font-mono text-neutral-400 uppercase">Listo</span>
                </div>
              </div>

              {/* Desglose */}
              <div className="space-y-1.5 flex-1 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Disponibles:
                  </span>
                  <span className="font-bold text-emerald-400">{activeDeck.stats.available} / 100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> En otro mazo:
                  </span>
                  <span className="font-bold text-amber-400">{activeDeck.stats.inOtherDeck} / 100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> Faltantes:
                  </span>
                  <span className="font-bold text-rose-400">{activeDeck.stats.missing} / 100</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed bg-neutral-950/40 p-2.5 rounded-lg border border-neutral-800">
              💡 <strong className="text-neutral-300">Nota de inventario:</strong> {activeDeck.stats.inOtherDeck} cartas están asignadas en otros mazos. Puedes generar listas de verificación para intercambiarlas antes de tus partidas.
            </p>
          </div>

          {/* Widget 2: Cruces P2P para Faltantes */}
          <div className="bg-neutral-900/60 border border-amber-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-300">Cruces P2P para este Mazo</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                2 Matches locales
              </span>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              <strong className="text-amber-400">2 jugadores locales</strong> tienen cartas que te faltan disponibles para intercambio presencial.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="bg-neutral-950/80 border border-neutral-800 p-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-200 block">@CamiloMTG</span>
                  <span className="text-[10px] text-neutral-500">Mox Amber (Dominaria)</span>
                </div>
                <span className="text-emerald-400 font-bold">$48.00</span>
              </div>
              <div className="bg-neutral-950/80 border border-neutral-800 p-2.5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-200 block">@Valeria_Cards</span>
                  <span className="text-[10px] text-neutral-500">Rhystic Study (Jumpstart)</span>
                </div>
                <span className="text-emerald-400 font-bold">$35.00</span>
              </div>
            </div>

            <button
              onClick={onNavigateToTradeWall}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <span>Ver intercambios en el Muro Trade</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Widget 3: Estadísticas de Curva y Costo */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3 font-mono text-xs">
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2 font-sans">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Estadísticas y Costos
            </h3>

            <div className="flex items-center justify-between p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <span className="text-neutral-400 font-sans">CMC Promedio</span>
              <span className="text-base font-bold text-amber-400">{activeDeck.stats.avgCmc}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
              <span className="text-neutral-400 font-sans">Valor Total Estimado</span>
              <div className="text-right">
                <span className="text-base font-bold text-white">${activeDeck.totalPriceUsd.toFixed(2)}</span>
                <div className="text-[10px] text-neutral-500 font-sans">≈ {(activeDeck.totalPriceUsd * 3980).toLocaleString()} COP</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-rose-950/30 rounded-xl border border-rose-900/40">
              <div>
                <span className="text-rose-300 font-sans font-medium block">Costo para Completar</span>
                <span className="text-[10px] text-rose-400/80 font-sans">{activeDeck.stats.missing} cartas faltantes</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold text-rose-400">${activeDeck.stats.missingCost.toFixed(2)}</span>
                <div className="text-[10px] text-rose-400/70 font-sans">≈ {(activeDeck.stats.missingCost * 3980).toLocaleString()} COP</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
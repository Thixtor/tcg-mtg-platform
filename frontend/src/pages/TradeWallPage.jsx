// ---------------------------------------------------------
// PÁGINA: MURO DE INTERCAMBIOS P2P & MATCHMAKING LOCAL
// ---------------------------------------------------------
import React, { useState } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  Store,
  Star,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter,
  SlidersHorizontal,
  Layers,
  Sparkles,
  MapPin,
  Clock,
  Send,
  X,
  PlusCircle,
  HelpCircle,
  Flame
} from 'lucide-react';

export default function TradeWallPage({ currentUser, onNavigateToCatalog }) {
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedZone, setSelectedZone] = useState('bello');
  const [searchFilter, setSearchFilter] = useState('');
  const [onlyFoils, setOnlyFoils] = useState(false);
  const [nearMintOnly, setNearMintOnly] = useState(false);

  // ---------------------------------------------------------
  // 1. DATOS DE CRUCES MUTUOS (MUTUAL MATCHES)
  // ---------------------------------------------------------
  const mutualMatches = [
    {
      id: 'match-1',
      trader: {
        username: 'Camilo MTG',
        avatarInitials: 'C',
        zone: 'Bello Hub',
        distance: '1.4 km',
        lgs: 'LGS Dragon Hobby Bello',
        repScore: 4.96,
        totalTrades: 88,
        isVerified: true
      },
      parityDiffUsd: 2.50,
      parityPercent: 1.8,
      parityDirection: 'in_your_favor', // 'in_your_favor' | 'even' | 'need_cash'
      youGive: [
        {
          id: 'c1',
          name: 'The One Ring',
          set: 'LTR #451',
          priceUsd: 98.00,
          condition: 'NM',
          isFoil: true,
          frame: 'Borderless Extended',
          img: 'https://cards.scryfall.io/normal/front/9/3/93de71ff-0972-4f3a-8cf1-83c4fb871370.jpg'
        },
        {
          id: 'c2',
          name: 'Orcish Bowmasters',
          set: 'LTR #103',
          priceUsd: 34.50,
          condition: 'NM',
          isFoil: false,
          frame: 'Regular Frame',
          img: 'https://cards.scryfall.io/normal/front/7/c/7c024bae-5631-4e20-ac69-df392ac9e109.jpg'
        }
      ],
      youReceive: [
        {
          id: 'c3',
          name: 'Mox Diamond',
          set: 'STH #138',
          priceUsd: 135.00,
          condition: 'LP',
          isFoil: false,
          frame: 'Stronghold (Reserved List)',
          img: 'https://cards.scryfall.io/normal/front/b/f/bf9fec14-d221-4171-bad4-85ac40474fa7.jpg'
        }
      ]
    },
    {
      id: 'match-2',
      trader: {
        username: 'Valeria_Spells',
        avatarInitials: 'V',
        zone: 'Medellín • Laureles',
        distance: '6.2 km',
        lgs: 'Comic Store Viva Envigado',
        repScore: 5.0,
        totalTrades: 120,
        isVerified: true
      },
      parityDiffUsd: 0.00,
      parityPercent: 0.0,
      parityDirection: 'even',
      youGive: [
        {
          id: 'c4',
          name: 'Sheoldred, the Apocalypse',
          set: 'DMU #107',
          priceUsd: 82.00,
          condition: 'NM',
          isFoil: false,
          frame: 'Normal Frame',
          img: 'https://cards.scryfall.io/normal/front/d/6/d67be074-cdd4-41d9-ac89-0a0456c4e4b2.jpg'
        },
        {
          id: 'c5',
          name: 'Cyclonic Rift',
          set: 'RTR #035',
          priceUsd: 38.00,
          condition: 'NM',
          isFoil: false,
          frame: 'Regular',
          img: 'https://cards.scryfall.io/normal/front/f/f/ff08e5ed-f47b-4d8e-8b8b-41675dccef8b.jpg'
        }
      ],
      youReceive: [
        {
          id: 'c6',
          name: 'Mana Crypt (Special Guests)',
          set: 'SPG #017',
          priceUsd: 120.00,
          condition: 'NM',
          isFoil: true,
          frame: 'Foil Special Guest',
          img: 'https://cards.scryfall.io/normal/front/4/d/4d905c98-3470-4a45-96d0-03884c37f4e8.jpg'
        }
      ]
    }
  ];

  // ---------------------------------------------------------
  // 2. FEED DE CARTAS SUELTAS EN BINDERS PÚBLICOS
  // ---------------------------------------------------------
  const publicFeedCards = [
    {
      id: 'pf-1',
      name: 'Sol Ring (Masterpiece)',
      set: 'MPS #024',
      priceUsd: 420.00,
      priceCop: '1,671,600',
      condition: 'NM',
      isFoil: true,
      ownerHandle: '@DiegoCommander',
      distance: '1.2 km',
      wants: "Dual Lands, Gaea's Cradle, Grim Monolith",
      img: 'https://cards.scryfall.io/normal/front/1/7/17700a94-4363-4903-90d1-ad81832b49df.jpg'
    },
    {
      id: 'pf-2',
      name: 'Force of Will (Retro)',
      set: 'DMR #261',
      priceUsd: 78.00,
      priceCop: '310,400',
      condition: 'NM',
      isFoil: false,
      ownerHandle: '@AndresMTG',
      distance: 'Medellín',
      wants: 'Misty Rainforest, Polluted Delta, EDH staples',
      img: 'https://cards.scryfall.io/normal/front/8/9/89f612d6-7c53-4a0b-a88c-4a10c4360473.jpg'
    },
    {
      id: 'pf-3',
      name: 'Ragavan, Nimble Pilferer',
      set: 'MH2 #138',
      priceUsd: 42.00,
      priceCop: '167,160',
      condition: 'LP',
      isFoil: false,
      ownerHandle: '@NicoCards',
      distance: 'Itagüí',
      wants: 'Bowmasters, Modern Burn list',
      img: 'https://cards.scryfall.io/normal/front/a/1/a1399c20-f356-4030-a937-293630f91a6d.jpg'
    },
    {
      id: 'pf-4',
      name: 'Ancient Tomb (Expedition)',
      set: 'EXP #036',
      priceUsd: 160.00,
      priceCop: '636,800',
      condition: 'NM',
      isFoil: true,
      ownerHandle: '@MedellinVintage',
      distance: 'Poblado',
      wants: 'Reserved list, Wheel of Fortune',
      img: 'https://cards.scryfall.io/normal/front/b/d/bd3d4b4b-cf31-4f89-8140-9650edb03c7b.jpg'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* --------------------------------------------------------- */}
      {/* 1. TICKER / CINTA FINANCIERA P2P (FX USD / COP)           */}
      {/* --------------------------------------------------------- */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4 overflow-x-auto text-neutral-400">
          <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1 rounded border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-200 font-semibold">MOTOR SCRYFALL P2P</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">TASA TRM:</span>
            <span className="text-amber-500 font-bold">1 USD = 3,980 COP</span>
          </div>
          <span className="text-neutral-700">•</span>
          <div>
            <span className="text-neutral-500">Binders Verificados en el Valle de Aburrá:</span>{' '}
            <span className="text-neutral-200 font-bold">84 activos</span>
          </div>
          <span className="text-neutral-700">•</span>
          <div>
            <span className="text-neutral-500">Cruces Algorítmicos Mutuos:</span>{' '}
            <span className="text-emerald-400 font-bold">12 listos</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
          <ShieldCheck className="w-4 h-4" />
          <span>Intercambios presenciales verificados por OTP</span>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 2. PANEL DE FILTROS GEOGRÁFICOS Y DE PARIDAD              */}
      {/* --------------------------------------------------------- */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Selector de Zona Local */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs">
              <MapPin className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Zona Geográfica</span>
                <span className="font-bold text-white">Bello • Medellín Hub</span>
              </div>
            </div>

            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-mono">
              <button
                onClick={() => setSelectedZone('bello')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedZone === 'bello' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                5 km (Bello / Norte)
              </button>
              <button
                onClick={() => setSelectedZone('medellin')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedZone === 'medellin' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                10 km (Medellín)
              </button>
              <button
                onClick={() => setSelectedZone('metro')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedZone === 'metro' ? 'bg-amber-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Valle de Aburrá Completo
              </button>
            </div>
          </div>

          {/* Chips Rápidos de Filtro */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOnlyFoils(!onlyFoils)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                onlyFoils
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Solo Foils
            </button>
            <button
              onClick={() => setNearMintOnly(!nearMintOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                nearMintOnly
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Solo Near Mint (NM)
            </button>
          </div>

        </div>

        {/* Buscador de Cartas y Traders */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por carta, edición, comandante o @usuario local..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 3. CONSOLA PRINCIPAL EN 2 COLUMNAS                        */}
      {/* --------------------------------------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* COLUMNA IZQUIERDA: MUTUAL MATCHES (7 COLS) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Cruces Mutuos (Mutual Matches)</h2>
                <p className="text-xs text-neutral-400">Tú tienes lo que el otro busca, y él tiene lo que tú quieres</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              {mutualMatches.length} Cruces Listos
            </span>
          </div>

          {/* Tarjetas de Cruces Mutuos */}
          {mutualMatches.map((match) => {
            const youGiveTotal = match.youGive.reduce((acc, c) => acc + c.priceUsd, 0);
            const youReceiveTotal = match.youReceive.reduce((acc, c) => acc + c.priceUsd, 0);

            return (
              <article
                key={match.id}
                className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 backdrop-blur-md space-y-4 transition shadow-xl"
              >
                {/* Header del Trader y Tienda LGS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-neutral-800/60">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 flex items-center justify-center font-bold font-mono text-amber-500">
                        {match.trader.avatarInitials}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-neutral-950" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{match.trader.username}</span>
                        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                          {match.trader.zone}
                        </span>
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {match.trader.repScore}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">({match.trader.totalTrades} trades)</span>
                      </div>
                      <span className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-amber-500" />
                        Punto de encuentro: <strong className="text-neutral-200">{match.trader.lgs}</strong> ({match.trader.distance})
                      </span>
                    </div>
                  </div>

                  {/* Badge de Paridad */}
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-neutral-500 block">Balance del Trade</span>
                    {match.parityDirection === 'in_your_favor' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> +${match.parityDiffUsd.toFixed(2)} a tu favor (+{match.parityPercent}%)
                      </span>
                    )}
                    {match.parityDirection === 'even' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-950/60 border border-blue-800/60 text-blue-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paridad Exacta 1:1 ($0.00 diff)
                      </span>
                    )}
                  </div>
                </div>

                {/* Matriz Visual: Tú Entregas vs Tú Recibes */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/60">
                  
                  {/* Tú Entregas (5 cols) */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-amber-500 font-semibold uppercase text-[10px]">Tú Entregas ({match.youGive.length})</span>
                      <span className="font-mono font-bold text-white">${youGiveTotal.toFixed(2)} USD</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {match.youGive.map((card) => (
                        <div key={card.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 space-y-1">
                          <div className="aspect-[2.5/3.5] w-full rounded overflow-hidden bg-neutral-950 relative">
                            <img src={card.img} alt={card.name} className="w-full h-full object-cover" />
                            {card.isFoil && (
                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500 text-neutral-950 font-mono">
                                FOIL
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white truncate">{card.name}</div>
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-emerald-400">${card.priceUsd.toFixed(2)}</span>
                            <span className="px-1 rounded bg-neutral-800 text-neutral-300">{card.condition}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Icono de Conexión (1 col) */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center text-amber-500 py-2">
                    <ArrowLeftRight className="w-5 h-5" />
                    <span className="text-[9px] font-mono text-neutral-500 mt-1">SWAP</span>
                  </div>

                  {/* Tú Recibes (5 cols) */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-emerald-400 font-semibold uppercase text-[10px]">Tú Recibes ({match.youReceive.length})</span>
                      <span className="font-mono font-bold text-white">${youReceiveTotal.toFixed(2)} USD</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {match.youReceive.map((card) => (
                        <div key={card.id} className="bg-neutral-900 border border-neutral-800 rounded-lg p-2 space-y-1 col-span-2 sm:col-span-1">
                          <div className="aspect-[2.5/3.5] w-full rounded overflow-hidden bg-neutral-950 relative">
                            <img src={card.img} alt={card.name} className="w-full h-full object-cover" />
                            {card.isFoil && (
                              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500 text-neutral-950 font-mono">
                                FOIL
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold text-white truncate">{card.name}</div>
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-emerald-400">${card.priceUsd.toFixed(2)}</span>
                            <span className="px-1 rounded bg-neutral-800 text-neutral-300">{card.condition}</span>
                          </div>
                        </div>
                      ))}
                      <div className="hidden sm:flex flex-col justify-center items-center p-3 rounded-lg bg-neutral-900/50 border border-neutral-800/50 text-center">
                        <Flame className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-[10px] font-bold font-mono text-neutral-300 uppercase">Wishlist Match</span>
                        <span className="text-[10px] text-neutral-500 leading-tight mt-1">Carta de alta prioridad en tus deseos</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Barra de Acciones de la Propuesta */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-neutral-500 font-mono">
                    Paridad evaluada vía Scryfall Live
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProposal(match)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/10 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" /> Abrir Mesa de Negociación
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* COLUMNA DERECHA: BINDERS PÚBLICOS & FOR-TRADE FEED (5 COLS) */}
        <aside className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Cartas en Binders Locales</h2>
                <p className="text-xs text-neutral-400">Cartas sueltas marcadas para intercambio hoy</p>
              </div>
            </div>
          </div>

          {/* Cuadrícula de 2 columnas de cartas individuales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicFeedCards.map((card) => (
              <div
                key={card.id}
                className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3 backdrop-blur-md flex flex-col justify-between space-y-2 group transition"
              >
                <div>
                  <div className="aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-neutral-950 relative mb-2">
                    <img src={card.img} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <span className="absolute top-1.5 left-1.5 text-[8px] font-mono px-1 py-0.5 rounded bg-neutral-950/80 text-neutral-300 border border-neutral-800">
                      {card.set}
                    </span>
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700">
                      FOR TRADE
                    </span>
                    {card.isFoil && (
                      <span className="absolute bottom-1.5 right-1.5 text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500 text-neutral-950">
                        FOIL
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{card.name}</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-300">{card.condition}</span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 font-mono">
                      <span className="text-sm font-bold text-amber-400">${card.priceUsd.toFixed(2)}</span>
                      <span className="text-[10px] text-neutral-500">{card.priceCop} COP</span>
                    </div>

                    {/* Deseos del dueño */}
                    <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800/60 text-[10px] space-y-0.5">
                      <span className="text-rose-400 font-bold font-mono block uppercase text-[9px]">Busca a cambio:</span>
                      <p className="text-neutral-400 truncate">{card.wants}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-400 truncate">
                    {card.ownerHandle} ({card.distance})
                  </span>
                  <button
                    onClick={() => {
                      // Acción de propuesta individual
                    }}
                    className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 text-xs font-semibold font-mono border border-amber-500/30 transition"
                  >
                    Ofertar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>

      {/* --------------------------------------------------------- */}
      {/* 4. MODAL INTERACTIVO DE PROPUESTA (WORKBENCH)              */}
      {/* --------------------------------------------------------- */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Mesa de Intercambio • {selectedProposal.trader.username}</h3>
                <span className="text-xs text-neutral-400 font-mono">
                  {selectedProposal.trader.lgs} • Reputación: {selectedProposal.trader.repScore} ★
                </span>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* Resumen de paridad visual */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-neutral-400">Balance del Intercambio:</span>
                  <span className="text-emerald-400 font-bold">
                    +${selectedProposal.parityDiffUsd.toFixed(2)} USD a tu favor
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden flex">
                  <div className="h-full bg-amber-500" style={{ width: '49%' }} />
                  <div className="h-full bg-emerald-500" style={{ width: '51%' }} />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                  <span>Tu aporte: $132.50 USD</span>
                  <span>Aporte de {selectedProposal.trader.username}: $135.00 USD</span>
                </div>
              </div>

              {/* Punto de entrega acordado */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
                  Punto de Encuentro Sugerido (Tienda LGS)
                </label>
                <select className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 outline-none focus:border-amber-500">
                  <option>LGS Dragon Hobby • Estación Bello Metro</option>
                  <option>La Cueva del Geek • Estadio / Laureles</option>
                  <option>Comic Store Viva Envigado • Envigado</option>
                </select>
              </div>

              {/* Mensaje de negociación */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
                  Nota o Comentario para el Trader
                </label>
                <textarea
                  rows={3}
                  defaultValue="Hola Camilo, puedo llevar las cartas en doble folio para revisión presencial este sábado en Dragon Hobby."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 outline-none focus:border-amber-500 resize-none"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Bloqueo temporal de copias por 48 horas
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    alert('¡Propuesta de intercambio enviada con éxito!');
                    setSelectedProposal(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/10"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Propuesta P2P
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
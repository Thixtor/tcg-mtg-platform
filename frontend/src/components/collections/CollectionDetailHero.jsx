// ---------------------------------------------------------
// COMPONENTE: HERO BANNER DE COLECCIÓN CON ESTADOS CLAROS
// ---------------------------------------------------------
import React from 'react';
import { ArrowLeft, Layers, DollarSign, Repeat, Swords } from 'lucide-react';

export default function CollectionDetailHero({
  collection,
  heroArt,
  subTab = 'all',
  onSubTabChange,
  priceSource = 'tcgplayer',
  allCount = 0,
  deckCount = 0,
  tradeCount = 0,
  totalCards = 0,
  totalValue = 0,
  onBack,
}) {
  const storeLabel = priceSource === 'cardkingdom' ? 'CARD KINGDOM' : 'TCGPLAYER MARKET';

  return (
    <section className="relative w-full min-h-[380px] sm:min-h-[440px] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#120D1A] via-[#0E0C12] to-[#0B0B0B] border-b border-white/5">
      {/* Arte Panorámico de Fondo */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-full md:w-3/4 lg:w-2/3 bg-cover bg-center pointer-events-none opacity-45 mix-blend-screen transition-opacity duration-700"
        style={{
          backgroundImage: `url(${heroArt})`,
          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B] via-[#0B0B0B]/80 to-transparent pointer-events-none" />

      {/* Navegación y Pestañas de Disponibilidad */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-8 relative z-10 space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 hover:text-white transition group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
          <span>Volver a Colecciones</span>
        </button>

        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white capitalize">
            {collection.name}
          </h1>

          {/* Pestañas de Estado de Inventario (Eliminado Play) */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSubTabChange('all')}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                subTab === 'all'
                  ? 'bg-[#8B5CF6] text-white shadow-lg shadow-purple-500/25 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todas ({allCount})</span>
            </button>

            <button
              type="button"
              onClick={() => onSubTabChange('decks')}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                subTab === 'decks'
                  ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/25 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>En Decks ({deckCount})</span>
            </button>

            <button
              type="button"
              onClick={() => onSubTabChange('trade')}
              className={`px-5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                subTab === 'trade'
                  ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/25 font-black'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Para Trade ({tradeCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPIs Flotantes */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pb-8 relative z-10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[140px] px-5 py-4 rounded-2xl bg-[#1A1822]/80 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <Layers className="w-4 h-4 text-purple-400 mb-2" />
            <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none">
              {totalCards}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mt-1">
              TOTAL CARDS
            </span>
          </div>

          <div className="min-w-[180px] px-5 py-4 rounded-2xl bg-[#1A1822]/80 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                {storeLabel}
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono leading-none">
              ${totalValue.toFixed(2)} USD
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mt-1">
              EST. VALUE
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
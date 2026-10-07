// ============================================================================
// COMPONENTE: BANNER HERO & BARRA DE BÚSQUEDA DEL BLACK MARKET
// ============================================================================
// DESCRIPCIÓN:
// - Encabezado visual cinematográfico con temática Dark / Ámbar (#E88B00).
// - Contiene el buscador reactivo de cartas y comandantes.
// - Botones de acción rápida: Publicar oferta y atajo a Mi Wishlist.
// - Métricas en tiempo real (KPIs): Tratos activos, cartas deseadas y tasa COP/USD.
// ============================================================================

import React from 'react';
import { Skull, Search, ArrowRight, Plus, Heart } from 'lucide-react';

const HERO_BACKGROUND_ART = 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1920&auto=format&fit=crop';

export default function TradeHeroBanner({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  onOpenCreate,
  wishlistCount,
  activeTradesCount,
  preferredRate = 3200
}) {
  return (
    <section className="relative w-full min-h-[460px] flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#18130E] via-[#0E0C10] to-[#0C0B0E] border-b border-[#242129]">
      {/* Capa de arte panorámico fusionado con máscara de degradado */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-full md:w-3/4 lg:w-2/3 bg-cover bg-center pointer-events-none opacity-35 mix-blend-screen transition-opacity duration-700"
        style={{
          backgroundImage: `url(${HERO_BACKGROUND_ART})`,
          maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0C0B0E] via-transparent to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0C0B0E] via-[#0C0B0E]/90 to-transparent pointer-events-none" />

      {/* Contenido principal del Banner */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pt-10 relative z-10 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1F170E] border border-[#E88B00]/40 text-[#E88B00] font-mono text-xs font-bold tracking-wider uppercase rounded-full">
          <Skull className="w-3.5 h-3.5" />
          <span>Plataforma Comunitaria & Marketplace P2P</span>
        </div>

        <div className="max-w-3xl space-y-3">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase leading-[1.05]">
            BLACK MARKET, <br />
            <span className="text-[#E88B00]">INTERCAMBIA Y CONECTA</span>
          </h1>
          <p className="text-sm font-normal text-neutral-300 max-w-2xl leading-relaxed font-sans">
            Consulta legalidad oficial de formatos, audita barajas contra tu inventario físico y conecta con otros coleccionistas para realizar trade local sin intermediarios.
          </p>
        </div>

        {/* Bloque: Barra de Búsqueda Integrada */}
        <div className="pt-2 max-w-2xl">
          <div className="flex items-center bg-[#131217] border border-[#2A2733] focus-within:border-[#E88B00] transition rounded-2xl overflow-hidden p-1">
            <div className="pl-3 text-neutral-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar carta por nombre o comandante..."
              className="w-full px-3 py-2.5 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 outline-none font-mono"
            />
            <button
              type="button"
              className="px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black text-xs uppercase font-mono tracking-wider flex items-center gap-1.5 shrink-0 rounded-xl transition cursor-pointer"
            >
              <span>Buscar</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Bloque: Botones de Acción Primaria */}
        <div className="flex flex-wrap items-center gap-3 pt-2 font-mono">
          <button
            type="button"
            onClick={onOpenCreate}
            className="px-6 py-3 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black text-xs tracking-wider flex items-center gap-2 rounded-xl transition shadow-lg shadow-[#E88B00]/10 cursor-pointer active:translate-y-0.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>OFRECER CARTA</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('wishlist')}
            className={`px-6 py-3 border font-bold text-xs tracking-wider flex items-center gap-2 rounded-xl transition cursor-pointer ${
              activeTab === 'wishlist'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500'
                : 'bg-[#131217] hover:bg-[#1A1820] border-[#2A2733] hover:border-neutral-500 text-neutral-200'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>MI WISHLIST ({wishlistCount})</span>
          </button>
        </div>
      </div>

      {/* Bloque: Indicadores Clave de Desempeño (KPIs) */}
      <div className="max-w-[1920px] mx-auto w-full px-6 sm:px-10 pb-8 pt-8 relative z-10 font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[160px] px-5 py-3.5 bg-[#131217]/90 border border-[#2A2733] flex flex-col justify-between rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">TRATOS ACTIVOS</span>
            <span className="text-2xl sm:text-3xl font-black text-white leading-none">{activeTradesCount}</span>
          </div>

          <div className="min-w-[160px] px-5 py-3.5 bg-[#131217]/90 border border-[#2A2733] flex flex-col justify-between rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">EN MI WISHLIST</span>
            <span className="text-2xl sm:text-3xl font-black text-rose-400 leading-none">{wishlistCount}</span>
          </div>

          <div className="min-w-[190px] px-5 py-3.5 bg-[#131217]/90 border border-[#2A2733] flex flex-col justify-between rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">TASA LOCAL ACORDADA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#E88B00] leading-none">
                ${preferredRate.toLocaleString('es-CO')}
              </span>
              <span className="text-[10px] text-neutral-400">COP / 1 USD</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
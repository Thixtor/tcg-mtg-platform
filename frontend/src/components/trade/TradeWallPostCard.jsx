// ============================================================================
// COMPONENTE: TARJETA DE PUBLICACIÓN EN BLACK MARKET (ESTILO INTERCAMBIO DUAL)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Dos paneles enfrentados:
//   * Panel Ámbar (TU OFERTA): Carta detallada en gran formato con atributos MTG.
//   * Panel Azul-Cian (TU BÚSQUEDA): Requerimientos de cartas o venta en efectivo.
// - Condiciones / Notas de entrega ubicadas en la parte inferior de ambos paneles.
// - Confianza delegada 100% en la reputación ganada del usuario (@usuario + ★ score).
// - Soporta CTA para proponer intercambio parcial/total o gestionar si es propia.
// ============================================================================

import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  MapPin, 
  Sparkles, 
  Banknote, 
  Flame, 
  Search as SearchIcon, 
  Star, 
  ChevronRight,
  MessageSquare
} from 'lucide-react';

export default function TradeWallPostCard({
  post,
  matchesWishlist = false,
  isOwner = false,
  onPropose,
  onCardClick
}) {
  const author = post.author || {};
  const offered = post.offered_cards || [];
  const wanted = post.wanted_cards || [];
  const [selectedOfferIndex, setSelectedOfferIndex] = useState(0);

  const activeOfferCard = offered[selectedOfferIndex] || offered[0] || {};
  const isCashOnly = Boolean(post.accepts_cash && wanted.length === 0);

  // Extracción de datos extendidos de la carta ofrecida
  const cardName = activeOfferCard.name || 'Carta MTG';
  const imgUrl = activeOfferCard.image_url || activeOfferCard.card_catalog?.image_url;
  const rawData = activeOfferCard.scryfall_raw_data || activeOfferCard.card_catalog?.scryfall_raw_data || {};
  
  const manaCost = activeOfferCard.mana_cost || rawData.mana_cost || activeOfferCard.card_catalog?.mana_cost || '';
  const typeLine = activeOfferCard.type_line || rawData.type_line || activeOfferCard.card_catalog?.type_line || 'Carta MTG';
  const rarity = activeOfferCard.rarity || rawData.rarity || 'Mítica';
  const power = activeOfferCard.power ?? rawData.power;
  const toughness = activeOfferCard.toughness ?? rawData.toughness;
  const oracleText = activeOfferCard.oracle_text || rawData.oracle_text || activeOfferCard.card_catalog?.oracle_text || '';
  const setName = activeOfferCard.set_name || rawData.set_name || 'MTG Set';
  const priceUsd = activeOfferCard.price_usd || activeOfferCard.market_price_usd;

  return (
    <article className="w-full bg-[#0D0B11] border border-[#23202A] rounded-3xl p-5 sm:p-7 space-y-5 font-mono text-xs shadow-2xl transition-all duration-200 hover:border-[#E88B00]/40">
      
      {/* 1. Header Superior: Perfil del Usuario + Reputación + Cotización */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E88B00] text-black font-black flex items-center justify-center text-sm shadow-md shrink-0">
            {author.username ? author.username.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">@{author.username || 'usuario'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>{author.reputation_score ?? 100}</span>
              </span>
              {matchesWishlist && (
                <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>En tu Wishlist</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mt-0.5">
              <MapPin className="w-3 h-3 text-neutral-500" />
              <span>{post.location || 'Medellín / Área Metropolitana'}</span>
            </div>
          </div>
        </div>

        {/* Cotización de Referencia */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-[#141219] border border-white/5 flex items-center gap-2">
            <span className="text-[#E88B00] font-bold">🪙</span>
            <div>
              <span className="text-neutral-200 font-bold block text-[11px]">
                1 USD ≈ ${Number(post.preferred_usd_rate || 3200).toLocaleString('es-CO')} COP
              </span>
              <span className="text-neutral-500 text-[9px] block">Referencia de valor</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cuerpo Central: Dos Paneles Enfrentados (Oferta vs Demanda) */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* PANEL IZQUIERDO: OFERTA (Marco Ámbar) */}
        <div className="lg:col-span-6 rounded-3xl p-5 border border-[#E88B00]/40 bg-[#120F16]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#E88B00] font-black uppercase tracking-wider text-xs">
                <Flame className="w-4 h-4 fill-[#E88B00]" />
                <span>TU OFERTA</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[10px]">
                {offered.length} carta{offered.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Selector de cartas si el post contiene varias */}
            {offered.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {offered.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOfferIndex(i)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition shrink-0 cursor-pointer ${
                      selectedOfferIndex === i
                        ? 'bg-[#E88B00] text-black border-[#E88B00]'
                        : 'bg-[#181520] text-neutral-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {/* Layout de la Carta Ofrecida (Imagen Grande + Atributos) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              {/* Miniatura en Proporción MTG */}
              <div 
                onClick={() => onCardClick?.(activeOfferCard)}
                className="sm:col-span-5 aspect-[2.5/3.5] rounded-2xl overflow-hidden bg-neutral-950 border border-white/10 relative group cursor-pointer shadow-lg"
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={cardName}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600">
                    MTG Card
                  </div>
                )}
                {activeOfferCard.is_foil && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 border border-amber-400 text-amber-300 text-[9px] font-bold">
                    FOIL
                  </span>
                )}
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold">
                  {activeOfferCard.condition || 'NM'}
                </span>
              </div>

              {/* Atributos y Reglas */}
              <div className="sm:col-span-7 space-y-2 text-[11px]">
                <div>
                  <h4 className="font-bold text-white text-sm">{cardName}</h4>
                  <span className="text-neutral-400 text-[10px] block mt-0.5">
                    ● {typeLine}
                  </span>
                </div>

                {manaCost && (
                  <div className="text-amber-400 font-bold">{manaCost}</div>
                )}

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-bold uppercase">
                    {rarity}
                  </span>
                  <span className="text-neutral-500 text-[10px]">{setName}</span>
                </div>

                {/* Habilidad / Oracle Text */}
                {oracleText && (
                  <p className="text-neutral-300 text-[10px] line-clamp-3 bg-black/30 p-2.5 rounded-xl border border-white/5 leading-relaxed font-sans">
                    {oracleText}
                  </p>
                )}

                {/* Estadísticas de Poder / Resistencia */}
                {(power !== undefined && toughness !== undefined) && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-neutral-400 text-[10px]">Poder / Toughness:</span>
                    <span className="text-white font-bold px-2 py-0.5 bg-white/5 rounded-lg border border-white/10">
                      {power}/{toughness}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {priceUsd && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">Valor de referencia:</span>
              <span className="text-emerald-400 font-bold text-xs">${parseFloat(priceUsd).toFixed(2)} USD</span>
            </div>
          )}
        </div>

        {/* ICONO CENTRAL DE ENLACE */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#181620] border border-[#2E2A38] items-center justify-center text-[#E88B00] shadow-xl z-10 pointer-events-none">
          <ArrowLeftRight className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* PANEL DERECHO: BÚSQUEDA (Marco Azul-Cian) */}
        <div className="lg:col-span-6 rounded-3xl p-5 border border-sky-500/40 bg-[#0E131A]/60 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-black uppercase tracking-wider text-xs">
                <SearchIcon className="w-4 h-4" />
                <span>TU BÚSQUEDA</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[10px]">
                {isCashOnly ? 'Efectivo' : `${wanted.length} carta${wanted.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Cartas solicitadas o Modo Solo Efectivo */}
            {isCashOnly ? (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <Banknote className="w-4 h-4" />
                  <span>Publicación para Venta Directa</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  El usuario no busca cartas a cambio; acepta transferencia o dinero en efectivo bajo la tasa indicada.
                </p>
              </div>
            ) : wanted.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {wanted.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#141923] border border-sky-950 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {w.image_url ? (
                        <img src={w.image_url} alt={w.name} className="w-8 h-11 object-cover rounded-lg shrink-0 shadow" />
                      ) : (
                        <div className="w-8 h-11 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[8px] text-neutral-600 shrink-0">
                          MTG
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate text-xs">{w.name}</span>
                        <span className="text-sky-400 text-[10px] block">Condición: {w.condition || 'Cualquiera'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-sky-500/20 text-neutral-500 text-center py-8 space-y-1">
                <p className="font-bold text-neutral-300">Abierto a propuestas libres</p>
                <p className="text-[10px]">Puedes proponer staples de Commander, tierras o ajuste monetario.</p>
              </div>
            )}
          </div>

          <div className="pt-2 text-right text-neutral-500 text-[10px]">
            Publicado recientemente en Black Market
          </div>
        </div>

      </div>

      {/* 3. Condiciones / Notas de Entrega (Ubicadas afuera, debajo de las cartas) */}
      {post.notes && (
        <div className="p-4 rounded-2xl bg-[#121118] border border-white/5 flex items-start gap-3">
          <MessageSquare className="w-4 h-4 text-[#E88B00] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider block">
              Condiciones del intercambio:
            </span>
            <p className="text-neutral-200 text-xs leading-relaxed font-sans">
              "{post.notes}"
            </p>
          </div>
        </div>
      )}

      {/* 4. Footer: Botón de Acción Principal */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-end">
        <button
          type="button"
          onClick={() => onPropose?.(post)}
          className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#E88B00]/20 active:scale-95"
        >
          <span>{isOwner ? 'Gestionar Mi Oferta' : 'Proponer Intercambio'}</span>
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

    </article>
  );
}
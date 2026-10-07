// ============================================================================
// COMPONENTE: TARJETA DE OFERTA DE TRADE (FEED COMUNITARIO)
// ============================================================================
// DESCRIPCIÓN:
// - Renderiza una publicación de intercambio individual de la comunidad.
// - Presenta dos columnas comparativas: "BUSCA" (verde) ⇄ "OFRECE" (ámbar).
// - Incorpora un badge de coincidencia reactivo si alguna carta ofertada coincide
//   con la Wishlist del usuario autenticado.
// - Incluye botón directo para iniciar la propuesta con compensación monetaria.
// ============================================================================

import React from 'react';
import { MapPin, Sparkles } from 'lucide-react';

export default function TradeWallPostCard({
  post,
  matchesWishlist = false,
  onPropose
}) {
  return (
    <article
      className={`bg-[#131217] border p-6 space-y-4 transition rounded-2xl ${
        matchesWishlist 
          ? 'border-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40' 
          : 'border-[#2A2733] hover:border-[#E88B00]/60'
      }`}
    >
      {/* Bloque: Encabezado del Trader */}
      <div className="flex items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#1A1822] border border-[#373344] flex items-center justify-center font-black text-[#E88B00] text-xs rounded-xl">
            {((post.author?.username || post.author_username || 'U')).slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-white text-xs block">
              @{post.author?.username || post.author_username || 'Usuario'}
            </span>
            <span className="text-neutral-500 text-[10px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-neutral-400" />
              {post.location || 'Medellín / Área Metropolitana'}
            </span>
          </div>
        </div>

        {matchesWishlist && (
          <span className="px-3 py-1 text-[10px] font-bold font-mono bg-purple-950/80 border border-purple-500/50 text-purple-300 flex items-center gap-1.5 rounded-full shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> Está en tu Wishlist
          </span>
        )}
      </div>

      {/* Bloque: Cuadrícula Comparativa de Cartas (BUSCA vs OFRECE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
        {/* Columna: Cartas Solicitadas */}
        <div className="p-4 bg-[#0A0F0D] border border-emerald-950 space-y-2 rounded-xl">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">BUSCA</span>
          <div className="space-y-1.5">
            {(post.wanted_cards || []).map((c, i) => (
              <div key={i} className="text-white font-bold text-xs truncate flex items-center justify-between">
                <span>• {c.name}</span>
                <span className="text-[10px] text-neutral-500">{c.condition || 'NM'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: Cartas Ofertadas */}
        <div className="p-4 bg-[#140F08] border border-[#E88B00]/20 space-y-2 rounded-xl">
          <span className="text-[10px] font-bold text-[#E88B00] uppercase tracking-wider block">OFRECE</span>
          <div className="space-y-1.5">
            {(post.offered_cards || []).map((c, i) => (
              <div key={i} className="text-white font-bold text-xs truncate flex items-center justify-between">
                <span>• {c.name}</span>
                <span className="text-[10px] text-[#E88B00] font-bold">
                  {c.price_usd ? `$${parseFloat(c.price_usd).toFixed(2)}` : 'NM'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bloque: Notas y Acuerdos de Encuentro */}
      {post.notes && (
        <p className="text-[11px] font-mono text-neutral-400 bg-[#0C0B0E] px-3.5 py-2.5 border border-[#242129] rounded-xl">
          <span className="text-[#E88B00] font-bold">Nota:</span> {post.notes}
        </p>
      )}

      {/* Bloque: Acción para Iniciar Propuesta */}
      <div className="flex items-center justify-end pt-2 border-t border-[#242129]">
        <button
          type="button"
          onClick={() => onPropose(post)}
          className="px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-mono font-black text-xs uppercase tracking-wider transition cursor-pointer rounded-xl active:translate-y-0.5"
        >
          Proponer cambio
        </button>
      </div>
    </article>
  );
}
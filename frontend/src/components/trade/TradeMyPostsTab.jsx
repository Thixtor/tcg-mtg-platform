// ============================================================================
// COMPONENTE: PESTAÑA DE MIS OFERTAS ACTIVAS PUBLICADAS EN EL TRADE WALL
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Despliega las ofertas que el usuario autenticado tiene abiertas en el muro.
// - Acceso directo para crear nuevas publicaciones.
// ============================================================================

import React from 'react';
import { Layers, Loader2 } from 'lucide-react';

export default function TradeMyPostsTab({
  loading,
  posts = [],
  onCreateClick
}) {
  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
        <span>Cargando tus publicaciones activas...</span>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-3 font-mono text-xs rounded-2xl">
        <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
        <p className="text-neutral-300 font-bold uppercase">No has publicado ofertas aún.</p>
        <button
          type="button"
          onClick={onCreateClick}
          className="mt-2 px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase text-xs font-mono tracking-wider transition cursor-pointer rounded-xl"
        >
          + Publicar oferta de trade
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono">
      {posts.map((post) => (
        <article key={post.id} className="bg-[#131217] border border-[#2A2733] p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#E88B00] font-bold">Publicación activa</span>
            <span className="text-neutral-500">{post.location || 'Local'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-[#140F08] border border-[#E88B00]/20 rounded-xl">
              <span className="text-[10px] text-[#E88B00] font-bold block uppercase">Ofreces:</span>
              {(post.offered_cards || []).map((c, i) => (
                <div key={i} className="text-white font-bold truncate">• {c.name}</div>
              ))}
            </div>
            <div className="p-3 bg-[#0A0F0D] border border-emerald-950 rounded-xl">
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">Buscas:</span>
              {(post.wanted_cards || []).map((w, i) => (
                <div key={i} className="text-white font-bold truncate">• {w.name}</div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
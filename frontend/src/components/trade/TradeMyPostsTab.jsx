// ============================================================================
// COMPONENTE: PESTAÑA DE MIS OFERTAS ACTIVAS (BLACK MARKET)
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Despliega todas las publicaciones creadas por el usuario autenticado.
// - Reutiliza el diseño visual dual para coherencia visual con el feed.
// - Permite crear nuevas ofertas y hacer seguimiento directo de cada una.
// ============================================================================

import React from 'react';
import { Layers, Loader2, Plus } from 'lucide-react';
import TradeWallPostCard from '@/components/trade/TradeWallPostCard';

export default function TradeMyPostsTab({
  loading,
  posts = [],
  onCreateClick,
  onCardClick,
  onManagePost
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
      <div className="py-20 text-center border border-dashed border-[#2A2733] bg-[#131217]/50 p-8 space-y-4 font-mono text-xs rounded-3xl">
        <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
        <div className="space-y-1">
          <p className="text-neutral-300 font-bold uppercase text-sm">No tienes publicaciones activas.</p>
          <p className="text-neutral-500 text-[11px]">
            Crea una oferta para poner cartas a la venta, permuta o buscar cartas en la comunidad.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateClick}
          className="px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase text-xs font-mono tracking-wider transition cursor-pointer rounded-xl inline-flex items-center gap-1.5 shadow-lg shadow-[#E88B00]/10"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Publicar en Black Market</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs font-mono px-1">
        <span className="text-neutral-400">
          Tienes <strong className="text-white">{posts.length}</strong> publicación{posts.length !== 1 ? 'es' : ''} activa{posts.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={onCreateClick}
          className="text-[#E88B00] hover:underline font-bold cursor-pointer"
        >
          + Nueva Publicación
        </button>
      </div>

      <div className="space-y-5">
        {posts.map((post) => (
          <TradeWallPostCard
            key={post.id}
            post={post}
            isOwner={true}
            onCardClick={onCardClick}
            onPropose={onManagePost || onCreateClick}
          />
        ))}
      </div>
    </div>
  );
}
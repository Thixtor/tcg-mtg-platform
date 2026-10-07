// ---------------------------------------------------------
// COMPONENTE: TARJETA DE PUBLICACIÓN EN FEED (BUSCO VS OFREZCO)
// ---------------------------------------------------------
import React from 'react';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MapPin, 
  ShieldCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function TradePostCard({
  post,
  onOpenCard,
  onProposeTrade,
}) {
  const {
    id,
    author_username = 'UsuarioMTG',
    author_location = 'Medellín',
    time_ago = 'hace 15 min',
    is_verified = true,
    is_near = false,
    distance = '12 km de ti',
    wanted_cards = [],
    offered_cards = [],
    likes_count = 12,
    comments_count = 4,
    notes = 'Interesado en otros cambios',
  } = post;

  return (
    <article className="bg-[#121118]/90 border border-neutral-800 hover:border-neutral-700 rounded-3xl p-5 backdrop-blur-md space-y-4 transition shadow-2xl font-mono text-xs">
      
      {/* 1. CABECERA: USUARIO, CIUDAD Y BADGES */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 text-sm">
            {author_username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">@{author_username}</span>
              <span className="text-[10px] text-neutral-500">• {author_location} • {time_ago}</span>
            </div>
            {is_near && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                <MapPin className="w-3 h-3" /> A {distance}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {is_verified && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verificado
            </span>
          )}
        </div>
      </div>

      {/* 2. CUERPO COMPARATIVO: BUSCO vs OFREZCO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* COLUMNA VERDE: BUSCO */}
        <div className="bg-[#0E1513] border border-emerald-950/80 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px] tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>BUSCO</span>
          </div>

          <div className="space-y-2">
            {wanted_cards.map((card, i) => (
              <div 
                key={i} 
                onClick={() => onOpenCard?.(card)}
                className="flex items-center gap-3 p-1.5 rounded-xl bg-black/40 hover:bg-black/80 border border-white/5 transition cursor-pointer group"
              >
                <img
                  src={card.image_url || 'https://cards.scryfall.io/back.png'}
                  alt={card.name}
                  className="w-12 h-16 rounded-lg object-cover border border-white/10 shrink-0 group-hover:scale-105 transition"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="font-bold text-white text-xs block truncate group-hover:text-emerald-300 transition">
                    {card.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 block truncate">
                    {card.edition || 'Cualquier edición'} • {card.condition || 'NM o mejor'} {card.is_foil ? '• Foil preferible' : ''}
                  </span>
                  {card.note && (
                    <span className="text-[9px] text-emerald-400 block truncate">
                      ★ {card.note}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA PÚRPURA: OFREZCO */}
        <div className="bg-[#161022] border border-purple-950/80 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-[11px] tracking-wider">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>OFREZCO</span>
          </div>

          <div className="space-y-2">
            {offered_cards.map((card, i) => (
              <div 
                key={i} 
                onClick={() => onOpenCard?.(card)}
                className="flex items-center gap-3 p-1.5 rounded-xl bg-black/40 hover:bg-black/80 border border-white/5 transition cursor-pointer group"
              >
                <img
                  src={card.image_url || 'https://cards.scryfall.io/back.png'}
                  alt={card.name}
                  className="w-12 h-16 rounded-lg object-cover border border-white/10 shrink-0 group-hover:scale-105 transition"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="font-bold text-white text-xs block truncate group-hover:text-purple-300 transition">
                    {card.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 block truncate">
                    {card.edition || 'Cualquier edición'} • {card.condition || 'NM'} {card.is_foil ? '• Foil' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. NOTA DE NEGOCIACIÓN ADICIONAL */}
      {notes && (
        <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded-xl border border-white/5">
          <span className="text-amber-400 font-bold">Nota:</span> {notes}
        </div>
      )}

      {/* 4. FOOTER SOCIAL Y BOTÓN "+ PROPONER CAMBIO" */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-4 text-neutral-400 text-xs">
          <button className="flex items-center gap-1.5 hover:text-rose-400 transition cursor-pointer">
            <Heart className="w-4 h-4" />
            <span>{likes_count}</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition cursor-pointer">
            <MessageSquare className="w-4 h-4" />
            <span>{comments_count}</span>
          </button>
          <button className="hover:text-white transition cursor-pointer">
            <Bookmark className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onProposeTrade?.(post)}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30"
        >
          <span>+ Proponer cambio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </article>
  );
}
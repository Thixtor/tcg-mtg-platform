// ---------------------------------------------------------
// COMPONENTE: BARRA LATERAL DERECHA (TRADE LIST, WISHLIST, TOP TRADERS)
// ---------------------------------------------------------
import React from 'react';
import { Star, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function TradeSidebarRight({
  tradeList = [],
  wishlist = [],
  topTraders = [],
  onManageTradeList,
  onManageWishlist,
  onNavigateToCatalog,
}) {
  return (
    <aside className="w-full lg:w-80 space-y-6 font-mono text-xs select-none">
      
      {/* 1. TU TRADE LIST */}
      <div className="bg-[#121118] border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">Tu trade list</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">
              {tradeList.length}
            </span>
          </div>
        </div>

        {tradeList.length === 0 ? (
          <p className="text-[11px] text-neutral-500 py-3 text-center">
            No tienes cartas marcadas para trade. Marca ejemplares desde tus Colecciones.
          </p>
        ) : (
          <div className="space-y-2">
            {tradeList.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-neutral-900/60 transition">
                <img
                  src={item.image_url || 'https://cards.scryfall.io/back.png'}
                  alt={item.name}
                  className="w-9 h-12 rounded object-cover border border-white/5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-200 truncate text-[11px]">{item.name}</span>
                    <span className="text-neutral-500 text-[10px] font-bold">{item.quantity || 1}x</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    ${(item.price_usd || 18.5).toFixed(2)} c/u
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onManageTradeList}
          className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-[10px] transition cursor-pointer border border-neutral-800"
        >
          Gestionar mi trade list
        </button>
      </div>

      {/* 2. TU WISHLIST */}
      <div className="bg-[#121118] border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">Tu wishlist</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
              {wishlist.length}
            </span>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <p className="text-[11px] text-neutral-500 py-3 text-center">
            Tu lista de deseos está vacía. Añade cartas faltantes desde tus Decks.
          </p>
        ) : (
          <div className="space-y-2">
            {wishlist.slice(0, 5).map((card, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-neutral-900/60 transition">
                <img
                  src={card.image_url || 'https://cards.scryfall.io/back.png'}
                  alt={card.name}
                  className="w-8 h-10 rounded object-cover border border-white/5 shrink-0"
                />
                <span className="font-bold text-neutral-200 truncate text-[11px] flex-1">
                  {card.name}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onManageWishlist}
          className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-[10px] transition cursor-pointer border border-neutral-800"
        >
          Gestionar wishlist
        </button>
      </div>

      {/* 3. USUARIOS DESTACADOS (TOP TRADERS) */}
      <div className="bg-[#121118] border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-xl">
        <span className="font-bold text-white text-xs block pb-1 border-b border-neutral-800">
          Usuarios destacados
        </span>

        <div className="space-y-3">
          {topTraders.map((trader) => (
            <div key={trader.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                {trader.avatar ? (
                  <img src={trader.avatar} alt={trader.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  trader.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-neutral-200 text-[11px] truncate">@{trader.username}</span>
                  {trader.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <span className="text-[10px] text-neutral-500 block truncate">{trader.location}</span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {trader.completion_rate}% • {trader.trades_count} intercambios
                </span>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full text-center text-neutral-500 hover:text-white text-[10px] pt-1 block cursor-pointer">
          Ver más usuarios →
        </button>
      </div>

      {/* 4. CALL TO ACTION: HAZ CRECER TU COLECCIÓN */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-transparent border border-white/10 space-y-2">
        <span className="font-bold text-white text-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Haz crecer tu colección
        </span>
        <p className="text-[10px] text-neutral-400 leading-relaxed">
          Cada intercambio te acerca a la carta que buscas sin gastar de más.
        </p>
        <button
          onClick={onNavigateToCatalog}
          className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[10px] transition cursor-pointer shadow-md shadow-amber-500/20"
        >
          Explorar ahora
        </button>
      </div>

    </aside>
  );
}
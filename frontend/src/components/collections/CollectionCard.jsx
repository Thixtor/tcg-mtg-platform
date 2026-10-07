// ---------------------------------------------------------
// COMPONENTE: TARJETA VISUAL DE COLECCIÓN CON BADGE DE TRADE
// ---------------------------------------------------------
import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  Lock, 
  Globe, 
  MoreVertical, 
  Sparkles, 
  Search, 
  Upload, 
  Star, 
  ExternalLink, 
  Edit2, 
  Share2, 
  Trash2,
  Repeat
} from 'lucide-react';

export function CollectionCard({
  collection,
  onOpen,
  onEdit,
  onDelete,
  onToggleFavorite,
  onSearchCards,
  onImportList,
  isLightMode = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const {
    name = 'Sin título',
    description = '',
    is_public_trade = false,
    is_for_trade = false,
    is_favorite = false,
    card_count = 0,
    total_value = 0,
    updated_at,
    created_at,
    art_url,
    preview_cards = [],
  } = collection;

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateValue = updated_at || created_at;
  const formattedDate = dateValue 
    ? new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateValue))
    : 'Reciente';

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total_value || 0);

  // Previsualizaciones de miniaturas usando recorte artístico (art_crop)
  const cardPreviews = preview_cards.length > 0 
    ? preview_cards.slice(0, 5) 
    : (art_url ? [art_url] : []);

  return (
    <div className={`relative rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 hover:shadow-2xl group select-none ${
      isLightMode
        ? 'bg-white border-neutral-200/90 hover:border-amber-500/40 shadow-sm'
        : 'bg-[#121214] border-white/5 hover:border-amber-500/30 shadow-xl'
    }`}>
      {/* 1. CABECERA: Ícono, Nombre, Badges y Menú ⋮ */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 
                  onClick={() => onOpen?.(collection)}
                  className={`text-base font-black truncate cursor-pointer hover:text-amber-500 transition ${
                    isLightMode ? 'text-neutral-900' : 'text-white'
                  }`}
                >
                  {name}
                </h4>
                {is_favorite && (
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono line-clamp-1">
                {description || 'Sin notas descriptivas en la carpeta.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Badge de Disponibilidad para Trade */}
            {is_for_trade && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <Repeat className="w-3 h-3" />
                <span>Trade</span>
              </span>
            )}

            {/* Badge de Visibilidad Pública/Privada */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider ${
              is_public_trade
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-neutral-800/80 text-neutral-400 border border-neutral-700/60'
            }`}>
              {is_public_trade ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{is_public_trade ? 'Pública' : 'Privada'}</span>
            </span>

            {/* Menú Contextual ⋮ */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800/70 transition cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className={`absolute right-0 top-9 w-44 rounded-2xl p-1.5 border shadow-2xl z-50 text-xs font-mono backdrop-blur-xl ${
                  isLightMode ? 'bg-white/95 border-neutral-200 text-neutral-800' : 'bg-[#18181b]/95 border-white/10 text-neutral-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onOpen?.(collection); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-amber-500/10 hover:text-amber-500 text-left transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir colección
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onEdit?.(collection); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar detalles
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onToggleFavorite?.(collection); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left transition cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" /> {is_favorite ? 'Quitar favorita' : 'Marcar favorita'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-800 text-left transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Compartir
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onDelete?.(collection); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-400 text-left transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar carpeta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. CONTENIDO PRINCIPAL: MINIATURAS (PRIORIZANDO ART_CROP) */}
        <div className="py-2">
          {card_count > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 h-24 sm:h-28 overflow-hidden rounded-2xl bg-black/30 p-2 border border-white/5">
              {cardPreviews.map((card, i) => {
                const img = typeof card === 'string' 
                  ? card 
                  : (card?.image_uris?.art_crop || card?.card_faces?.[0]?.image_uris?.art_crop || card?.image_uris?.normal || card?.image_url);
                return (
                  <div 
                    key={i} 
                    className="relative w-full h-full rounded-xl overflow-hidden bg-neutral-900 border border-white/10 group/thumb shadow-sm"
                  >
                    {img ? (
                      <img 
                        src={img} 
                        alt="Carta preview" 
                        className="w-full h-full object-cover object-center group-hover/thumb:scale-110 transition duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-900">
                        <Sparkles className="w-4 h-4 opacity-30" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 sm:h-28 rounded-2xl border border-dashed border-neutral-800 bg-black/20 p-3 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-mono text-neutral-400 mb-2">
                Esta colección no tiene cartas todavía.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSearchCards?.(collection)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 text-[10px] font-mono font-bold transition cursor-pointer"
                >
                  <Search className="w-3 h-3" />
                  <span>Buscar cartas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onImportList?.(collection)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-mono font-bold transition cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>Importar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. FOOTER: Cantidad, Valor y Fecha de Actualización */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="font-bold text-neutral-200">
            🃏 {card_count} cartas
          </span>
          <span className="font-bold text-emerald-400">
            💰 {formattedValue}
          </span>
        </div>
        <span className="text-[10px] text-neutral-500">
          Act: {formattedDate}
        </span>
      </div>
    </div>
  );
}
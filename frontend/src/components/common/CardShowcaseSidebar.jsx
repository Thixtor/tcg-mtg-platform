// ---------------------------------------------------------
// COMPONENTE: PANEL LATERAL DE INSPECCIÓN (BORDERLESS & BADGE TRADE)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { Crown, Compass, Sparkles, DollarSign, Flame, X, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';
import { 
  getMyCollectionsApi, 
  createMyCollectionApi, 
  addCardToCollectionApi 
} from '@/api/collections';

export default function CardShowcaseSidebar({
  displayCard,
  commanders = [],
  onSelectHoveredCard,
  onNavigateToTradeWall,
  readinessPct,
  availableCount,
  inOtherDeckCount,
  missingCount,
  statusFilter,
  setStatusFilter,
  onCardObtained,
  isLightMode
}) {
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);

  const handleMarkAsObtained = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const scryId = 
      displayCard?.scryfall_card_id || 
      displayCard?.scryfall_id || 
      displayCard?.card_catalog?.id || 
      displayCard?.card_catalog?.scryfall_id || 
      displayCard?.id;

    if (!scryId) {
      alert('Error: No se pudo identificar el código de la carta para registrarla.');
      return;
    }

    if (isAddingToCollection) return;
    setIsAddingToCollection(true);

    try {
      const collections = await getMyCollectionsApi();
      const list = Array.isArray(collections) ? collections : [];

      let targetCollectionId = list[0]?.id;

      if (!targetCollectionId) {
        const newCol = await createMyCollectionApi({
          name: 'Colección Principal',
          description: 'Carpeta principal de inventario físico'
        });
        targetCollectionId = newCol?.id;
      }

      if (!targetCollectionId) {
        throw new Error('No se pudo determinar la carpeta de colección.');
      }

      await addCardToCollectionApi(targetCollectionId, {
        scryfall_card_id: scryId,
        quantity: displayCard.quantity_needed || displayCard.quantity || 1,
        is_foil: false,
        is_for_trade: false
      });

      onCardObtained?.();
    } catch (err) {
      console.error('[CardShowcaseSidebar] Error al registrar carta en colección:', err);
      alert(err.response?.data?.detail || err.message || 'Error al guardar en la colección.');
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const handleSearchTrade = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (onNavigateToTradeWall) {
      onNavigateToTradeWall(displayCard?.name);
    }
  };

  const isMissing = displayCard?.status === 'FALTANTE';
  const tradeCount = Number(displayCard?.available_in_trade_count || 0);

  return (
    <aside className="w-full space-y-3">
      
      {/* 1. TARJETA DE INSPECCIÓN */}
      <div className={`rounded-2xl p-4 shadow-sm flex flex-col items-center text-center space-y-3 transition ${
        isLightMode
          ? 'bg-[#EFE9DC] text-[#2C2825]'
          : 'bg-neutral-900/60 text-neutral-100'
      }`}>
        
        <div className="w-full flex items-center justify-center gap-2">
          {commanders.length > 1 ? (
            <div className="flex gap-2 justify-center">
              {commanders.map((cmd) => (
                <div
                  key={cmd.deck_card_id}
                  onClick={() => onSelectHoveredCard?.(cmd)}
                  className={`relative w-28 aspect-[2.5/3.5] rounded-xl overflow-hidden cursor-pointer shadow transition ${
                    displayCard?.deck_card_id === cmd.deck_card_id
                      ? 'ring-2 ring-amber-500'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <img src={cmd.image_url} alt={cmd.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 px-1 rounded bg-amber-500 text-neutral-950 font-bold text-[8px] flex items-center gap-0.5">
                    <Crown className="w-2 h-2" /> Partner
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`relative w-full max-w-[230px] aspect-[2.5/3.5] rounded-xl overflow-hidden shadow-md ${
              isLightMode ? 'bg-[#E2DBD0]' : 'bg-neutral-900'
            }`}>
              {displayCard?.image_url ? (
                <img
                  src={displayCard.image_url}
                  alt={displayCard.name}
                  className="w-full h-full object-cover transition-opacity duration-150"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-xs font-mono opacity-50">
                  <Sparkles className="w-6 h-6 text-amber-500 mb-2" />
                  <span>Pasa el cursor sobre una carta</span>
                </div>
              )}
              {displayCard?.category === 'commander' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 font-bold text-[9px] flex items-center gap-1 shadow">
                  <Crown className="w-2.5 h-2.5" /> Comandante
                </div>
              )}
              {displayCard?.category === 'companion' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-sky-500 text-neutral-950 font-bold text-[9px] flex items-center gap-1 shadow">
                  <Compass className="w-2.5 h-2.5" /> Companion
                </div>
              )}
            </div>
          )}
        </div>

        {displayCard && (
          <div className="w-full text-left space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold truncate ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
                {displayCard.name}
              </h3>
              <span className={`text-[10px] font-mono ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                {(displayCard.set_code || '---').toUpperCase()}
              </span>
            </div>
            <p className={`text-xs font-mono truncate ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              {displayCard.type_line || displayCard.category?.toUpperCase()}
            </p>
          </div>
        )}

        {/* Precios Estimados y Estado */}
        <div className="w-full grid grid-cols-2 gap-2 pt-2 font-mono text-left">
          <div className={`rounded-lg p-2 ${
            isLightMode ? 'bg-[#FAF7F2]' : 'bg-neutral-950/70'
          }`}>
            <span className={`text-[9px] flex items-center gap-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              <DollarSign className="w-2.5 h-2.5 text-amber-500" /> Precio Tienda
            </span>
            <span className={`text-xs font-bold ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
              {displayCard?.prices?.usd ? `$${displayCard.prices.usd}` : (displayCard?.price_tcg ? `$${displayCard.price_tcg}` : '$0.49 USD')}
            </span>
          </div>

          <div className={`rounded-lg p-2 ${
            isLightMode ? 'bg-[#FAF7F2]' : 'bg-neutral-950/70'
          }`}>
            <span className={`text-[9px] flex items-center gap-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              <Flame className="w-2.5 h-2.5 text-emerald-600" /> Estado
            </span>
            <span className={`text-xs font-bold ${
              displayCard?.status === 'DISPONIBLE' 
                ? 'text-emerald-500' 
                : displayCard?.status === 'EN_OTRO_MAZO' 
                ? 'text-amber-500' 
                : 'text-rose-500'
            }`}>
              {displayCard?.status || 'FALTANTE'}
            </span>
          </div>
        </div>

        {/* Acciones de la Carta */}
        {isMissing ? (
          <div className="w-full space-y-2 pt-1">
            {/* Botón Principal con Píldora de Disponibilidad en Trade */}
            <button
              type="button"
              onClick={handleSearchTrade}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold font-mono text-xs flex items-center justify-between transition shadow-sm active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Flame className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="truncate">Buscar Trade</span>
              </div>

              {/* Badge de Disponibilidad */}
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition shadow-sm ${
                  tradeCount > 0 
                    ? 'bg-neutral-950 text-emerald-400 ring-1 ring-emerald-500/40' 
                    : 'bg-neutral-950/30 text-neutral-800'
                }`}>
                  {tradeCount > 0 ? `${tradeCount} disp.` : '0 disp.'}
                </span>
                <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              </div>
            </button>

            {/* Botón Secundario: Marcar como Obtenida en Colección */}
            <button
              type="button"
              onClick={handleMarkAsObtained}
              disabled={isAddingToCollection}
              className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-mono text-[11px] font-semibold tracking-wide transition border shadow-sm cursor-pointer disabled:opacity-50 active:scale-[0.98] ${
                isLightMode
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50'
              }`}
            >
              {isAddingToCollection ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              <span>{isAddingToCollection ? 'Registrando en binder...' : 'Marcar como Obtenida (+Colección)'}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNavigateToTradeWall}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Muro de Trade</span>
          </button>
        )}
      </div>

      {/* 2. AUDITORÍA FÍSICA CLICABLE */}
      <div className={`rounded-xl p-3 space-y-2 text-xs font-mono transition ${
        isLightMode 
          ? 'bg-[#EFE9DC] text-[#2C2825]' 
          : 'bg-neutral-900/60 text-neutral-200'
      }`}>
        <div className="flex justify-between items-center">
          <span className={isLightMode ? 'text-neutral-600' : 'text-neutral-400'}>Auditoría Física:</span>
          <span className="text-emerald-500 font-bold">{readinessPct}%</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
          <button
            onClick={() => setStatusFilter?.(statusFilter === 'DISPONIBLE' ? null : 'DISPONIBLE')}
            className={`p-1.5 rounded transition cursor-pointer ${
              statusFilter === 'DISPONIBLE'
                ? (isLightMode ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-500')
                : (isLightMode ? 'bg-[#FAF7F2] text-neutral-700' : 'bg-neutral-950/70 text-neutral-300')
            }`}
          >
            <span className="text-[9px] block text-neutral-500">Disp.</span>
            <span className="text-emerald-500 font-bold">{availableCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter?.(statusFilter === 'EN_OTRO_MAZO' ? null : 'EN_OTRO_MAZO')}
            className={`p-1.5 rounded transition cursor-pointer ${
              statusFilter === 'EN_OTRO_MAZO'
                ? (isLightMode ? 'bg-amber-200 text-amber-900 font-bold' : 'bg-amber-950 text-amber-300 ring-1 ring-amber-500')
                : (isLightMode ? 'bg-[#FAF7F2] text-neutral-700' : 'bg-neutral-950/70 text-neutral-300')
            }`}
          >
            <span className="text-[9px] block text-neutral-500">Otros</span>
            <span className="text-amber-500 font-bold">{inOtherDeckCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter?.(statusFilter === 'FALTANTE' ? null : 'FALTANTE')}
            className={`p-1.5 rounded transition cursor-pointer ${
              statusFilter === 'FALTANTE'
                ? (isLightMode ? 'bg-rose-200 text-rose-900 font-bold' : 'bg-rose-950 text-rose-300 ring-1 ring-rose-500')
                : (isLightMode ? 'bg-[#FAF7F2] text-neutral-700' : 'bg-neutral-950/70 text-neutral-300')
            }`}
          >
            <span className="text-[9px] block text-neutral-500">Falta</span>
            <span className="text-rose-500 font-bold">{missingCount}</span>
          </button>
        </div>

        {statusFilter && (
          <button
            onClick={() => setStatusFilter?.(null)}
            className="w-full pt-1 text-[10px] text-amber-500 hover:underline flex items-center justify-center gap-1 cursor-pointer"
          >
            <X className="w-2.5 h-2.5" /> Limpiar filtro ({statusFilter})
          </button>
        )}
      </div>

    </aside>
  );
}
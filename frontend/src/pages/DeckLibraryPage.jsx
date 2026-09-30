// ---------------------------------------------------------
// PÁGINA: BIBLIOTECA DE MAZOS (CON AUDITORÍA Y PRIVACIDAD)
// ---------------------------------------------------------
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Shield, 
  Globe, 
  Lock 
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { getDeckCardsWithStatusApi, updateDeckApi } from '@/api/decks.api';

function extractArtCrop(card) {
  if (!card) return '';
  if (card.image_uris?.art_crop) return card.image_uris.art_crop;
  if (card.card_faces?.[0]?.image_uris?.art_crop) return card.card_faces[0].image_uris.art_crop;
  if (card.image_url) {
    return card.image_url
      .replace('/normal/', '/art_crop/')
      .replace('/large/', '/art_crop/')
      .replace('/small/', '/art_crop/');
  }
  return '';
}

export default function DeckLibraryPage({ 
  decks = [], 
  onSelectDeck, 
  onOpenCreateDeckModal,
  isLoading 
}) {
  const { isLightMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado local para mutaciones reactivas de visibilidad
  const [localDecks, setLocalDecks] = useState(decks);

  useEffect(() => {
    setLocalDecks(decks);
  }, [decks]);
  
  // Cache por mazo: { artCrop, commanderName, available, inOther, missing, total }
  const [deckMetaMap, setDeckMetaMap] = useState({});

  useEffect(() => {
    if (!localDecks || localDecks.length === 0) return;

    let isMounted = true;

    localDecks.forEach((deck) => {
      if (deckMetaMap[deck.id]) return;

      getDeckCardsWithStatusApi(deck.id)
        .then((cards) => {
          if (!isMounted || !Array.isArray(cards)) return;

          const commander = cards.find(
            (c) => c.category === 'commander' || c.category === 'companion'
          );
          const displayCard = commander || cards[0];
          const artCrop = extractArtCrop(displayCard);

          // Cálculo de auditoría física
          let available = 0;
          let inOther = 0;
          let missing = 0;
          let total = 0;

          cards.forEach((c) => {
            const qty = c.quantity_needed || 1;
            total += qty;
            if (c.status === 'DISPONIBLE') available += qty;
            else if (c.status === 'EN_OTRO_MAZO') inOther += qty;
            else missing += qty;
          });

          setDeckMetaMap((prev) => ({
            ...prev,
            [deck.id]: {
              artCrop: artCrop || '',
              commanderName: displayCard?.name || '',
              available,
              inOther,
              missing,
              total: total || deck.total_cards || 100
            }
          }));
        })
        .catch((err) => {
          console.warn(`[Biblioteca] Error cargando auditoría de mazo ${deck.id}:`, err);
        });
    });

    return () => {
      isMounted = false;
    };
  }, [localDecks, deckMetaMap]);

  // Alternar privacidad rápida en el mazo
  const handleTogglePrivacy = async (e, deck) => {
    e.stopPropagation();
    const nextPrivacy = deck.is_public === false;
    
    // Actualización optimista local
    setLocalDecks((prev) =>
      prev.map((d) => (d.id === deck.id ? { ...d, is_public: nextPrivacy } : d))
    );

    try {
      await updateDeckApi(deck.id, { is_public: nextPrivacy });
    } catch (err) {
      console.error('[Biblioteca] Error actualizando privacidad del mazo:', err);
      // Revertir en caso de fallo
      setLocalDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, is_public: !nextPrivacy } : d))
      );
    }
  };

  const filteredDecks = useMemo(() => {
    return localDecks.filter((d) => {
      const meta = deckMetaMap[d.id];
      const cmdName = meta?.commanderName || d.commander_name || '';
      return (
        (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmdName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [localDecks, searchTerm, deckMetaMap]);

  return (
    <div className={`min-h-[calc(100vh-4rem)] px-6 py-6 transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      <div className="max-w-[1920px] mx-auto space-y-6">
        
        {/* Cabecera Principal */}
        <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${
          isLightMode ? 'border-[#E8E2D5]' : 'border-neutral-900'
        }`}>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-500" />
              <span>Mi Biblioteca de Mazos</span>
            </h1>
            <p className="text-xs font-mono text-neutral-500">
              {localDecks.length} de 10 mazos registrados
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por mazo o comandante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none transition w-48 sm:w-64 ${
                  isLightMode 
                    ? 'bg-[#EAE4D7] text-neutral-900 placeholder:text-neutral-500 focus:ring-1 focus:ring-amber-500' 
                    : 'bg-neutral-900 text-white placeholder:text-neutral-500 focus:ring-1 focus:ring-amber-500'
                }`}
              />
            </div>

            <button
              onClick={onOpenCreateDeckModal}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Mazo</span>
            </button>
          </div>
        </div>

        {/* Galería de Mazos */}
        {isLoading ? (
          <div className="py-24 text-center font-mono text-xs text-neutral-500">
            Cargando tu biblioteca de mazos...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            
            {/* Tarjeta Crear Nuevo Mazo */}
            <div
              onClick={onOpenCreateDeckModal}
              className={`h-72 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition p-6 text-center group ${
                isLightMode 
                  ? 'border-[#DDD5C5] hover:border-amber-500 bg-[#EAE4D7]/40 hover:bg-[#EAE4D7]' 
                  : 'border-neutral-800 hover:border-amber-500/80 bg-neutral-900/30 hover:bg-neutral-900/60'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition">
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-bold">Crear Nuevo Mazo</p>
                <p className="text-[11px] font-mono text-neutral-500">Commander, Modern, Estándar</p>
              </div>
            </div>

            {/* Tarjetas de Mazos con Imagen y Métricas Físicas */}
            {filteredDecks.map((deck) => {
              const meta = deckMetaMap[deck.id] || {};
              const artCrop = meta.artCrop || '';
              const commanderTitle = meta.commanderName || deck.commander_name;
              const formatTag = (deck.format || 'Commander').slice(0, 3).toUpperCase();
              const isDeckPublic = deck.is_public !== false; // Público por defecto

              const total = meta.total || deck.total_cards || 100;
              const available = meta.available ?? 0;
              const inOther = meta.inOther ?? 0;
              const missing = meta.missing ?? total;

              const availPct = Math.round((available / total) * 100);
              const otherPct = Math.round((inOther / total) * 100);
              const missingPct = Math.max(0, 100 - availPct - otherPct);

              return (
                <div
                  key={deck.id}
                  onClick={() => onSelectDeck(deck.id)}
                  className={`h-72 rounded-2xl relative overflow-hidden cursor-pointer flex flex-col justify-between p-4 transition-all duration-200 hover:scale-[1.02] shadow-md group select-none ${
                    isLightMode ? 'bg-[#EAE4D7]' : 'bg-[#121214]'
                  }`}
                >
                  {/* Arte Panorámico de fondo */}
                  {artCrop ? (
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-all duration-300 group-hover:scale-105 filter brightness-90 group-hover:brightness-100"
                      style={{ 
                        backgroundImage: `url(${artCrop})`,
                        backgroundPosition: 'center 20%'
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-neutral-900 to-neutral-950" />
                  )}

                  {/* Degradado continuo */}
                  <div className={`absolute inset-0 pointer-events-none transition-opacity ${
                    isLightMode 
                      ? 'bg-gradient-to-t from-[#EAE4D7] via-[#EAE4D7]/85 to-black/25' 
                      : 'bg-gradient-to-t from-[#0B0B0B] via-[#0B0B0B]/85 to-black/30'
                  }`} />

                  {/* Cabecera de la Tarjeta con Insignia de Privacidad */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[9px] tracking-wider uppercase shadow-xs">
                        {formatTag}
                      </span>
                      
                      {/* Botón interactivo de privacidad */}
                      <button
                        type="button"
                        onClick={(e) => handleTogglePrivacy(e, deck)}
                        title={isDeckPublic ? 'Mazo público (haz clic para hacerlo privado)' : 'Mazo privado (haz clic para hacerlo público)'}
                        className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-bold flex items-center gap-1 transition backdrop-blur-md ${
                          isDeckPublic
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-neutral-800/80 text-neutral-300 border border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        {isDeckPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                        <span>{isDeckPublic ? 'Público' : 'Privado'}</span>
                      </button>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full backdrop-blur-md font-semibold ${
                      isLightMode 
                        ? 'bg-[#FAF7F2]/90 text-neutral-800' 
                        : 'bg-black/60 text-neutral-300'
                    }`}>
                      {total} cartas
                    </span>
                  </div>

                  {/* Contenedor Inferior: Títulos + Cápsula de Auditoría */}
                  <div className="relative z-10 space-y-2.5">
                    
                    {/* Título y Comandante */}
                    <div>
                      <h3 className={`text-base font-black uppercase tracking-tight truncate group-hover:text-amber-500 transition leading-tight ${
                        isLightMode ? 'text-[#1F1C19]' : 'text-white drop-shadow-sm'
                      }`}>
                        {deck.name}
                      </h3>
                      <p className={`text-[11px] font-mono truncate mt-0.5 ${
                        isLightMode ? 'text-neutral-700 font-medium' : 'text-neutral-400'
                      }`}>
                        {commanderTitle ? `Cmd: ${commanderTitle}` : (deck.description || 'Mazo sin comandante')}
                      </p>
                    </div>

                    {/* Cápsula de Auditoría Física: Disponibles / Otros Mazos / Faltantes */}
                    <div className={`rounded-xl p-2 font-mono text-[10px] backdrop-blur-md flex items-center justify-between gap-1 border ${
                      isLightMode 
                        ? 'bg-[#FAF7F2]/85 border-[#E2DBD0] text-neutral-800' 
                        : 'bg-black/55 border-neutral-800/80 text-neutral-200'
                    }`}>
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[9px] text-emerald-500 font-bold">Listas</span>
                        <span className="font-extrabold text-xs text-emerald-400">{available}</span>
                      </div>

                      <div className="w-px h-5 bg-neutral-700/40" />

                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[9px] text-amber-500 font-bold">En Otro</span>
                        <span className="font-extrabold text-xs text-amber-400">{inOther}</span>
                      </div>

                      <div className="w-px h-5 bg-neutral-700/40" />

                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[9px] text-rose-500 font-bold">Faltan</span>
                        <span className="font-extrabold text-xs text-rose-400">{missing}</span>
                      </div>
                    </div>

                    {/* Barra de Progreso Tricolor */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-neutral-800/60 flex">
                      <div 
                        style={{ width: `${availPct}%` }} 
                        className="bg-emerald-500 h-full transition-all duration-300" 
                        title={`Listas: ${available}`}
                      />
                      <div 
                        style={{ width: `${otherPct}%` }} 
                        className="bg-amber-500 h-full transition-all duration-300" 
                        title={`En otros mazos: ${inOther}`}
                      />
                      <div 
                        style={{ width: `${missingPct}%` }} 
                        className="bg-rose-500/80 h-full transition-all duration-300" 
                        title={`Faltantes: ${missing}`}
                      />
                    </div>

                  </div>
                </div>
              );
            })}

          </div>
        )}

      </div>
    </div>
  );
}
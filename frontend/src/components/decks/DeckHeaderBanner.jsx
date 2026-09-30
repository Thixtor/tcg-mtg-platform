// ---------------------------------------------------------
// COMPONENTE: BANNER DEL COMANDANTE CON BOTONES, PRIVACIDAD Y CLONACIÓN
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Plus, 
  FileText, 
  Flame, 
  AlertCircle, 
  CheckCircle2,
  Globe,
  Lock,
  Copy,
  Loader2
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { updateDeckApi } from '@/api/decks.api';
import { isAuthenticated } from '@/services/session.service';

function getArtCropUrl(card) {
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

export default function DeckHeaderBanner({
  activeDeck,
  commanderCard,
  commanders = [],
  totalCardsCount,
  isLegal,
  currentUserId,
  onBackToLibrary,
  onOpenPlaytest,
  onOpenImport,
  onNavigateToTradeWall,
  onForkDeck,
  onOpenAuthModal
}) {
  const { isLightMode } = useTheme();
  const hasSession = isAuthenticated();

  // Determinar si el usuario en sesión es el dueño del mazo
  const isOwner = Boolean(
    !activeDeck?.user_id || 
    (currentUserId && String(currentUserId) === String(activeDeck.user_id))
  );

  // Estado local reactivo para la privacidad del mazo activo
  const [isPublic, setIsPublic] = useState(activeDeck?.is_public !== false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [isForking, setIsForking] = useState(false);

  useEffect(() => {
    if (activeDeck) {
      setIsPublic(activeDeck.is_public !== false);
    }
  }, [activeDeck]);

  if (!activeDeck) return null;

  const handleTogglePrivacy = async () => {
    if (!isOwner || isUpdatingPrivacy) return;
    const nextPrivacy = !isPublic;
    setIsPublic(nextPrivacy);
    setIsUpdatingPrivacy(true);

    try {
      await updateDeckApi(activeDeck.id, { is_public: nextPrivacy });
    } catch (err) {
      console.error('[DeckHeaderBanner] Error al actualizar privacidad:', err);
      setIsPublic(!nextPrivacy); // Revertir en caso de error
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleForkClick = async () => {
    if (!hasSession) {
      onOpenAuthModal?.();
      return;
    }

    if (!onForkDeck || isForking) return;

    try {
      setIsForking(true);
      await onForkDeck(activeDeck.id);
    } finally {
      setIsForking(false);
    }
  };

  const artCropUrl = getArtCropUrl(commanderCard || commanders[0]);

  return (
    <header className="w-full relative">
      <div className={`w-full relative min-h-[175px] px-6 py-5 flex flex-col justify-between overflow-hidden ${
        isLightMode ? 'bg-[#EAE4D7]' : 'bg-[#111113]'
      }`}>
        
        {/* Ilustración de fondo panorámica */}
        {artCropUrl && (
          <div
            className={`absolute right-0 top-0 bottom-0 w-3/4 sm:w-2/3 bg-cover bg-center pointer-events-none transition-opacity ${
              isLightMode ? 'opacity-35 filter brightness-105' : 'opacity-40 filter brightness-90 contrast-125'
            }`}
            style={{
              backgroundImage: `url(${artCropUrl})`,
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
            }}
          />
        )}

        {/* Degradados de fusión continua */}
        <div className={`absolute inset-0 pointer-events-none ${
          isLightMode 
            ? 'bg-gradient-to-r from-[#EAE4D7] via-[#EAE4D7]/85 to-transparent' 
            : 'bg-gradient-to-r from-[#111113] via-[#111113]/90 to-transparent'
        }`} />

        <div className={`absolute bottom-0 left-0 right-0 h-10 pointer-events-none ${
          isLightMode 
            ? 'bg-gradient-to-t from-[#FAF7F2] to-transparent' 
            : 'bg-gradient-to-t from-[#0B0B0B] to-transparent'
        }`} />

        {/* FILA SUPERIOR: RETORNO A LA BIBLIOTECA */}
        <div className="relative z-10">
          <button
            onClick={onBackToLibrary}
            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold transition rounded-lg px-2.5 py-1 ${
              isLightMode 
                ? 'bg-[#DDD5C5]/70 hover:bg-[#DDD5C5] text-neutral-800' 
                : 'bg-neutral-900/60 hover:bg-neutral-900 text-neutral-300 hover:text-amber-400'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isOwner ? 'Mis Mazos' : 'Volver'}</span>
          </button>
        </div>

        {/* FILA INFERIOR: TÍTULO DEL MAZO (IZQ) Y ACCIONES VISIBLES (DER) */}
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-6 pt-3">
          
          {/* LADO IZQUIERDO: METADATOS Y TÍTULO */}
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold tracking-wider">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 uppercase font-black">
                {activeDeck.format || 'COMMANDER'}
              </span>

              {/* Selector interactivo de privacidad (Solo para el propietario) */}
              {isOwner ? (
                <button
                  type="button"
                  onClick={handleTogglePrivacy}
                  disabled={isUpdatingPrivacy}
                  title={isPublic ? 'Mazo público. Haz clic para cambiarlo a privado.' : 'Mazo privado. Haz clic para compartirlo con la comunidad.'}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                    isPublic 
                      ? (isLightMode ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-emerald-950/70 text-emerald-400 hover:bg-emerald-900/70')
                      : (isLightMode ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700')
                  }`}
                >
                  {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  <span>{isPublic ? 'Público' : 'Privado'}</span>
                </button>
              ) : (
                <span className={`px-2 py-0.5 rounded flex items-center gap-1 font-mono text-[10px] ${
                  isPublic 
                    ? (isLightMode ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/70 text-emerald-400')
                    : (isLightMode ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-800 text-neutral-300')
                }`}>
                  <Globe className="w-2.5 h-2.5" />
                  <span>Comunitario</span>
                </span>
              )}

              <span className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                isLegal 
                  ? (isLightMode ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/70 text-emerald-400')
                  : (isLightMode ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/70 text-amber-300')
              }`}>
                {isLegal ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                {isLegal ? 'Legal' : 'Incompleto'}
              </span>

              <span className={`font-normal pl-0.5 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {totalCardsCount} / 100 cartas
              </span>
            </div>

            <h1 className={`text-3xl sm:text-4xl font-black uppercase tracking-tight ${
              isLightMode ? 'text-[#1F1C19]' : 'text-white'
            }`}>
              {activeDeck.name}
            </h1>

            <p className={`text-xs font-mono ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
              {commanderCard ? (
                <span>
                  Comandante: <strong className="text-amber-500 font-semibold">{commanderCard.name}</strong> · {commanderCard.type_line || 'Legendary Creature'}
                </span>
              ) : (
                <span>{activeDeck.description || 'Mazo sin comandante asignado'}</span>
              )}
            </p>
          </div>

          {/* EXTREMO DERECHO: BOTONES DE ACCIÓN */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            
            {/* Si NO es el dueño, desplegar botón CLONAR MAZO */}
            {!isOwner && (
              <button
                onClick={handleForkClick}
                disabled={isForking}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isForking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>{isForking ? 'Clonando...' : 'Clonar Mazo'}</span>
              </button>
            )}

            {/* 1. Playtest (disponible para todos) */}
            <button
              onClick={onOpenPlaytest}
              className={`px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm active:scale-95 ${
                isOwner 
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950' 
                  : (isLightMode ? 'bg-[#DDD5C5]/70 hover:bg-[#DDD5C5] text-neutral-800' : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200')
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Playtest</span>
            </button>

            {/* 2. Importar (solo para el propietario) */}
            {isOwner && (
              <button
                onClick={onOpenImport}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm ${
                  isLightMode
                    ? 'bg-[#DDD5C5]/70 hover:bg-[#DDD5C5] text-neutral-800'
                    : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Importar</span>
              </button>
            )}

            {/* 3. Trade Wall */}
            <button
              onClick={onNavigateToTradeWall}
              className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm ${
                isLightMode
                  ? 'bg-[#DDD5C5]/70 hover:bg-[#DDD5C5] text-emerald-800'
                  : 'bg-neutral-900/80 hover:bg-neutral-800 text-emerald-400'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-500" />
              <span>Trade</span>
            </button>

          </div>

        </div>

      </div>
    </header>
  );
}
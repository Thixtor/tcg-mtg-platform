// ---------------------------------------------------------
// PÁGINA: PERFIL PÚBLICO DE USUARIO, VITRINA Y RED SOCIAL
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Layers, 
  Shield, 
  ArrowLeft, 
  Search, 
  Loader2, 
  Folder,
  ExternalLink,
  Lock
} from 'lucide-react';

import { getUserProfileApi, followUserApi } from '@/api/users.api';
import { getUserCollectionsApi, getCollectionCardsApi } from '@/api/collections';
import { getUserDecksApi } from '@/api/decks.api';
import { isAuthenticated } from '@/services/session.service';
import { useCardModal } from '@/context/CardModalContext';
import { useTheme } from '@/context/ThemeContext';
import CardGridItem from '@/components/common/CardGridItem';
import { parseApiError } from '@/utils/apiErrors';

export default function PublicProfilePage({ 
  userId, 
  currentUserId,
  onBack, 
  onOpenAuthModal, 
  onSelectDeck 
}) {
  const { isLightMode } = useTheme();
  const { openCard } = useCardModal();
  const hasSession = isAuthenticated();

  const [profile, setProfile] = useState(null);
  const [binders, setBinders] = useState([]);
  const [publicDecks, setPublicDecks] = useState([]);
  
  const [selectedBinder, setSelectedBinder] = useState(null);
  const [binderCards, setBinderCards] = useState([]);
  const [binderSearchTerm, setBinderSearchTerm] = useState('');

  const [activeTab, setActiveTab] = useState('binders'); // 'binders' | 'decks'
  const [isLoading, setIsLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isOwnProfile = String(currentUserId) === String(userId);

  // 1. Cargar perfil, carpetas comerciales y mazos públicos
  const fetchPublicData = useCallback(async (signal) => {
    if (!userId) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const [profileRes, bindersRes, decksRes] = await Promise.allSettled([
        getUserProfileApi(userId, { signal }),
        getUserCollectionsApi(userId, { signal }),
        getUserDecksApi(userId, { signal })
      ]);

      if (profileRes.status === 'fulfilled') {
        const p = profileRes.value;
        setProfile(p);
        setIsFollowing(Boolean(p?.is_following));
        setFollowersCount(p?.followers_count ?? 0);
      } else {
        throw profileRes.reason;
      }

      if (bindersRes.status === 'fulfilled') {
        // Filtrar solo las carpetas públicas para intercambio
        const publicBinders = (Array.isArray(bindersRes.value) ? bindersRes.value : [])
          .filter((b) => b.is_public_trade !== false);
        setBinders(publicBinders);
        if (publicBinders.length > 0) {
          setSelectedBinder(publicBinders[0]);
        }
      }

      if (decksRes.status === 'fulfilled') {
        // Filtrar solo las barajas con visibilidad pública
        const decks = (Array.isArray(decksRes.value) ? decksRes.value : [])
          .filter((d) => d.is_public !== false);
        setPublicDecks(decks);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.warn('[PublicProfile] Error al cargar información pública:', err);
        setErrorMsg(parseApiError(err, 'No fue posible cargar el perfil del usuario.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchPublicData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchPublicData]);

  // 2. Cargar cartas de la carpeta comercial seleccionada
  useEffect(() => {
    if (!selectedBinder?.id) {
      setBinderCards([]);
      return;
    }

    const ctrl = new AbortController();
    setLoadingCards(true);

    getCollectionCardsApi(selectedBinder.id, { signal: ctrl.signal })
      .then((cards) => {
        setBinderCards(Array.isArray(cards) ? cards : []);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn(`[PublicProfile] Error al cargar cartas del binder ${selectedBinder.id}:`, err);
          setBinderCards([]);
        }
      })
      .finally(() => setLoadingCards(false));

    return () => ctrl.abort();
  }, [selectedBinder]);

  // 3. Acción de Seguimiento (Follow / Unfollow)
  const handleToggleFollow = async () => {
    if (!hasSession) {
      onOpenAuthModal?.();
      return;
    }

    if (isFollowSubmitting || isOwnProfile) return;

    const previousState = isFollowing;
    const previousCount = followersCount;

    // Mutación optimista
    setIsFollowing(!previousState);
    setFollowersCount((cnt) => (!previousState ? cnt + 1 : Math.max(0, cnt - 1)));
    setIsFollowSubmitting(true);

    try {
      const response = await followUserApi(userId);
      if (response && response.is_following !== undefined) {
        setIsFollowing(response.is_following);
        if (response.followers_count !== undefined) {
          setFollowersCount(response.followers_count);
        }
      }
    } catch (err) {
      console.error('[PublicProfile] Error al alternar follow:', err);
      // Revertir ante fallo
      setIsFollowing(previousState);
      setFollowersCount(previousCount);
    } finally {
      setIsFollowSubmitting(false);
    }
  };

  const filteredCards = useMemo(() => {
    return binderCards.filter((c) => {
      const name = c.card_catalog?.name || c.name || '';
      return name.toLowerCase().includes(binderSearchTerm.toLowerCase());
    });
  }, [binderCards, binderSearchTerm]);

  if (isLoading) {
    return (
      <div className={`min-h-[calc(100vh-4rem)] flex items-center justify-center font-mono text-xs gap-2 ${
        isLightMode ? 'text-neutral-600 bg-[#FAF7F2]' : 'text-neutral-400 bg-[#0B0B0B]'
      }`}>
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        <span>Consultando vitrina comunitaria del jugador...</span>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className={`min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 space-y-4 ${
        isLightMode ? 'bg-[#FAF7F2] text-neutral-800' : 'bg-[#0B0B0B] text-neutral-200'
      }`}>
        <p className="text-xs font-mono text-rose-400">{errorMsg || 'Usuario no encontrado.'}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold"
          >
            Regresar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-[calc(100vh-4rem)] px-6 py-6 transition-colors duration-200 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Botón de retorno opcional */}
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-amber-500 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la exploración</span>
          </button>
        )}

        {/* 1. CABECERA DE PERFIL PÚBLICO */}
        <div className={`p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl ${
          isLightMode ? 'bg-white border-[#E8E2D5]' : 'bg-neutral-900/70 border-neutral-800'
        }`}>
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-neutral-950 flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-amber-500/10">
              {profile.username?.slice(0, 2).toUpperCase() || 'U'}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  @{profile.username}
                </h1>
                
                {profile.is_phone_verified ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verificado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-neutral-500 border border-neutral-800 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> No Verificado
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-400 max-w-lg leading-relaxed">
                {profile.bio || 'Coleccionista activo de Magic: The Gathering en la plataforma.'}
              </p>

              <div className="flex items-center gap-4 text-xs font-mono text-neutral-500 pt-1">
                <span><strong className="text-white">{followersCount}</strong> seguidores</span>
                <span>·</span>
                <span><strong className="text-white">{profile.following_count ?? 0}</strong> seguidos</span>
                <span>·</span>
                <span>{profile.city || 'Comunidad Local'}</span>
              </div>
            </div>
          </div>

          {/* Botón de Interacción Social */}
          {!isOwnProfile && (
            <div className="w-full md:w-auto flex items-center gap-3">
              <button
                onClick={handleToggleFollow}
                disabled={isFollowSubmitting}
                className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-95 ${
                  isFollowing
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Siguiendo</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Seguir Jugador</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 2. PESTAÑAS DE CONTENIDO ABIERTO */}
        <nav className="flex items-center gap-6 border-b border-neutral-800 text-xs sm:text-sm font-medium">
          <button
            onClick={() => setActiveTab('binders')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'binders'
                ? 'border-amber-500 text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Binders Comerciales ({binders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('decks')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === 'decks'
                ? 'border-amber-500 text-white font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Mazos Públicos ({publicDecks.length})</span>
          </button>
        </nav>

        {/* 3. VISTA: BINDERS COMERCIALES */}
        {activeTab === 'binders' && (
          <div className="space-y-6">
            {binders.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 space-y-2">
                <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-bold text-neutral-300">Sin carpetas comerciales públicas</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Este jugador aún no ha marcado carpetas para intercambio comercial visible.
                </p>
              </div>
            ) : (
              <>
                {/* Selector de Carpetas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {binders.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBinder(b)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        selectedBinder?.id === b.id
                          ? 'border-amber-500 bg-neutral-900 shadow-md'
                          : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-white truncate">{b.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {b.card_count ?? 0} cartas
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filtro y Listado de Cartas del Binder */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 bg-neutral-900/40 border border-neutral-800 p-3 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
                      {selectedBinder?.name} · Cartas en Exhibición
                    </span>

                    <div className="relative w-48 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar en esta carpeta..."
                        value={binderSearchTerm}
                        onChange={(e) => setBinderSearchTerm(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {loadingCards ? (
                    <div className="py-20 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Cargando cartas del binder...</span>
                    </div>
                  ) : filteredCards.length === 0 ? (
                    <div className="text-center py-16 text-xs text-neutral-500 bg-neutral-900/20 border border-dashed border-neutral-800 rounded-xl">
                      No se encontraron cartas en esta carpeta comercial.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {filteredCards.map((cardItem) => (
                        <CardGridItem
                          key={cardItem.id}
                          card={cardItem}
                          cardSize="md"
                          isLightMode={isLightMode}
                          onClick={() => openCard(cardItem.card_catalog || cardItem)}
                          badgeTopLeft={cardItem.condition || 'NM'}
                          showTradeBadge={cardItem.is_for_trade}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. VISTA: MAZOS PÚBLICOS */}
        {activeTab === 'decks' && (
          <div className="space-y-4">
            {publicDecks.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/20 space-y-2">
                <Shield className="w-8 h-8 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-bold text-neutral-300">Sin mazos comunitarios</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Este jugador no cuenta con barajas marcadas como públicas actualmente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {publicDecks.map((deck) => (
                  <div
                    key={deck.id}
                    onClick={() => onSelectDeck?.(deck.id)}
                    className="p-5 bg-neutral-900/70 border border-neutral-800 hover:border-amber-500/60 rounded-2xl cursor-pointer transition flex flex-col justify-between space-y-4 group shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-black text-[9px] uppercase tracking-wider">
                          {deck.format || 'COMMANDER'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {deck.total_cards || 100} cartas
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white group-hover:text-amber-400 transition truncate">
                        {deck.name}
                      </h3>

                      <p className="text-xs text-neutral-400 line-clamp-2">
                        {deck.description || 'Sin notas descriptivas en la baraja.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-amber-500">
                      <span>Explorar lista de cartas</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
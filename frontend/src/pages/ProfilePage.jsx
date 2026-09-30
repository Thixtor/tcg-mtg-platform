// ---------------------------------------------------------
// PÁGINA: PERFIL DE USUARIO, DASHBOARD COMERCIAL Y WISHLIST
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import SecuritySidebar from '@/components/profile/SecuritySidebar';
import BinderPreviewGrid from '@/components/profile/BinderPreviewGrid';
import EditProfileModal from '@/components/profile/EditProfileModal';
import CardGridItem from '@/components/common/CardGridItem';
import { getMyProfileApi } from '@/api/users.api';
import { getCollectionCardsApi } from '@/api/collections';
import { getMyDecksApi } from '@/api/decks.api';
import { getMyWishlistApi, removeCardFromWishlistApi } from '@/api/wishlist';
import { isAuthenticated } from '@/services/session.service';
import { useCardModal } from '@/context/CardModalContext';
import { parseApiError } from '@/utils/apiErrors';
import { 
  Layers, 
  Sparkles, 
  Repeat, 
  Lock, 
  Search, 
  FolderPlus,
  Loader2,
  Shield,
  ExternalLink,
  Trash2,
  Plus
} from 'lucide-react';

/**
 * Vista del perfil de usuario con métricas consolidadas de binders, inventario, mazos y wishlist.
 */
export default function ProfilePage({ 
  user, 
  onOpenBinderModal, 
  onOpenTradeModal, 
  onOpenAuthModal,
  onEditProfileModal,
  onNavigateToCatalog
}) {
  const [activeTab, setActiveTab] = useState('binders');
  const [selectedBinderId, setSelectedBinderId] = useState(null);
  const [binderSearchTerm, setBinderSearchTerm] = useState('');
  
  const [profileData, setProfileData] = useState(null);
  const [userDecks, setUserDecks] = useState([]);
  const [binderCards, setBinderCards] = useState([]);

  // Estados reactivos para la Wishlist
  const [wishlistCards, setWishlistCards] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [wishlistSearchTerm, setWishlistSearchTerm] = useState('');
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState(null);

  const { openCard } = useCardModal();
  const hasSession = isAuthenticated();

  // 1. Cargar Perfil y Mazos de forma concurrente
  const fetchDashboardData = useCallback(async (signal) => {
    if (!hasSession && !user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    setError(null);

    try {
      const [profileRes, decksRes] = await Promise.allSettled([
        getMyProfileApi({ signal }),
        getMyDecksApi({ signal })
      ]);

      if (profileRes.status === 'fulfilled') {
        const pData = profileRes.value;
        setProfileData(pData);
        if (pData?.binders && pData.binders.length > 0) {
          setSelectedBinderId(pData.binders[0].id);
        }
      } else {
        throw profileRes.reason;
      }

      if (decksRes.status === 'fulfilled') {
        setUserDecks(Array.isArray(decksRes.value) ? decksRes.value : []);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.warn('[Perfil] Error al cargar datos del dashboard:', err);
        setError('No se pudo cargar el perfil comercial. Por favor verifica tu conexión o sesión.');
      }
    } finally {
      setLoadingProfile(false);
    }
  }, [hasSession, user]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchDashboardData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchDashboardData]);

  // 2. Cargar cartas del binder activo seleccionado
  useEffect(() => {
    if (!selectedBinderId) {
      setBinderCards([]);
      return;
    }

    const ctrl = new AbortController();
    setLoadingCards(true);

    getCollectionCardsApi(selectedBinderId, { signal: ctrl.signal })
      .then((cards) => {
        setBinderCards(Array.isArray(cards) ? cards : []);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.warn(`[Perfil] Error cargando cartas del binder ${selectedBinderId}:`, err);
          setBinderCards([]);
        }
      })
      .finally(() => setLoadingCards(false));

    return () => ctrl.abort();
  }, [selectedBinderId]);

  // 3. Cargar cartas de la Wishlist cuando se activa la pestaña
  const fetchWishlist = useCallback(async () => {
    if (!hasSession) return;
    setLoadingWishlist(true);
    try {
      const items = await getMyWishlistApi();
      setWishlistCards(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn('[Perfil] Error cargando wishlist:', parseApiError(err));
      setWishlistCards([]);
    } finally {
      setLoadingWishlist(false);
    }
  }, [hasSession]);

  useEffect(() => {
    if (activeTab === 'wishlist') {
      fetchWishlist();
    }
  }, [activeTab, fetchWishlist]);

  const handleRemoveFromWishlist = async (wishlistId) => {
    try {
      await removeCardFromWishlistApi(wishlistId);
      setWishlistCards((prev) => prev.filter((item) => item.id !== wishlistId));
      setProfileData((prev) => {
        if (!prev) return prev;
        const currentCount = prev.kpis?.wishlist_wants ?? 1;
        return {
          ...prev,
          kpis: {
            ...prev.kpis,
            wishlist_wants: Math.max(0, currentCount - 1)
          }
        };
      });
    } catch (err) {
      console.error('[Wishlist] Error al eliminar carta:', parseApiError(err));
    }
  };

  const handleProfileUpdated = (updatedUser) => {
    setProfileData((prev) => ({
      ...prev,
      ...updatedUser
    }));
  };

  // Filtrado reactivo de cartas en binder
  const filteredBinderCards = useMemo(() => {
    return binderCards.filter((card) => {
      const cardName = card.card_catalog?.name || card.name || '';
      return cardName.toLowerCase().includes(binderSearchTerm.toLowerCase());
    });
  }, [binderCards, binderSearchTerm]);

  // Filtrado reactivo de cartas en wishlist
  const filteredWishlistCards = useMemo(() => {
    return wishlistCards.filter((item) => {
      const cardName = item.card_catalog?.name || item.name || '';
      return cardName.toLowerCase().includes(wishlistSearchTerm.toLowerCase());
    });
  }, [wishlistCards, wishlistSearchTerm]);

  // Vista no autenticada
  if (!hasSession && !user && !loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Inicia sesión para gestionar tu colección</h2>
        <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
          Accede con tu número celular verificado mediante OTP para revisar tus binders, wishlist y reputación comercial P2P.
        </p>
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition shadow-md"
          >
            Iniciar Sesión / Registrarse
          </button>
        )}
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-28 text-neutral-400 text-xs font-mono gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        <span>Cargando perfil comercial y métricas...</span>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="text-rose-400 text-xs text-center py-20 font-mono">
        {error || 'No hay datos de perfil disponibles en este momento.'}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* 1. CABECERA MODULAR CON POLÍTICA DE PRECIOS */}
      <ProfileHeader 
        user={profileData} 
        onProfileUpdated={handleProfileUpdated} 
      />

      {/* 2. BARRA DE PESTAÑAS */}
      <nav className="flex items-center gap-6 border-b border-neutral-800 text-sm font-medium">
        <button 
          onClick={() => setActiveTab('binders')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'binders' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Binders & Inventario
        </button>

        <button 
          onClick={() => setActiveTab('decks')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'decks' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Shield className="w-4 h-4" /> Mazos Registrados
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-800 text-amber-400 font-mono border border-neutral-700">
            {userDecks.length}/10
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('wishlist')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'wishlist' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Wishlist Personal
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-800 text-rose-400 font-mono border border-neutral-700">
            {profileData.kpis?.wishlist_wants || wishlistCards.length}
          </span>
        </button>

        <button 
          onClick={() => setActiveTab('matches')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'matches' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Repeat className="w-4 h-4" /> Coincidencias P2P
        </button>

        <button 
          onClick={() => setActiveTab('security')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'security' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Lock className="w-4 h-4" /> Seguridad de Cuenta
        </button>
      </nav>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LADO IZQUIERDO: CONTENIDO DINÁMICO (8 COLUMNAS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* PESTAÑA: BINDERS */}
          {activeTab === 'binders' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {profileData.binders?.map((binder) => (
                  <div 
                    key={binder.id}
                    onClick={() => setSelectedBinderId(binder.id)}
                    className={`group relative rounded-xl border overflow-hidden cursor-pointer transition flex flex-col ${
                      selectedBinderId === binder.id 
                        ? 'border-amber-500 bg-neutral-900 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                        : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                    }`}
                  >
                    <div className="h-20 w-full relative bg-neutral-950 border-b border-neutral-800 overflow-hidden">
                      <img 
                        src={binder.art_url || "https://images.ctfassets.net/s5n2t79q9icq/5nE8pQoF2W64qskegW2O4m/d0dbd4b29bb60ad4adca2fa13e8b15d2/MTG_Generic_Crop.jpg"} 
                        alt={`Portada de ${binder.name}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        loading="lazy"
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-950/80 text-neutral-300 border border-neutral-800 backdrop-blur-sm shadow-sm">
                        BINDER
                      </span>
                    </div>

                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-white truncate">{binder.name}</h3>
                        <p className="text-[9px] text-neutral-500 truncate mt-0.5">
                          Ilustración © Wizards of the Coast
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 mt-2">
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1.5 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${binder.is_public_trade ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-neutral-600'}`} />
                          {binder.is_public_trade ? 'Trade Público' : 'Privado'}
                        </span>
                        <span className="text-[10px] text-amber-500 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {binder.card_count || 0} {binder.card_count === 1 ? 'carta' : 'cartas'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {(!profileData.binders || profileData.binders.length === 0) && (
                  <div className="col-span-1 md:col-span-3 text-center text-xs text-neutral-500 py-8 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                    No tienes carpetas comerciales activas. Crea un binder para publicar tus cartas de cambio.
                  </div>
                )}
              </div>

              {/* Filtros del Binder */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/40 border border-neutral-800 p-3 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Cartas en Carpeta Seleccionada
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={binderSearchTerm}
                      onChange={(e) => setBinderSearchTerm(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button 
                    onClick={onOpenBinderModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 transition"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Nueva Carpeta
                  </button>
                </div>
              </div>

              {loadingCards ? (
                <div className="flex items-center justify-center py-16 text-neutral-500 text-xs font-mono gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                  <span>Sincronizando inventario de cartas...</span>
                </div>
              ) : (
                <BinderPreviewGrid cards={filteredBinderCards} />
              )}
            </>
          )}

          {/* PESTAÑA: MAZOS REGISTRADOS */}
          {activeTab === 'decks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-neutral-900/40 border border-neutral-800 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-500" />
                    Mazos Construidos ({userDecks.length}/10)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Barajas asociadas a tu perfil comercial para validación física de inventario.
                  </p>
                </div>
              </div>

              {userDecks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20 text-xs text-neutral-500 space-y-2">
                  <Shield className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p>Aún no has registrado barajas en el Constructor de Mazos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {userDecks.map((deck) => (
                    <div 
                      key={deck.id}
                      className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate">{deck.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-amber-400 border border-neutral-700">
                            {deck.format}
                          </span>
                        </div>
                        {deck.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2">{deck.description}</p>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
                        <span>Creado: {new Date(deck.created_at || Date.now()).toLocaleDateString()}</span>
                        <button 
                          onClick={onOpenTradeModal}
                          className="text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1"
                        >
                          Ver faltantes <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA: WISHLIST PERSONAL (CONECTADA Y REACTIVA) */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/40 border border-neutral-800 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Lista de Deseos Comercial ({wishlistCards.length})
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Cartas que buscas activamente para cruzar automáticamente en el Muro de Trade.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar deseos..."
                      value={wishlistSearchTerm}
                      onChange={(e) => setWishlistSearchTerm(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 w-44"
                    />
                  </div>
                  {onNavigateToCatalog && (
                    <button
                      onClick={onNavigateToCatalog}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Explorar Catálogo
                    </button>
                  )}
                </div>
              </div>

              {loadingWishlist ? (
                <div className="py-20 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Sincronizando tu lista de deseos...</span>
                </div>
              ) : filteredWishlistCards.length === 0 ? (
                <div className="bg-neutral-900/20 border border-dashed border-neutral-800 rounded-2xl p-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-neutral-600 mx-auto" />
                  <h4 className="text-sm font-bold text-neutral-300">
                    {wishlistSearchTerm ? 'No hay cartas que coincidan con tu búsqueda.' : 'Tu Wishlist está vacía'}
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Busca cartas en el Catálogo y haz clic en "Añadir a mi Wishlist" para alimentar el algoritmo de matchmaking P2P.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredWishlistCards.map((item) => (
                    <div 
                      key={item.id}
                      className="group bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3 flex flex-col justify-between transition relative overflow-hidden"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => openCard(item.card_catalog || item)}
                      >
                        <div className="aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-neutral-950 relative mb-2">
                          {item.card_catalog?.image_url || item.image_url ? (
                            <img 
                              src={item.card_catalog?.image_url || item.image_url} 
                              alt={item.card_catalog?.name || item.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">Sin Imagen</div>
                          )}
                          {item.preferred_finish === 'foil' && (
                            <span className="absolute top-1.5 right-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-pink-500 text-black">
                              FOIL
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-white truncate" title={item.card_catalog?.name || item.name}>
                            {item.card_catalog?.name || item.name}
                          </h4>
                          <p className="text-[10px] text-neutral-400 font-mono">
                            {item.card_catalog?.set_code?.toUpperCase() || 'MTG'}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-neutral-800/60 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-emerald-400">
                          {item.card_catalog?.price_usd ? `$${item.card_catalog.price_usd}` : 'Ref. Mercado'}
                        </span>
                        <button
                          onClick={() => handleRemoveFromWishlist(item.id)}
                          className="p-1 text-neutral-500 hover:text-rose-400 rounded transition"
                          title="Eliminar de Wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA: MATCHES P2P */}
          {activeTab === 'matches' && (
            <div className="bg-neutral-900/30 border border-dashed border-neutral-800 rounded-2xl p-12 text-center space-y-3">
              <Repeat className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">Coincidencias de Intercambio Mutuo</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Algoritmo de cruce automático: cartas que tú buscas y que otros usuarios locales tienen disponibles para trade.
              </p>
              <button
                onClick={onOpenTradeModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition"
              >
                Abrir Muro de Intercambio
              </button>
            </div>
          )}

          {/* PESTAÑA: SEGURIDAD */}
          {activeTab === 'security' && (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                Seguridad y Credenciales de la Cuenta
              </h3>
              <div className="space-y-3 text-xs text-neutral-300">
                <p>• Teléfono verificado: <span className="font-mono text-emerald-400">{profileData.phone_number}</span></p>
                <p>• Correo electrónico: <span className="font-mono text-neutral-400">{profileData.email}</span></p>
                <p>• Identificador de Usuario (UUID): <span className="font-mono text-neutral-500">{profileData.id}</span></p>
              </div>
            </div>
          )}

        </div>

        {/* LADO DERECHO: SIDEBAR DE SEGURIDAD Y REPUTACIÓN (4 COLUMNAS) */}
        <div className="lg:col-span-4">
          <SecuritySidebar 
            phone={profileData.phone_number}
            isVerified={profileData.is_phone_verified}
            onOpenTradeMatches={onOpenTradeModal}
            onReverifyPhone={() => {}}
          />
        </div>

      </div>

      {/* FOOTER LEGAL CUMPLIENDO POLÍTICA DE WOTC Y SCRYFALL */}
      <div className="pt-6 border-t border-neutral-900 text-center text-[10px] text-neutral-600 space-y-1">
        <p>Portions of card imagery and literal data are copyright Wizards of the Coast LLC .</p>
        <p>This software is unofficial Fan Content permitted under the Wizards of the Coast Fan Content Policy .</p>
      </div>

    </div>
  );
}
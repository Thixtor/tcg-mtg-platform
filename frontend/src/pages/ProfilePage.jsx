// ============================================================================
// PÁGINA: PERFIL DE USUARIO Y PASAPORTE COMERCIAL P2P
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Vista simplificada: Se eliminan inventarios y mazos (resueltos en sus páginas).
// - Enfocado 100% en identidad, reputación ganada, métricas de trading y cuenta.
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Star, 
  ShieldCheck, 
  MapPin, 
  DollarSign, 
  Sparkles, 
  Repeat, 
  Lock, 
  User, 
  Calendar, 
  CheckCircle2, 
  Settings, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Edit3
} from 'lucide-react';

import { getMyProfileApi } from '@/api/users.api';
import { isAuthenticated } from '@/services/session.service';
import EditProfileModal from '@/components/profile/EditProfileModal';

export default function ProfilePage({ 
  user, 
  onOpenTradeModal, 
  onOpenAuthModal 
}) {
  const [activeTab, setActiveTab] = useState('reputation'); // 'reputation' | 'preferences' | 'security'
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const hasSession = isAuthenticated();

  const fetchProfile = useCallback(async (signal) => {
    if (!hasSession && !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getMyProfileApi({ signal });
      setProfileData(data);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        console.warn('[ProfilePage] Error cargando perfil:', err);
        setError('No se pudo cargar la información del perfil.');
      }
    } finally {
      setLoading(false);
    }
  }, [hasSession, user]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchProfile(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchProfile]);

  const handleProfileUpdated = (updatedUser) => {
    setProfileData((prev) => ({
      ...prev,
      ...updatedUser
    }));
  };

  // Vista cuando no hay sesión
  if (!hasSession && !user && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center space-y-4 font-mono text-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Inicia sesión para ver tu perfil</h2>
        <p className="text-neutral-400 max-w-sm leading-relaxed">
          Accede a tu cuenta para consultar tu reputación comercial, tasa preferida y ajustes de seguridad.
        </p>
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="px-6 py-2.5 bg-[#E88B00] hover:bg-[#FF9D0A] text-black font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-28 text-neutral-400 text-xs font-mono gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#E88B00]" />
        <span>Cargando pasaporte de usuario...</span>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="text-rose-400 text-xs text-center py-20 font-mono">
        {error || 'No se encontraron datos de usuario disponibles.'}
      </div>
    );
  }

  const reputation = profileData.reputation_score ?? 100;
  const completedTrades = profileData.successful_trades_count ?? profileData.kpis?.successful_trades ?? 0;
  const preferredRate = profileData.preferred_usd_rate || 3200;
  const wishlistCount = profileData.kpis?.wishlist_wants ?? 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6 font-mono text-xs text-neutral-100">
      
      {/* 1. TARJETA PRINCIPAL DE IDENTIDAD */}
      <div className="bg-[#121118] border border-[#2A2733] rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#E88B00] text-black font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-[#E88B00]/20 shrink-0">
            {profileData.username ? profileData.username.slice(0, 2).toUpperCase() : 'U'}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                @{profileData.username || 'usuario'}
              </h1>

              {profileData.is_phone_verified ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verificado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Sin verificar
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-neutral-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E88B00]" />
                {profileData.location || profileData.city || 'Medellín / Área Metropolitana'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                Miembro desde {profileData.created_at ? new Date(profileData.created_at).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }) : '2026'}
              </span>
            </div>

            {profileData.bio && (
              <p className="text-neutral-300 text-xs font-sans leading-relaxed pt-1">
                "{profileData.bio}"
              </p>
            )}
          </div>
        </div>

        {/* Botón de editar perfil */}
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="px-4 py-2 bg-[#1A1822] hover:bg-[#24212F] text-white border border-[#2A2733] rounded-xl flex items-center gap-2 cursor-pointer transition text-xs shrink-0 self-start md:self-center"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#E88B00]" />
          <span>Editar Perfil</span>
        </button>
      </div>

      {/* 2. DASHBOARD DE MÉTRICAS CLAVE (KPIs COMERCIALES) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        
        {/* KPI: Reputación */}
        <div className="p-4 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Reputación</span>
          </span>
          <div className="text-lg font-bold text-white flex items-baseline gap-1">
            <span>{reputation}</span>
            <span className="text-[10px] text-neutral-500 font-normal">/ 100</span>
          </div>
          <span className="text-[9px] text-emerald-400 block">Excelente calificación</span>
        </div>

        {/* KPI: Trades Completados */}
        <div className="p-4 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trades Cerrados</span>
          </span>
          <div className="text-lg font-bold text-white">
            {completedTrades}
          </div>
          <span className="text-[9px] text-neutral-500 block">En Black Market</span>
        </div>

        {/* KPI: Tasa de Referencia habitual */}
        <div className="p-4 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-[#E88B00]" />
            <span>Tasa Habitual</span>
          </span>
          <div className="text-lg font-bold text-amber-400">
            ${preferredRate.toLocaleString('es-CO')}
          </div>
          <span className="text-[9px] text-neutral-500 block">1 USD en COP</span>
        </div>

        {/* KPI: Cartas en Wishlist */}
        <div className="p-4 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-1">
          <span className="text-[10px] text-neutral-400 uppercase font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Deseos Activos</span>
          </span>
          <div className="text-lg font-bold text-sky-400">
            {wishlistCount}
          </div>
          <span className="text-[9px] text-neutral-500 block">En cruce P2P</span>
        </div>

      </div>

      {/* 3. BARRA DE NAVEGACIÓN DE PESTAÑAS */}
      <nav className="flex items-center gap-6 border-b border-[#242129] text-xs font-bold pt-2">
        <button
          onClick={() => setActiveTab('reputation')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'reputation'
              ? 'border-[#E88B00] text-[#E88B00]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>Reputación & Reseñas</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'preferences'
              ? 'border-[#E88B00] text-[#E88B00]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Preferencias de Trade</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'security'
              ? 'border-[#E88B00] text-[#E88B00]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Cuenta & Seguridad</span>
        </button>
      </nav>

      {/* 4. CONTENIDO DE LAS PESTAÑAS */}
      <div className="space-y-4">
        
        {/* PESTAÑA 1: REPUTACIÓN Y RESEÑAS */}
        {activeTab === 'reputation' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#141219] border border-[#2A2733] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-xs uppercase">Historial de Confianza Comunitaria</h3>
                <p className="text-neutral-400 text-[11px] font-sans">
                  Las calificaciones y comentarios se otorgan exclusivamente al confirmar la entrega de un intercambio en el Black Market.
                </p>
              </div>

              {onOpenTradeModal && (
                <button
                  onClick={onOpenTradeModal}
                  className="px-4 py-2 bg-[#E88B00]/10 hover:bg-[#E88B00]/20 text-[#E88B00] border border-[#E88B00]/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Explorar Muro P2P</span>
                </button>
              )}
            </div>

            {/* Listado de Feedback / Vouchs */}
            {profileData.feedbacks && profileData.feedbacks.length > 0 ? (
              <div className="space-y-3">
                {profileData.feedbacks.map((f, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#121118] border border-[#242129] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">@{f.author_username || 'Jugador'}</span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < Math.round(f.rating || 5) ? 'fill-amber-400' : 'text-neutral-700'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {f.created_at ? new Date(f.created_at).toLocaleDateString() : 'Reciente'}
                      </span>
                    </div>
                    {f.comment && (
                      <p className="text-neutral-300 text-xs font-sans">"{f.comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-[#121118] border border-dashed border-[#2A2733] text-center space-y-2 text-neutral-500">
                <Star className="w-6 h-6 mx-auto text-neutral-600" />
                <p className="text-xs font-bold text-neutral-400">Sin reseñas aún</p>
                <p className="text-[11px] font-sans">
                  Completa tu primer intercambio en el Black Market para recibir calificaciones de la comunidad.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: PREFERENCIAS DE TRADE */}
        {activeTab === 'preferences' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Formatos Favoritos */}
            <div className="p-5 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-3">
              <span className="text-[10px] text-[#E88B00] uppercase font-bold block">
                Formatos de Juego Preferidos
              </span>
              <div className="flex flex-wrap gap-2">
                {['Commander / EDH', 'Modern', 'Casual', 'Pauper'].map((fmt, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1 rounded-xl bg-[#1A1822] border border-[#2A2733] text-neutral-300 text-xs"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Puntos de Encuentro */}
            <div className="p-5 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-3">
              <span className="text-[10px] text-sky-400 uppercase font-bold block">
                Puntos de Encuentro Habituales
              </span>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                {profileData.location || 'Tiendas locales LGS en Medellín y Área Metropolitana (Bello, Poblado, Laureles).'}
              </p>
            </div>

          </div>
        )}

        {/* PESTAÑA 3: SEGURIDAD Y CUENTA */}
        {activeTab === 'security' && (
          <div className="p-6 rounded-2xl bg-[#141219] border border-[#2A2733] space-y-4">
            <h3 className="font-bold text-white text-xs uppercase flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Credenciales y Datos de Acceso</span>
            </h3>

            <div className="space-y-2.5 text-xs text-neutral-300 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1822] border border-[#242129]">
                <span className="text-neutral-400">Teléfono registrado:</span>
                <span className="font-bold text-white">{profileData.phone_number || 'No especificado'}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1822] border border-[#242129]">
                <span className="text-neutral-400">Correo electrónico:</span>
                <span className="font-bold text-white">{profileData.email || 'No especificado'}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1A1822] border border-[#242129]">
                <span className="text-neutral-400">ID de Usuario:</span>
                <span className="text-neutral-500 font-mono text-[10px]">{profileData.id}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal de edición */}
      {isEditModalOpen && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentUser={profileData}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* FOOTER POLÍTICA WOTC */}
      <div className="pt-6 border-t border-[#242129] text-center text-[10px] text-neutral-600">
        Portions of card imagery and literal data are copyright Wizards of the Coast LLC. Unofficial Fan Content.
      </div>

    </div>
  );
}
// ---------------------------------------------------------
// PÁGINA: PERFIL DE USUARIO Y DASHBOARD P2P
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import ProfileHeader from '../components/profile/ProfileHeader';
import SecuritySidebar from '../components/profile/SecuritySidebar';
import BinderPreviewGrid from '../components/profile/BinderPreviewGrid';
import { getMyProfileApi } from '../api/users';
import { getCollectionCardsApi } from '../api/collections';
import { 
  Layers, 
  Sparkles, 
  Repeat, 
  Lock, 
  Search, 
  Filter, 
  FolderPlus,
  Loader2
} from 'lucide-react';

export default function ProfilePage({ user, onOpenBinderModal, onOpenTradeModal, onOpenAuthModal }) {
  const [activeTab, setActiveTab] = useState('binders');
  const [selectedBinderId, setSelectedBinderId] = useState(null);
  const [binderSearchTerm, setBinderSearchTerm] = useState('');
  
  const [profileData, setProfileData] = useState(null);
  const [binderCards, setBinderCards] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState(null);

  // 1. Cargar el perfil del usuario autenticado vía JWT
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingProfile(false);
        return;
      }

      setLoadingProfile(true);
      setError(null);
      try {
        const data = await getMyProfileApi();
        setProfileData(data);
        if (data.binders && data.binders.length > 0) {
          setSelectedBinderId(data.binders[0].id);
        }
      } catch (err) {
        console.error("Error cargando el perfil:", err);
        setError("No se pudo cargar el perfil comercial. Verifica tu sesión.");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user]);

  // 2. Cargar reactivamente las cartas del binder activo cuando cambia `selectedBinderId`
  useEffect(() => {
    const fetchCards = async () => {
      if (!selectedBinderId) {
        setBinderCards([]);
        return;
      }

      setLoadingCards(true);
      try {
        const cards = await getCollectionCardsApi(selectedBinderId);
        setBinderCards(Array.isArray(cards) ? cards : []);
      } catch (err) {
        console.error(`Error cargando cartas del binder ${selectedBinderId}:`, err);
        setBinderCards([]);
      } finally {
        setLoadingCards(false);
      }
    };

    fetchCards();
  }, [selectedBinderId]);

  // Si no hay token de autenticación
  const token = localStorage.getItem('token');
  if (!token && !loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <Lock className="w-10 h-10 text-amber-500" />
        <h2 className="text-lg font-bold text-white">Inicia sesión para gestionar tu colección</h2>
        <p className="text-xs text-neutral-400 max-w-sm">
          Accede con tu número celular verificado mediante OTP para revisar tus binders, trade wall y reputación comercial P2P.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition shadow-md"
        >
          Iniciar Sesión / Registrarse
        </button>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-28 text-neutral-400 text-sm font-mono gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        Cargando perfil P2P...
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="text-red-400 text-sm text-center py-20 font-mono">
        {error || "No hay datos de perfil disponibles."}
      </div>
    );
  }

  // Filtrado en vivo de las cartas del binder
  const filteredCards = binderCards.filter((card) => {
    const cardName = card.card_catalog?.name || card.name || '';
    return cardName.toLowerCase().includes(binderSearchTerm.toLowerCase());
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* 1. CABECERA MODULAR */}
      <ProfileHeader 
        user={profileData} 
        onEditProfile={() => {}} 
        onTradeSettings={() => {}} 
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
          <Layers className="w-4 h-4" /> My Binders & Inventory
        </button>
        <button 
          onClick={() => setActiveTab('wishlist')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'wishlist' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> My Wishlist
        </button>
        <button 
          onClick={() => setActiveTab('matches')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'matches' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Repeat className="w-4 h-4" /> Mutual Matches (P2P)
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-neutral-950 font-mono">
            {profileData.kpis?.wishlist_wants > 0 ? profileData.kpis.wishlist_wants : "0"}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('security')} 
          className={`pb-3 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'security' 
              ? 'border-amber-500 text-white font-bold' 
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Lock className="w-4 h-4" /> Account & Phone Security
        </button>
      </nav>

      {/* 3. CONTENIDO: BINDERS + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LADO IZQUIERDO: BINDERS Y CARTAS (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Fila de Binders (Ajustado a la Fan Content Policy de Scryfall) */}
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
                  />
                  <span className="absolute top-2 left-2 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-950/80 text-neutral-300 border border-neutral-800 backdrop-blur-sm shadow-sm">
                    BINDER
                  </span>
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white truncate">{binder.name}</h3>
                    <div className="text-[9px] text-neutral-500 truncate mt-0.5 italic">
                      Magic: The Gathering - Art crop
                    </div>
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
              <div className="col-span-1 md:col-span-3 text-center text-sm text-neutral-500 py-8 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                No tienes carpetas creadas. Usa el botón &quot;+ New Binder&quot; para empezar.
              </div>
            )}
          </div>

          {/* Barra de Filtros del Binder */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/40 border border-neutral-800 p-3 rounded-xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-bold text-white">Cartas del Binder</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar en binder..."
                  value={binderSearchTerm}
                  onChange={(e) => setBinderSearchTerm(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 border border-neutral-700 transition">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>

              <button 
                onClick={onOpenBinderModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 transition"
              >
                <FolderPlus className="w-3.5 h-3.5" /> + New Binder 
                <span className="font-mono text-[10px] opacity-80">
                  ({profileData.kpis?.active_binders || 0}/{profileData.kpis?.max_binders || 10})
                </span>
              </button>
            </div>
          </div>

          {/* Grid de Cartas con estado de carga */}
          {loadingCards ? (
            <div className="flex items-center justify-center py-16 text-neutral-500 text-xs font-mono gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              Cargando cartas del binder...
            </div>
          ) : (
            <BinderPreviewGrid cards={filteredCards} />
          )}

        </div>

        {/* LADO DERECHO: WIDGETS DE SEGURIDAD (4 COLS) */}
        <div className="lg:col-span-4">
          <SecuritySidebar 
            phone={profileData.phone_number}
            isVerified={profileData.is_phone_verified}
            onOpenTradeMatches={onOpenTradeModal}
            onReverifyPhone={() => {}}
          />
        </div>

      </div>

    </div>
  );
}
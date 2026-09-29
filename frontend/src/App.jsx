// ---------------------------------------------------------
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (APP LAYOUT)
// ---------------------------------------------------------
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Layers, 
  Shield, 
  ArrowLeftRight, 
  User as UserIcon,
  ChevronDown,
  Edit3,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react';

import { CatalogPage } from './pages/CatalogPage';
import BindersPage from './pages/BindersPage';
import DecksPage from './pages/DecksPage';
import ProfilePage from './pages/ProfilePage';
import TradeWallPage from './pages/TradeWallPage';
import UserModal from './components/auth/UserModal';
import EditProfileModal from './components/profile/EditProfileModal';
import CreateDeckModal from './components/decks/CreateDeckModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('catalog');

  // Estado del usuario activo
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mtg_dev_user') || localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error al parsear usuario guardado en localStorage:', e);
      return null;
    }
  });

  const [deckCount, setDeckCount] = useState(0);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
  const [refreshDecksTrigger, setRefreshDecksTrigger] = useState(0);

  // Menú desplegable del Navbar
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (userData, accessToken = null) => {
    setCurrentUser(userData);
    try {
      if (userData) {
        localStorage.setItem('mtg_dev_user', JSON.stringify(userData));
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.id) {
          localStorage.setItem('mtg_dev_user_id', userData.id);
        }
      }

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('mtg_access_token', accessToken);
      }
    } catch (e) {
      console.error('No se pudo guardar la sesión en localStorage:', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('mtg_access_token');
    localStorage.removeItem('mtg_dev_user');
    localStorage.removeItem('user');
    localStorage.removeItem('mtg_dev_user_id');
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
    setActiveTab('catalog');
  };

  const handleProfileUpdated = (updatedUser) => {
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedUser
    }));
    try {
      localStorage.setItem('mtg_dev_user', JSON.stringify({ ...currentUser, ...updatedUser }));
      localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updatedUser }));
    } catch (e) {
      console.error('Error sincronizando perfil en storage:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* 1. NAVBAR SUPERIOR */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo y Marca */}
          <div 
            onClick={() => setActiveTab('catalog')} 
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <span className="text-2xl">🧙‍♂️</span>
            <div>
              <span className="text-base font-bold tracking-tight text-neutral-100 block leading-tight">
                MTG Trade & Market
              </span>
              <span className="text-[10px] text-amber-500 font-mono tracking-wider uppercase font-semibold">
                Analytics & P2P Exchange
              </span>
            </div>
          </div>

          {/* Menú de Navegación Principal */}
          <nav className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'catalog'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Catálogo</span>
            </button>

            <button
              onClick={() => setActiveTab('binders')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'binders'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Colecciones</span>
            </button>

            <button
              onClick={() => setActiveTab('decks')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'decks'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mazos</span>
            </button>

            <button
              onClick={() => setActiveTab('tradewall')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'tradewall'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Muro Trade</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>
          </nav>

          {/* Menú de Usuario / Sesión en la esquina superior derecha */}
          <div className="flex items-center gap-3">
            {currentUser?.id ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-900/90 hover:border-amber-500/50 hover:bg-neutral-800/50 transition text-xs group"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.username?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <span className="font-semibold text-neutral-200 truncate max-w-[120px]">
                    @{currentUser.username}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 transition" />
                </button>

                {/* Desplegable de Usuario */}
                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-fadeIn">
                    <div className="px-3 py-2 border-b border-neutral-800/80 mb-1">
                      <p className="font-bold text-white truncate">@{currentUser.username}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{currentUser.email || currentUser.phone_number}</p>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/70 transition"
                    >
                      <UserIcon className="w-4 h-4 text-neutral-400" />
                      <span>Ver Mi Perfil</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsEditProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/70 transition"
                    >
                      <Edit3 className="w-4 h-4 text-amber-500" />
                      <span>Editar Perfil & Ubicación</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setActiveTab('tradewall');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800/70 transition"
                    >
                      <Settings className="w-4 h-4 text-neutral-400" />
                      <span>Preferencias Trade</span>
                    </button>

                    <div className="border-t border-neutral-800/80 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/30 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Iniciar Sesión / Registro</span>
              </button>
            )}

            {/* Estado API */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>API Online</span>
            </div>
          </div>

        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'catalog' && <CatalogPage />}
        
        {activeTab === 'binders' && (
          currentUser?.id ? (
            <BindersPage userId={currentUser.id} onOpenAuthModal={() => setIsUserModalOpen(true)} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md p-8 bg-neutral-900/60 border border-neutral-800 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Inicia Sesión</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Para ver y organizar tus binders comerciales, inicia sesión con tu número de teléfono.
                </p>
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition"
                >
                  Iniciar Sesión
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'decks' && (
          <DecksPage 
            currentUser={currentUser}
            onDeckCountChange={setDeckCount}
            refreshTrigger={refreshDecksTrigger}
            onOpenCreateDeckModal={() => setIsCreateDeckModalOpen(true)}
            onNavigateToTradeWall={() => setActiveTab('tradewall')}
          />
        )}

        {activeTab === 'tradewall' && (
          <TradeWallPage 
            currentUser={currentUser} 
            onNavigateToCatalog={() => setActiveTab('catalog')} 
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePage 
            user={currentUser} 
            onOpenBinderModal={() => setActiveTab('binders')}
            onOpenTradeModal={() => setActiveTab('tradewall')}
            onOpenAuthModal={() => setIsUserModalOpen(true)}
            onEditProfileModal={() => setIsEditProfileModalOpen(true)}
          />
        )}
      </div>

      {/* 3. MODALES GLOBALES */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        user={currentUser}
        onProfileUpdated={handleProfileUpdated}
      />

      <CreateDeckModal
        isOpen={isCreateDeckModalOpen}
        onClose={() => setIsCreateDeckModalOpen(false)}
        currentDeckCount={deckCount}
        onDeckCreated={() => {
          setRefreshDecksTrigger((prev) => prev + 1);
        }}
      />

      {/* 4. FOOTER */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500 px-4">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>Plataforma de intercambio local y consulta analítica de Magic: The Gathering.</p>
          <p className="text-[11px] text-neutral-600 max-w-2xl mx-auto">
            La información literal y gráfica relacionada con Magic: The Gathering es copyright de Wizards of the Coast LLC[cite: 10]. 
            Esta aplicación es software no oficial y no está producida ni respaldada por Scryfall ni Wizards of the Coast[cite: 10].
          </p>
        </div>
      </footer>

    </div>
  );
}
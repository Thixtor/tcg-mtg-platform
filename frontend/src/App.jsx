// ---------------------------------------------------------
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (APP LAYOUT CON TEMA GLOBAL)
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
  Sun,
  Moon
} from 'lucide-react';

import { CatalogPage } from './pages/CatalogPage';
import BindersPage from './pages/BindersPage';
import DecksPage from './pages/DecksPage';
import ProfilePage from './pages/ProfilePage';
import TradeWallPage from './pages/TradeWallPage';
import AuthModal from './components/auth/AuthModal';
import EditProfileModal from './components/profile/EditProfileModal';
import CreateDeckModal from './components/decks/CreateDeckModal';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { CardModalProvider } from '@/context/CardModalContext';
import { getCurrentUser, saveSession, clearSession, getAccessToken } from '@/services/session.service';

function AppContent() {
  const { isLightMode, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('catalog');
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  const [deckCount, setDeckCount] = useState(0);
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
  const [refreshDecksTrigger, setRefreshDecksTrigger] = useState(0);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Escuchar cierre de sesión emitido por interceptor 401 en client.js
  useEffect(() => {
    const handleGlobalLogout = () => {
      setCurrentUser(null);
      setIsUserDropdownOpen(false);
      setActiveTab('catalog');
      setSelectedDeckId(null);
    };

    window.addEventListener('mtg:logout', handleGlobalLogout);
    return () => window.removeEventListener('mtg:logout', handleGlobalLogout);
  }, []);

  // Cerrar menú desplegable al hacer clic fuera
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
    if (!userData) return;
    const sessionData = {
      user: userData,
      access_token: accessToken || getAccessToken() || ''
    };
    saveSession(sessionData);
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
    setActiveTab('catalog');
    setSelectedDeckId(null);
  };

  const handleProfileUpdated = (updatedFields) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      saveSession({ user: updated, access_token: getAccessToken() || '' });
      return updated;
    });
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-amber-500 selection:text-neutral-950 ${
      isLightMode ? 'bg-[#FAF7F2] text-[#24211E]' : 'bg-[#0B0B0B] text-neutral-100'
    }`}>
      
      {/* 1. NAVBAR SUPERIOR */}
      <header className={`sticky top-0 z-40 w-full backdrop-blur-md transition-colors duration-200 border-b ${
        isLightMode 
          ? 'bg-[#FAF7F2]/90 border-[#E8E2D5]' 
          : 'bg-[#0B0B0B]/90 border-neutral-900'
      }`}>
        <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo y Marca */}
          <div 
            onClick={() => { setActiveTab('catalog'); setSelectedDeckId(null); }} 
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <span className="text-2xl">🧙‍♂️</span>
            <div>
              <span className={`text-base font-bold tracking-tight block leading-tight ${
                isLightMode ? 'text-[#1F1C19]' : 'text-neutral-100'
              }`}>
                MTG Trade & Market
              </span>
              <span className="text-[10px] text-amber-500 font-mono tracking-wider uppercase font-semibold">
                Analytics & P2P Exchange
              </span>
            </div>
          </div>

          {/* Menú de Navegación Central */}
          <nav className={`flex items-center gap-1.5 p-1 rounded-xl transition ${
            isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-900/90'
          }`}>
            <button
              onClick={() => { setActiveTab('catalog'); setSelectedDeckId(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : (isLightMode ? 'text-neutral-600 hover:text-neutral-950 hover:bg-[#DDD5C5]' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60')
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Catálogo</span>
            </button>

            <button
              onClick={() => { setActiveTab('binders'); setSelectedDeckId(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'binders'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : (isLightMode ? 'text-neutral-600 hover:text-neutral-950 hover:bg-[#DDD5C5]' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60')
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Colecciones</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('decks');
                setSelectedDeckId(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'decks'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : (isLightMode ? 'text-neutral-600 hover:text-neutral-950 hover:bg-[#DDD5C5]' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60')
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mazos</span>
            </button>

            <button
              onClick={() => { setActiveTab('tradewall'); setSelectedDeckId(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'tradewall'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : (isLightMode ? 'text-neutral-600 hover:text-neutral-950 hover:bg-[#DDD5C5]' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60')
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Muro Trade</span>
            </button>

            <button
              onClick={() => { setActiveTab('profile'); setSelectedDeckId(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : (isLightMode ? 'text-neutral-600 hover:text-neutral-950 hover:bg-[#DDD5C5]' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60')
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>
          </nav>

          {/* Menú de Usuario / Sesión + Selector Global de Tema */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className={`px-2.5 py-1.5 rounded-xl transition flex items-center gap-1.5 text-xs font-medium ${
                isLightMode
                  ? 'bg-[#EAE4D7] text-neutral-700 hover:bg-[#DDD5C5]'
                  : 'bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800'
              }`}
              title={isLightMode ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Blanco Hueso'}
            >
              {isLightMode ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-[11px] font-mono hidden md:inline">{isLightMode ? 'Oscuro' : 'Claro'}</span>
            </button>

            {currentUser?.id ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition text-xs group ${
                    isLightMode 
                      ? 'bg-[#EAE4D7] hover:bg-[#DDD5C5]' 
                      : 'bg-neutral-900/90 hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.username?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <span className={`font-semibold truncate max-w-[120px] ${
                    isLightMode ? 'text-[#1F1C19]' : 'text-neutral-200'
                  }`}>
                    @{currentUser.username}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-500 transition" />
                </button>

                {isUserDropdownOpen && (
                  <div className={`absolute right-0 mt-2 w-52 rounded-xl shadow-2xl py-1.5 z-50 text-xs transition-opacity ${
                    isLightMode 
                      ? 'bg-[#FAF7F2] text-[#24211E] shadow-neutral-400/20' 
                      : 'bg-neutral-900 text-neutral-200 shadow-black'
                  }`}>
                    <div className={`px-3 py-2 border-b mb-1 ${
                      isLightMode ? 'border-[#EAE4D7]' : 'border-neutral-800/80'
                    }`}>
                      <p className={`font-bold truncate ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
                        @{currentUser.username}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {currentUser.email || currentUser.phone_number}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setActiveTab('profile');
                        setSelectedDeckId(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 transition ${
                        isLightMode ? 'hover:bg-[#EAE4D7]' : 'hover:bg-neutral-800/70 hover:text-white'
                      }`}
                    >
                      <UserIcon className="w-4 h-4 text-neutral-400" />
                      <span>Ver Mi Perfil</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setIsEditProfileModalOpen(true);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 transition ${
                        isLightMode ? 'hover:bg-[#EAE4D7]' : 'hover:bg-neutral-800/70 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-4 h-4 text-amber-500" />
                      <span>Editar Perfil & Ubicación</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        setActiveTab('tradewall');
                        setSelectedDeckId(null);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 transition ${
                        isLightMode ? 'hover:bg-[#EAE4D7]' : 'hover:bg-neutral-800/70 hover:text-white'
                      }`}
                    >
                      <Settings className="w-4 h-4 text-neutral-400" />
                      <span>Preferencias Trade</span>
                    </button>

                    <div className={`border-t my-1 ${
                      isLightMode ? 'border-[#EAE4D7]' : 'border-neutral-800/80'
                    }`} />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-500 hover:bg-rose-950/20 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Iniciar Sesión / Registro</span>
              </button>
            )}

            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isLightMode 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-emerald-950/40 text-emerald-400'
            }`}>
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
            <BindersPage userId={currentUser?.id} onOpenAuthModal={() => setIsAuthModalOpen(true)} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className={`w-full max-w-md p-8 rounded-2xl text-center space-y-3 ${
                isLightMode ? 'bg-[#EAE4D7]' : 'bg-neutral-900/60'
              }`}>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className={`text-lg font-bold ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
                  Inicia Sesión
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Para ver y organizar tus binders comerciales, inicia sesión con tu cuenta.
                </p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
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
            selectedDeckId={selectedDeckId}
            onSelectDeckId={setSelectedDeckId}
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
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onEditProfileModal={() => setIsEditProfileModalOpen(true)}
          />
        )}
      </div>

      {/* 3. MODALES GLOBALES */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
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

      {/* 4. FOOTER CUMPLIENDO POLÍTICA FAN CONTENT */}
      <footer className={`py-6 text-center text-xs px-4 transition-colors duration-200 border-t ${
        isLightMode 
          ? 'bg-[#FAF7F2] border-[#E8E2D5] text-neutral-600' 
          : 'bg-[#0B0B0B] border-neutral-900 text-neutral-500'
      }`}>
        <div className="max-w-7xl mx-auto space-y-2">
          <p>Plataforma de intercambio local y consulta analítica de Magic: The Gathering.</p>
          <p className="text-[11px] opacity-70 max-w-2xl mx-auto">
            La información literal y gráfica relacionada con Magic: The Gathering es copyright de Wizards of the Coast LLC . 
            Esta aplicación es software no oficial y no está producida ni respaldada por Scryfall ni Wizards of the Coast .
          </p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CardModalProvider>
        <AppContent />
      </CardModalProvider>
    </ThemeProvider>
  );
}
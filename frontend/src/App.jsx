// ---------------------------------------------------------
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (APP LAYOUT)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { 
  Search, 
  Layers, 
  Shield, 
  ArrowLeftRight, 
  User as UserIcon 
} from 'lucide-react';

import { CatalogPage } from './pages/CatalogPage';
import BindersPage from './pages/BindersPage';
import DecksPage from './pages/DecksPage';
import ProfilePage from './pages/ProfilePage';
import TradeWallPage from './pages/TradeWallPage';
import UserModal from './components/auth/UserModal';
import CreateDeckModal from './components/decks/CreateDeckModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('catalog');

  // Lectura segura con try/catch para evitar pantalla en blanco si el valor está corrupto
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('mtg_dev_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error al parsear usuario guardado en localStorage:', e);
      return null;
    }
  });

  const [deckCount, setDeckCount] = useState(0);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
  const [refreshDecksTrigger, setRefreshDecksTrigger] = useState(0);

  const handleSelectUser = (userData, accessToken = null) => {
    setCurrentUser(userData);
    try {
      localStorage.setItem('mtg_dev_user', JSON.stringify(userData));
      if (accessToken) {
        localStorage.setItem('mtg_access_token', accessToken);
      }
    } catch (e) {
      console.error('No se pudo guardar la sesión en localStorage:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* 1. NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  if (currentUser?.id) {
                    setActiveTab('profile');
                  } else {
                    setIsUserModalOpen(true);
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-amber-500/50 transition text-xs"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-neutral-200 truncate max-w-[100px] sm:max-w-none">
                  {currentUser?.username || 'Crear / Activar'}
                </span>
              </button>

              {currentUser?.id && (
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="px-2 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-700 text-neutral-400 hover:text-white text-[10px] font-mono"
                >
                  Cambiar
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:inline">API Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'catalog' && <CatalogPage />}
        
        {activeTab === 'binders' && (
          currentUser?.id ? (
            <BindersPage userId={currentUser.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md p-8 bg-neutral-900/60 border border-neutral-800 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <UserIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Activa un Jugador</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Para ver y crear tus colecciones, activa o crea tu cuenta de jugador.
                </p>
                <button
                  onClick={() => setIsUserModalOpen(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition"
                >
                  Configurar Jugador
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
            La información literal y gráfica relacionada con Magic: The Gathering es copyright de Wizards of the Coast LLC. 
            Esta aplicación es software no oficial y no está producida ni respaldada por Scryfall ni Wizards of the Coast.
          </p>
        </div>
      </footer>

    </div>
  );
}
// ---------------------------------------------------------
// COMPONENTE PRINCIPAL DE LA APLICACIÓN (APP LAYOUT)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { Search, Layers, Shield, User as UserIcon } from 'lucide-react';
import { CatalogPage } from './pages/CatalogPage';
import BindersPage from './pages/BindersPage';
import DecksPage from './pages/DecksPage';
import UserModal from './components/auth/UserModal';

export default function App() {
  // Pestaña activa: 'catalog' | 'binders' | 'decks'
  const [activeTab, setActiveTab] = useState('catalog');

  // Usuario activo cargado desde localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('mtg_dev_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Control del modal de usuario
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const handleSelectUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('mtg_dev_user', JSON.stringify(user));
    localStorage.setItem('mtg_dev_user_id', user.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* --------------------------------------------------------- */}
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR)                  */}
      {/* --------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo y Nombre del Proyecto */}
          <div className="flex items-center gap-3">
            <span className="text-2xl select-none">🧙‍♂️</span>
            <div>
              <span className="text-base font-bold tracking-tight text-neutral-100 block leading-tight">
                MTG Trade & Market
              </span>
              <span className="text-[10px] text-amber-500 font-mono tracking-wider uppercase font-semibold">
                Analytics & P2P Exchange
              </span>
            </div>
          </div>

          {/* Menú de Navegación de Vistas */}
          <nav className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'catalog'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Catálogo</span>
            </button>

            <button
              onClick={() => setActiveTab('binders')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'binders'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mis Colecciones</span>
            </button>

            <button
              onClick={() => setActiveTab('decks')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'decks'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Mis Mazos</span>
            </button>
          </nav>

          {/* Estado de API y Selector de Jugador */}
          <div className="flex items-center gap-3">
            {/* Botón Perfil de Usuario */}
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:border-amber-500/50 transition text-xs"
            >
              <UserIcon className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-neutral-200">
                {currentUser?.username || 'Crear / Activar Usuario'}
              </span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden md:inline">API Online</span>
            </div>
          </div>

        </div>
      </header>

      {/* --------------------------------------------------------- */}
      {/* 2. ÁREA DE CONTENIDO PRINCIPAL (ROUTER / VISTAS)           */}
      {/* --------------------------------------------------------- */}
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
          currentUser?.id ? (
            <DecksPage userId={currentUser.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-md p-8 bg-neutral-900/60 border border-neutral-800 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Activa un Jugador</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Para construir y auditar tus mazos, activa o crea tu cuenta de jugador.
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
      </div>

      {/* Modal de Usuario */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
      />

      {/* Footer Legal Scryfall / WOTC */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500 px-4">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>Plataforma de intercambio local y consulta analítica de Magic: The Gathering.</p>
          <p className="text-[11px] text-neutral-600 max-w-2xl mx-auto">
            La información literal y gráfica relacionada con Magic: The Gathering es copyright de Wizards of the Coast LLC. 
            Esta aplicación es software no oficial y no está producida ni respaldada por Scryfall ni Wizards of the Coast[cite: 3].
          </p>
        </div>
      </footer>

    </div>
  );
}
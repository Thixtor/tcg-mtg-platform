// ---------------------------------------------------------
// COMPONENTE: NAVBAR CINEMATOGRÁFICO PLANO (ESTILO CRUNCHYROLL)
// ---------------------------------------------------------
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home as HomeIcon,
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

export default function Navbar({
  activeTab,
  currentUser,
  isLightMode,
  onNavigateTab,
  onToggleTheme,
  onOpenAuthModal,
  onOpenEditProfileModal,
  onLogout
}) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  const navItems = [
    { key: 'home', label: 'Inicio', icon: HomeIcon },
    { key: 'catalog', label: 'Catálogo', icon: Search },
    { key: 'binders', label: 'Colecciones', icon: Layers },
    { key: 'decks', label: 'Mazos', icon: Shield },
    { key: 'tradewall', label: 'Muro Trade', icon: ArrowLeftRight },
    { key: 'profile', label: 'Mi Perfil', icon: UserIcon }
  ];

  return (
    <header className={`sticky top-0 z-40 w-full backdrop-blur-md transition-colors duration-200 border-b select-none ${
      isLightMode 
        ? 'bg-[#FAF7F2]/95 border-[#E2DBD0]' 
        : 'bg-[#0B0B0B]/95 border-neutral-800'
    }`}>
      <div className="max-w-[1920px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Logo y Marca */}
        <div 
          onClick={() => onNavigateTab('home')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <span className="text-2xl transition group-hover:scale-105">🧙‍♂️</span>
          <div>
            <span className={`text-base font-black tracking-wider uppercase block leading-tight ${
              isLightMode ? 'text-[#1F1C19]' : 'text-white'
            }`}>
              MTG Trade & Market
            </span>
            <span className="text-[10px] text-amber-500 font-mono tracking-widest uppercase font-bold">
              Analytics & P2P Exchange
            </span>
          </div>
        </div>

        {/* Menú de Navegación Central Recto */}
        <nav className="flex items-center gap-0.5 h-full">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onNavigateTab(key)}
              className={`flex items-center gap-2 px-4 h-16 text-xs uppercase tracking-wider font-bold transition-all relative border-b-2 ${
                activeTab === key
                  ? 'border-amber-500 text-amber-400 bg-neutral-900/40'
                  : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        {/* Menú de Usuario / Sesión + Selector de Tema */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            className={`px-3 py-2 transition flex items-center gap-1.5 text-xs font-mono font-bold border ${
              isLightMode
                ? 'bg-neutral-100 border-[#D8CEBC] text-neutral-700 hover:bg-[#DDD5C5]'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-amber-500 hover:text-white'
            }`}
            title={isLightMode ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
          >
            {isLightMode ? <Moon className="w-3.5 h-3.5 text-indigo-600" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-[11px] hidden md:inline">{isLightMode ? 'OSCURO' : 'CLARO'}</span>
          </button>

          {currentUser?.id ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className={`flex items-center gap-2.5 px-3 py-2 transition text-xs border group ${
                  isLightMode 
                    ? 'bg-white border-[#D8CEBC] hover:border-amber-500' 
                    : 'bg-neutral-900/80 border-neutral-800 hover:border-amber-500'
                }`}
              >
                <div className="w-5 h-5 bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-[10px]">
                  {currentUser.username?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <span className={`font-bold uppercase tracking-wider truncate max-w-[120px] ${
                  isLightMode ? 'text-[#1F1C19]' : 'text-neutral-200'
                }`}>
                  @{currentUser.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-500 transition" />
              </button>

              {isUserDropdownOpen && (
                <div className={`absolute right-0 mt-1 w-56 shadow-2xl py-1 z-50 text-xs border ${
                  isLightMode 
                    ? 'bg-white border-[#D8CEBC] text-[#24211E]' 
                    : 'bg-[#121214] border-neutral-800 text-neutral-200'
                }`}>
                  <div className={`px-4 py-2.5 border-b ${
                    isLightMode ? 'border-[#EAE4D7]' : 'border-neutral-800'
                  }`}>
                    <p className={`font-black uppercase tracking-wider truncate ${isLightMode ? 'text-[#1F1C19]' : 'text-white'}`}>
                      @{currentUser.username}
                    </p>
                    <p className="text-[10px] font-mono text-neutral-400 truncate">
                      {currentUser.email || currentUser.phone_number}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onNavigateTab('profile');
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition font-semibold ${
                      isLightMode ? 'hover:bg-[#EAE4D7]' : 'hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-neutral-400" />
                    <span>Ver Mi Perfil</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenEditProfileModal();
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition font-semibold ${
                      isLightMode ? 'hover:bg-[#EAE4D7]' : 'hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-amber-500" />
                    <span>Editar Perfil & Ubicación</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onNavigateTab('tradewall');
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition font-semibold ${
                      isLightMode ? 'hover:bg-[#EAE4D7]' : 'hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-neutral-400" />
                    <span>Preferencias Trade</span>
                  </button>

                  <div className={`border-t my-1 ${
                    isLightMode ? 'border-[#EAE4D7]' : 'border-neutral-800'
                  }`} />

                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-rose-500 hover:bg-rose-950/20 transition font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider transition shadow-md active:scale-95"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </button>
          )}

          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold border ${
            isLightMode 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
              : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400'
          }`}>
            <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse" />
            <span>ONLINE</span>
          </div>
        </div>

      </div>
    </header>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthModal from '@/components/auth/AuthModal';
import { getCurrentUser, clearSession, isAuthenticated } from '@/services/session.service';

export default function Navbar() {
  const navigate = useNavigate();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sincronizar el estado del usuario al montar el componente
  useEffect(() => {
    if (isAuthenticated()) {
      setCurrentUser(getCurrentUser());
    } else {
      setCurrentUser(null);
    }
  }, []);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setIsDropdownOpen(false);
    navigate('/');
    window.location.reload();
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo y Enlaces Principales */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">
                MTG<span className="text-amber-500">TCG</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link to="/binders" className="text-neutral-300 hover:text-white transition-colors">
                Carpetas
              </Link>
              <Link to="/market" className="text-neutral-300 hover:text-white transition-colors">
                Mercado P2P
              </Link>
            </div>
          </div>

          {/* Área de Autenticación / Perfil */}
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 rounded-full border border-neutral-800 bg-neutral-900 py-1.5 pl-3 pr-2 text-sm text-neutral-200 hover:border-neutral-700 transition-colors focus:outline-none"
                >
                  <span className="font-semibold text-white">
                    {currentUser.username || 'Mi Cuenta'}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-500">
                    {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                  </div>
                </button>

                {/* Menú Desplegable */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-xl">
                    <div className="px-3 py-2 border-b border-neutral-800 text-xs text-neutral-400">
                      Conectado como <strong className="text-neutral-200 block truncate">{currentUser.username}</strong>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      Mi Perfil
                    </Link>

                    <Link
                      to="/binders"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      Mis Colecciones
                    </Link>

                    <div className="my-1 border-t border-neutral-800" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-amber-400 transition-colors"
                >
                  Iniciar Sesión / Registro
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* Modal de Autenticación Unificado */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
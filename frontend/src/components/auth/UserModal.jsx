// ---------------------------------------------------------
// COMPONENTE: MODAL DE GESTIÓN Y REGISTRO DE USUARIO (MVP)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, UserPlus, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { registerUserApi } from '../../api/auth';

export default function UserModal({ isOpen, onClose, currentUser, onSelectUser }) {
  // Pestaña interna: 'register' | 'switch'
  const [mode, setMode] = useState('register');

  // Formulario de Registro
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+57');

  // Input manual para alternar de usuario por ID
  const [manualId, setManualId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !phoneNumber.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newUser = await registerUserApi({
        username: username.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
      });

      // Establecer como usuario activo
      onSelectUser(newUser);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchById = (e) => {
    e.preventDefault();
    if (!manualId.trim()) {
      setError('Ingresa un ID de usuario válido.');
      return;
    }
    onSelectUser({ id: manualId.trim(), username: 'Usuario Activo' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold text-base">
            <UserCheck className="w-5 h-5 text-amber-500" />
            <span>Perfil de Jugador (MVP)</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas modo */}
        <div className="grid grid-cols-2 p-2 bg-neutral-950/50 border-b border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`py-2 rounded-lg font-semibold transition ${
              mode === 'register'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Crear Jugador
          </button>
          <button
            type="button"
            onClick={() => { setMode('switch'); setError(null); }}
            className={`py-2 rounded-lg font-semibold transition ${
              mode === 'switch'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cargar por ID
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 p-3 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario Registro */}
        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Nombre de Usuario (Gamertag) *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: sebastian_mtg"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu_email@ejemplo.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Celular (Para intercambios) *
              </label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+573001234567"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg shadow-sm transition"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                <span>Registrar y Activar</span>
              </button>
            </div>
          </form>
        ) : (
          /* Formulario Cambio Rápido por UUID */
          <form onSubmit={handleSwitchById} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                UUID de Usuario Existente
              </label>
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Pega el UUID aquí..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 font-mono placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm transition"
              >
                Activar Jugador
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
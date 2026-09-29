import React, { useState } from 'react';
import { requestOtpApi, verifyOtpApi, registerUserApi } from '@/api/users.api';
import { saveSession } from '@/services/session.service';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  
  // Estados para Login OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  // Estados para Registro
  const [regForm, setRegForm] = useState({
    username: '',
    email: '',
    phone_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  if (!isOpen) return null;

  const resetState = () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setOtpSent(false);
    setOtpCode('');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await requestOtpApi(phoneNumber);
      setOtpSent(true);
      setInfoMsg('Código de verificación enviado. Revisa tu consola o SMS.');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error solicitando el código de acceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await verifyOtpApi(phoneNumber, otpCode);
      // Guardar sesión usando la abstracción centralizada
      saveSession({
        access_token: data.access_token,
        user: data.user,
      });
      if (onLoginSuccess) onLoginSuccess(data.user);
      onClose();
      window.location.reload();
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await registerUserApi(regForm);
      setInfoMsg('Cuenta creada exitosamente. Inicia sesión con tu número.');
      setPhoneNumber(regForm.phone_number);
      setTab('login');
      setOtpSent(false);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Error creando la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl text-neutral-100">
        
        {/* Botón cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          ✕
        </button>

        {/* Encabezado */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {tab === 'login' ? 'Bienvenido de nuevo' : 'Crear una cuenta'}
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            {tab === 'login' 
              ? 'Accede a tus colecciones y binders de intercambio' 
              : 'Únete a la comunidad de intercambio de cartas'}
          </p>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-neutral-800 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${
              tab === 'login' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
            onClick={() => { setTab('login'); resetState(); }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-semibold transition-colors border-b-2 ${
              tab === 'register' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
            onClick={() => { setTab('register'); resetState(); }}
          >
            Registrarse
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-950/60 border border-red-800/80 p-3 text-sm text-red-200">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-lg bg-amber-950/40 border border-amber-700/60 p-3 text-sm text-amber-200">
            {infoMsg}
          </div>
        )}

        {/* FORMULARIO LOGIN (OTP) */}
        {tab === 'login' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-2">
                    Número de Celular
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+573001234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-lg bg-neutral-950 border border-neutral-750 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    Usa código de país (ej. +57 para Colombia).
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Solicitar Código de Acceso'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-2">
                    Código de 6 Dígitos
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono rounded-lg bg-neutral-950 border border-neutral-750 px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Entrar a mi Cuenta'}
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-neutral-400 hover:text-neutral-200 mt-2"
                >
                  ← Cambiar de número
                </button>
              </form>
            )}
          </div>
        )}

        {/* FORMULARIO REGISTRO */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">
                Nombre de Usuario
              </label>
              <input
                type="text"
                required
                placeholder="planeswalker99"
                value={regForm.username}
                onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-750 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="usuario@ejemplo.com"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-750 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-1">
                Número de Celular
              </label>
              <input
                type="tel"
                required
                placeholder="+573001234567"
                value={regForm.phone_number}
                onChange={(e) => setRegForm({ ...regForm, phone_number: e.target.value })}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-750 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
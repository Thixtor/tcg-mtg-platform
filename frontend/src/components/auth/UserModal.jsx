// frontend/src/components/auth/UserModal.jsx
// ---------------------------------------------------------
// COMPONENTE: MODAL DE AUTENTICACIÓN Y PERFIL DE JUGADOR
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Plus, KeyRound, ArrowRight } from 'lucide-react';
import { getUsersApi, registerUserApi, requestOtpApi, verifyOtpApi } from '../../api/users';

export default function UserModal({ isOpen, onClose, currentUser, onSelectUser }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('list'); // 'list' | 'register' | 'otp'

  // Datos de registro y login
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setStep('list');
      setError(null);
      setDevCodeHint('');
      setOtpCode('');
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsersApi();
      setUsersList(data || []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudo cargar la lista de jugadores.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Registro inicial
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerUserApi({
        username: username.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        location: 'Medellín / Bello, Antioquia'
      });
      // Tras registrar, pedimos el código OTP automáticamente
      await handleRequestOtp(phoneNumber.trim());
    } catch (err) {
      console.error('Error registrando usuario:', err);
      const detail = err.response?.data?.detail || 'Error al crear el perfil.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setLoading(false);
    }
  };

  // 2. Solicitar OTP (ya sea por registro o por login con teléfono)
  const handleRequestOtp = async (phone) => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestOtpApi(phone);
      if (res.dev_otp_code) {
        setDevCodeHint(res.dev_otp_code);
      }
      setPhoneNumber(phone);
      setStep('otp');
    } catch (err) {
      console.error('Error solicitando OTP:', err);
      const detail = err.response?.data?.detail || 'No se pudo enviar el código OTP.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  // 3. Validar OTP y almacenar JWT
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await verifyOtpApi(phoneNumber, otpCode.trim());
      // data = { access_token, user }
      onSelectUser(data.user, data.access_token);
      onClose();
    } catch (err) {
      console.error('Error verificando OTP:', err);
      const detail = err.response?.data?.detail || 'Código incorrecto o expirado.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/50">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-amber-500" />
            {step === 'list' && 'Seleccionar o Activar Jugador'}
            {step === 'register' && 'Crear Perfil de Trader'}
            {step === 'otp' && 'Verificación Celular OTP'}
          </h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
              {error}
            </div>
          )}

          {/* VISTA 1: LISTADO / SELECCIÓN RÁPIDA */}
          {step === 'list' && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-6 text-neutral-500 font-mono">Cargando jugadores...</div>
              ) : usersList.length === 0 ? (
                <div className="text-center py-6 text-neutral-500">No hay jugadores registrados en la plataforma.</div>
              ) : (
                <div className="space-y-2">
                  {usersList.map((u) => (
                    <div 
                      key={u.id}
                      onClick={() => {
                        // En desarrollo, seleccionamos directamente
                        onSelectUser(u);
                        onClose();
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        currentUser?.id === u.id 
                          ? 'border-amber-500 bg-amber-500/10' 
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-600'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          {u.username}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          Reputación: {u.reputation_score} pts • {u.completed_trades} trades
                        </div>
                      </div>
                      <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        Activar
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={() => setStep('register')}
                className="w-full mt-4 py-3 border border-dashed border-neutral-700 hover:border-amber-500 hover:bg-neutral-900 rounded-xl flex items-center justify-center gap-2 text-neutral-300 hover:text-white transition font-semibold"
              >
                <Plus className="w-4 h-4" /> Registrar nuevo jugador
              </button>
            </div>
          )}

          {/* VISTA 2: FORMULARIO DE REGISTRO */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-1">
                <label className="text-neutral-400 font-mono uppercase text-[10px]">Nombre de Usuario</label>
                <input 
                  type="text" required value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none"
                  placeholder="ej: urza_collector"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-400 font-mono uppercase text-[10px]">Correo Electrónico</label>
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none"
                  placeholder="tu@correo.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-400 font-mono uppercase text-[10px]">Número Celular (Formato E.164)</label>
                <input 
                  type="text" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none"
                  placeholder="+573001234567"
                />
                <span className="text-[10px] text-neutral-500 block">Debe iniciar con el código de país (ej. +57 para Colombia).</span>
              </div>
              
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setStep('list')} className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition">
                  Volver
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-neutral-950 transition disabled:opacity-50">
                  {loading ? 'Registrando...' : 'Continuar con OTP'}
                </button>
              </div>
            </form>
          )}

          {/* VISTA 3: INGRESO DE OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-center space-y-1">
                <span className="text-neutral-400 text-xs block">Código enviado al número:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{phoneNumber}</span>
                {devCodeHint && (
                  <div className="mt-2 pt-2 border-t border-neutral-800/80 text-[11px] text-emerald-400 font-mono">
                    🔑 [MODO DEV] Código detectado: <strong>{devCodeHint}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-neutral-400 font-mono uppercase text-[10px]">Código de 6 dígitos</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  required 
                  value={otpCode} 
                  onChange={e => setOtpCode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:border-amber-500 outline-none"
                  placeholder="123456"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setStep('register')} className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition">
                  Atrás
                </button>
                <button type="submit" disabled={loading || otpCode.length < 6} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-neutral-950 transition disabled:opacity-50">
                  {loading ? 'Verificando...' : 'Acceder y Validar'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
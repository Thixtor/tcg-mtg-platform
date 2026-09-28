// frontend/src/components/auth/UserModal.jsx
// ---------------------------------------------------------
// COMPONENTE: MODAL DE AUTENTICACIÓN Y PERFIL DE JUGADOR
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Plus, KeyRound, ArrowRight, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { getUsersApi, registerUserApi, requestOtpApi, verifyOtpApi } from '../../api/users';

export default function UserModal({ isOpen, onClose, currentUser, onSelectUser }) {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('list'); // 'list' | 'register' | 'otp' | 'direct_phone'

  // Datos de formulario
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
      setUsersList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError('No se pudo cargar la lista de jugadores.');
    } finally {
      setLoading(false);
    }
  };

  // Normalizar teléfono a formato internacional E.164
  const formatPhoneNumber = (phone) => {
    let clean = phone.trim().replace(/[\s\-()]/g, '');
    if (!clean.startsWith('+')) {
      clean = `+57${clean}`; // Por defecto prefijo Colombia
    }
    return clean;
  };

  // 1. Registro formal de nuevo trader
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formattedPhone = formatPhoneNumber(phoneNumber);

    try {
      await registerUserApi({
        username: username.trim(),
        email: email.trim(),
        phone_number: formattedPhone,
        location: 'Medellín / Bello, Antioquia'
      });
      // Tras registrarse con éxito, solicita de inmediato el código OTP
      await handleRequestOtp(formattedPhone);
    } catch (err) {
      console.error('Error registrando usuario:', err);
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Formatear errores de validación 422 de Pydantic
        const validationMsgs = detail.map(d => `${d.loc?.slice(1).join('.')}: ${d.msg}`).join(', ');
        setError(`Error de validación: ${validationMsgs}`);
      } else {
        setError(typeof detail === 'string' ? detail : 'Error al registrar el usuario.');
      }
      setLoading(false);
    }
  };

  // 2. Solicitar OTP
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

  // 3. Validar código OTP y emitir token JWT
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await verifyOtpApi(phoneNumber, otpCode.trim());
      // data = { access_token, token_type, user }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950/60">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            {step === 'list' && 'Seleccionar o Activar Jugador'}
            {step === 'direct_phone' && 'Iniciar Sesión con Celular'}
            {step === 'register' && 'Crear Perfil de Trader'}
            {step === 'otp' && 'Verificación Celular OTP'}
          </h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
              {error}
            </div>
          )}

          {/* VISTA 1: LISTADO DE USUARIOS REGISTRADOS */}
          {step === 'list' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Jugadores en base de datos:</span>
                <button
                  onClick={() => setStep('direct_phone')}
                  className="text-amber-400 hover:underline font-medium text-[11px]"
                >
                  Entrar con mi número &rarr;
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-neutral-500 font-mono gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  Cargando jugadores...
                </div>
              ) : usersList.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                  No hay jugadores registrados aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {usersList.map((u) => (
                    <div 
                      key={u.id}
                      onClick={() => {
                        if (u.phone_number) {
                          handleRequestOtp(u.phone_number);
                        } else {
                          onSelectUser(u, null);
                          onClose();
                        }
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
                          {u.phone_number ? u.phone_number : 'Sin teléfono'} • Rep: {u.reputation_score || 0} pts
                        </div>
                      </div>
                      <span className="text-xs text-amber-500 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg">
                        Iniciar Sesión
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button 
                  onClick={() => setStep('register')}
                  className="w-full py-2.5 border border-dashed border-neutral-700 hover:border-amber-500 hover:bg-neutral-800/50 rounded-xl flex items-center justify-center gap-2 text-neutral-300 hover:text-white transition font-semibold"
                >
                  <Plus className="w-4 h-4" /> Registrar nuevo jugador
                </button>
              </div>
            </div>
          )}

          {/* VISTA 2: INICIO DIRECTO CON CELULAR */}
          {step === 'direct_phone' && (
            <form onSubmit={(e) => { e.preventDefault(); handleRequestOtp(formatPhoneNumber(phoneNumber)); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-neutral-400 font-mono uppercase text-[10px]">Número Celular Registrado</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input 
                    type="tel" 
                    required 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-white focus:border-amber-500 outline-none"
                    placeholder="300 123 4567 o +573001234567"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setStep('list')} className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition">
                  Volver
                </button>
                <button type="submit" disabled={loading || !phoneNumber.trim()} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-neutral-950 transition disabled:opacity-50">
                  {loading ? 'Enviando...' : 'Enviar Código OTP'}
                </button>
              </div>
            </form>
          )}

          {/* VISTA 3: REGISTRO DE NUEVO USUARIO */}
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
                <label className="text-neutral-400 font-mono uppercase text-[10px]">Número Celular (con prefijo o 10 dígitos)</label>
                <input 
                  type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none"
                  placeholder="+573001234567 o 3001234567"
                />
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

          {/* VISTA 4: INGRESO DE OTP */}
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
                <button type="button" onClick={() => setStep('list')} className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition">
                  Atrás
                </button>
                <button type="submit" disabled={loading || otpCode.length < 4} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-neutral-950 transition disabled:opacity-50">
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
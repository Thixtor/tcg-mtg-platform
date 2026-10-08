// ============================================================================
// COMPONENTE: MODAL DE AUTENTICACIÓN DUAL Y ACTIVACIÓN OTP
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Login con Código al Correo (Passwordless) o con Contraseña tradicional.
// - Registro con paso obligatorio de verificación de código OTP de 6 dígitos.
// - Botón de reenvío con temporizador regresivo (cooldown) de 60 segundos.
// ============================================================================

import React, { useState, useEffect } from 'react';
import apiClient from '@/api/client';
import { saveSession } from '@/services/session.service';
import { parseApiError } from '@/utils/apiErrors';
import { Mail, KeyRound, Lock, User, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password'

  // Estados de Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);

  // Estados de Registro
  const [regForm, setRegForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [registeredUserId, setRegisteredUserId] = useState(null);
  const [isVerifyingRegOtp, setIsVerifyingRegOtp] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');

  // Temporizador para reenvío de código (Cooldown 60s)
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null);

  // Efecto para cuenta regresiva del temporizador de reenvío
  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  if (!isOpen) return null;

  const resetState = () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoginOtpSent(false);
    setLoginOtpCode('');
    setIsVerifyingRegOtp(false);
    setRegOtpCode('');
    setRegisteredUserId(null);
    setResendCooldown(0);
  };

  // 1. SOLICITAR CÓDIGO OTP PARA LOGIN
  const handleRequestLoginOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.post('/auth/request-otp', { email: loginEmail.trim() });
      setLoginOtpSent(true);
      setInfoMsg(`Código enviado a ${loginEmail}. Revisa tu bandeja de entrada.`);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error solicitando código de acceso.'));
    } finally {
      setLoading(false);
    }
  };

  // 2. VERIFICAR OTP DE LOGIN Y ENTRAR
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data } = await apiClient.post('/auth/verify-otp', {
        email: loginEmail.trim(),
        code: loginOtpCode.trim()
      });
      saveSession({ access_token: data.access_token, user: data.user });
      if (onLoginSuccess) onLoginSuccess(data.user);
      onClose();
      window.location.reload();
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Código inválido o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  // 3. LOGIN TRADICIONAL CON CONTRASEÑA
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data } = await apiClient.post('/auth/login-password', {
        email: loginEmail.trim(),
        password: loginPassword
      });
      saveSession({ access_token: data.access_token, user: data.user });
      if (onLoginSuccess) onLoginSuccess(data.user);
      onClose();
      window.location.reload();
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Credenciales incorrectas o correo no verificado.'));
    } finally {
      setLoading(false);
    }
  };

  // 4. REGISTRAR USUARIO (Dispara envío de OTP de activación)
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data } = await apiClient.post('/auth/register', {
        username: regForm.username.trim(),
        email: regForm.email.trim(),
        password: regForm.password ? regForm.password : undefined
      });
      setRegisteredUserId(data.id);
      setIsVerifyingRegOtp(true);
      setResendCooldown(60); // Inicia cuenta regresiva de 60s
      setInfoMsg(`Código de 6 dígitos enviado a ${regForm.email}.`);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Error al crear la cuenta. Verifica que los datos sean válidos.'));
    } finally {
      setLoading(false);
    }
  };

  // 5. VALIDAR CÓDIGO TRAS REGISTRO Y ACTIVAR
  const handleVerifyRegistrationOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.post('/auth/verify-email-otp', {
        user_id: registeredUserId,
        code: regOtpCode.trim()
      });
      setInfoMsg('¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.');
      setLoginEmail(regForm.email);
      setTab('login');
      setIsVerifyingRegOtp(false);
      setLoginOtpSent(false);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'Código de activación incorrecto o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  // 6. REENVIAR CÓDIGO DE ACTIVACIÓN
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending || !registeredUserId) return;
    setResending(true);
    setErrorMsg(null);
    try {
      await apiClient.post('/auth/resend-verification-otp', {
        user_id: registeredUserId
      });
      setResendCooldown(60);
      setInfoMsg(`Nuevo código reenviado a ${regForm.email}.`);
    } catch (err) {
      setErrorMsg(parseApiError(err, 'No fue posible reenviar el código. Intenta de nuevo en un momento.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-[#121118] border border-[#2A2733] p-6 sm:p-7 shadow-2xl text-neutral-100">
        
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
        >
          ✕
        </button>

        {/* Encabezado */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            {isVerifyingRegOtp 
              ? 'Verificar Correo' 
              : tab === 'login' 
              ? 'Bienvenido de nuevo' 
              : 'Crear una cuenta'}
          </h2>
          <p className="text-[11px] text-neutral-400 mt-1 font-sans">
            {isVerifyingRegOtp
              ? 'Ingresa el código para activar tu perfil'
              : tab === 'login' 
              ? 'Accede a tus binders y al Black Market' 
              : 'Únete a la comunidad de intercambio de Magic'}
          </p>
        </div>

        {/* Pestañas de Navegación */}
        {!isVerifyingRegOtp && (
          <div className="flex border-b border-[#242129] mb-5">
            <button
              type="button"
              className={`flex-1 py-2.5 font-bold transition-colors border-b-2 cursor-pointer ${
                tab === 'login' 
                  ? 'border-[#E88B00] text-[#E88B00]' 
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
              onClick={() => { setTab('login'); resetState(); }}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 font-bold transition-colors border-b-2 cursor-pointer ${
                tab === 'register' 
                  ? 'border-[#E88B00] text-[#E88B00]' 
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
              onClick={() => { setTab('register'); resetState(); }}
            >
              Registrarse
            </button>
          </div>
        )}

        {/* Mensajes de Alerta */}
        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-950/40 border border-rose-500/50 p-3 text-[11px] text-rose-300">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 rounded-xl bg-amber-950/40 border border-amber-600/50 p-3 text-[11px] text-amber-200">
            {infoMsg}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VISTA 1: PASO DE VERIFICACIÓN TRAS REGISTRO */}
        {/* ------------------------------------------------------------- */}
        {isVerifyingRegOtp ? (
          <form onSubmit={handleVerifyRegistrationOtp} className="space-y-4">
            <div className="p-3.5 bg-[#181622] rounded-2xl border border-white/5 space-y-1">
              <span className="text-white font-bold block">Código de activación</span>
              <p className="text-neutral-400 text-[11px] font-sans leading-relaxed">
                Hemos enviado un código a <strong className="text-amber-400">{regForm.email}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400 block flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#E88B00]" />
                Código de 6 dígitos
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={regOtpCode}
                onChange={(e) => setRegOtpCode(e.target.value)}
                className="w-full text-center tracking-widest text-xl font-bold rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-4 py-2.5 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] py-3 font-black uppercase tracking-wider text-black transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E88B00]/15"
            >
              {loading ? 'Activando...' : 'Verificar y Activar Cuenta'}
            </button>

            {/* Botón Reenviar Código con Cooldown */}
            <div className="pt-2 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || resending}
                className="text-[#E88B00] hover:text-[#FF9D0A] disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer font-bold transition"
              >
                {resending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Reenviando...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-neutral-500" />
                    <span>Reenviar código en {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Reenviar código</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsVerifyingRegOtp(false)}
                className="text-neutral-400 hover:text-white cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Volver
              </button>
            </div>
          </form>
        ) : tab === 'login' ? (
          /* ------------------------------------------------------------- */
          /* VISTA 2: INICIO DE SESIÓN (OTP O CONTRASEÑA) */
          /* ------------------------------------------------------------- */
          <div className="space-y-4">
            <div className="flex bg-[#181622] p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => { setLoginMethod('otp'); setLoginOtpSent(false); setErrorMsg(null); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  loginMethod === 'otp' ? 'bg-[#E88B00] text-black shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Código al Correo
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('password'); setErrorMsg(null); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  loginMethod === 'password' ? 'bg-[#E88B00] text-black shadow' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Contraseña
              </button>
            </div>

            {loginMethod === 'otp' ? (
              !loginOtpSent ? (
                <form onSubmit={handleRequestLoginOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#E88B00]" />
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="usuario@ejemplo.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-3.5 py-2.5 text-white outline-none"
                    />
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Te enviaremos un código de un solo uso para entrar sin contraseña.
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] py-3 font-black uppercase tracking-wider text-black transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E88B00]/15"
                  >
                    {loading ? 'Enviando...' : 'Solicitar Código de Acceso'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#E88B00]" />
                      Código de 6 Dígitos
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={loginOtpCode}
                      onChange={(e) => setLoginOtpCode(e.target.value)}
                      className="w-full text-center tracking-widest text-xl font-bold rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-4 py-2.5 text-white outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] py-3 font-black uppercase tracking-wider text-black transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E88B00]/15"
                  >
                    {loading ? 'Verificando...' : 'Entrar a mi Cuenta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginOtpSent(false)}
                    className="w-full text-center text-[11px] text-neutral-400 hover:text-white pt-1 cursor-pointer"
                  >
                    ← Cambiar de correo
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#E88B00]" />
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@ejemplo.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-3.5 py-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#E88B00]" />
                    Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-3.5 py-2.5 text-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] py-3 font-black uppercase tracking-wider text-black transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E88B00]/15"
                >
                  {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VISTA 3: REGISTRO DE CUENTA */
          /* ------------------------------------------------------------- */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#E88B00]" />
                Nombre de Usuario
              </label>
              <input
                type="text"
                required
                placeholder="planeswalker99"
                value={regForm.username}
                onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                className="w-full rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-3.5 py-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#E88B00]" />
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="usuario@ejemplo.com"
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                className="w-full rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-3.5 py-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E88B00]" />
                Contraseña (Opcional)
              </label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres (o vacío para usar solo OTP)"
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                className="w-full rounded-xl bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] px-3.5 py-2.5 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#E88B00] hover:bg-[#FF9D0A] py-3 font-black uppercase tracking-wider text-black transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-[#E88B00]/15"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta y Verificar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
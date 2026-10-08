// ============================================================================
// COMPONENTE: MODAL DE EDICIÓN DE PERFIL CON VERIFICACIÓN DE EMAIL
// ============================================================================
// ARQUITECTURA & REGLAS:
// - Permite actualizar ubicación, bio y dirección de correo electrónico.
// - Si se modifica el correo, solicita código OTP enviado al nuevo buzón.
// - Integración con geocatálogo local sin errores 404.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  AlignLeft, 
  Mail, 
  KeyRound, 
  Loader2, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import apiClient from '../../api/client';
import { updateMyProfileApi } from '../../api/users.api';
import { 
  getColombiaDepartments, 
  getColombiaMunicipalities 
} from '../../services/colombiaGeoService';

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [departments, setDepartments] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  // Estados del formulario
  const [selectedDept, setSelectedDept] = useState('Antioquia');
  const [selectedMuni, setSelectedMuni] = useState('Medellín');
  const [zoneDetails, setZoneDetails] = useState('');
  const [bio, setBio] = useState('');
  
  // Gestión de correo y OTP
  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [isVerifyingEmailStep, setIsVerifyingEmailStep] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailSuccessMsg, setEmailSuccessMsg] = useState(null);

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const initGeo = async () => {
      setLoadingGeo(true);
      const depts = await getColombiaDepartments();
      if (!isMounted) return;
      setDepartments(depts);

      const currentLoc = user?.location || user?.city || '';
      let initialDept = 'Antioquia';
      let initialMuni = 'Medellín';
      let initialZone = '';

      if (currentLoc) {
        const parts = currentLoc.split(',');
        const candidateMuni = parts[0]?.trim();
        const candidateRest = parts[1]?.trim() || '';

        const foundDept = depts.find(d => 
          candidateRest.toLowerCase().includes(d.toLowerCase()) || 
          currentLoc.toLowerCase().includes(d.toLowerCase())
        );
        if (foundDept) initialDept = foundDept;

        const zoneMatch = currentLoc.match(/\((.*?)\)/);
        if (zoneMatch) initialZone = zoneMatch[1];
        if (candidateMuni) initialMuni = candidateMuni;
      }

      setSelectedDept(initialDept);
      setZoneDetails(initialZone);

      const munis = await getColombiaMunicipalities(initialDept);
      if (!isMounted) return;
      setMunicipalities(munis);
      
      const foundMuni = munis.find(m => m.toLowerCase() === initialMuni.toLowerCase());
      setSelectedMuni(foundMuni || munis[0] || initialMuni);

      setLoadingGeo(false);
    };

    setBio(user?.bio || '');
    setEmail(user?.email || '');
    setInitialEmail(user?.email || '');
    setIsVerifyingEmailStep(false);
    setEmailOtpCode('');
    setEmailSuccessMsg(null);
    setError(null);

    initGeo();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  const handleDepartmentChange = async (dept) => {
    setSelectedDept(dept);
    setLoadingGeo(true);
    const munis = await getColombiaMunicipalities(dept);
    setMunicipalities(munis);
    setSelectedMuni(munis[0] || '');
    setLoadingGeo(false);
  };

  if (!isOpen) return null;

  // Confirmar el código OTP del nuevo correo
  const handleConfirmEmailOtp = async (e) => {
    e.preventDefault();
    if (!emailOtpCode.trim()) {
      setError('Ingresa el código OTP de 6 dígitos.');
      return;
    }

    setLoadingSubmit(true);
    setError(null);

    try {
      const { data } = await apiClient.post('/users/me/confirm-email-change', {
        code: emailOtpCode.trim()
      });

      setEmailSuccessMsg('¡Correo actualizado y verificado con éxito!');
      const updatedUser = { ...(user || {}), email: data.email };
      
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch {}

      onProfileUpdated?.(updatedUser);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Código inválido o expirado.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // Guardar perfil (y disparar OTP de correo si cambió)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError(null);

    const finalLocation = zoneDetails.trim()
      ? `${selectedMuni}, ${selectedDept} (${zoneDetails.trim()})`
      : `${selectedMuni}, ${selectedDept}`;

    const profilePayload = {
      location: finalLocation,
      bio: bio.trim()
    };

    try {
      // 1. Guardar cambios de ubicación y bio
      const updatedProfile = await updateMyProfileApi(profilePayload);
      let mergedUser = {
        ...(user || {}),
        ...(updatedProfile || {}),
        location: finalLocation,
        bio: bio.trim()
      };

      // 2. Si el correo fue modificado, solicitar OTP
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail && cleanEmail !== initialEmail.toLowerCase()) {
        await apiClient.post('/users/me/request-email-change', {
          new_email: cleanEmail
        });

        setIsVerifyingEmailStep(true);
        setLoadingSubmit(false);
        return;
      }

      try {
        localStorage.setItem('user', JSON.stringify(mergedUser));
      } catch {}

      onProfileUpdated?.(mergedUser);
      onClose();
    } catch (err) {
      console.error('[EditProfileModal] Error:', err);
      const detail = err.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail.map((d) => `${d.loc ? d.loc.slice(-1)[0] : 'Campo'}: ${d.msg}`).join(', ')
          : (typeof detail === 'string' ? detail : 'Error al guardar los cambios del perfil.')
      );
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-mono text-xs animate-fadeIn">
      <div className="bg-[#121118] border border-[#2A2733] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2733] bg-[#181622]">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#E88B00]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {isVerifyingEmailStep ? 'Verificación de Correo' : 'Editar Perfil y Ubicación'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {emailSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{emailSuccessMsg}</span>
          </div>
        )}

        {/* PASO 2: VERIFICACIÓN DEL CÓDIGO OTP */}
        {isVerifyingEmailStep ? (
          <form onSubmit={handleConfirmEmailOtp} className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-[#181622] border border-[#2A2733] space-y-2">
              <span className="text-white font-bold block text-sm">Confirma tu nuevo correo</span>
              <p className="text-neutral-400 leading-relaxed text-[11px] font-sans">
                Hemos generado un código de 6 dígitos para <strong className="text-amber-400">{email}</strong>. 
                Si estás en Docker local, revisa los logs de tu backend (`docker compose logs -f backend`).
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-400 block flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#E88B00]" />
                Código OTP de 6 dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-white font-bold outline-none"
              />
            </div>

            <div className="pt-3 flex gap-2 justify-end border-t border-[#242129]">
              <button
                type="button"
                onClick={() => setIsVerifyingEmailStep(false)}
                className="px-4 py-2 bg-[#181622] hover:bg-[#242129] text-neutral-300 font-bold rounded-xl transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={loadingSubmit}
                className="px-6 py-2 bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E88B00]/15"
              >
                {loadingSubmit && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loadingSubmit ? 'Validando...' : 'Verificar y Guardar'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* PASO 1: FORMULARIO PRINCIPAL DE EDICIÓN */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[82vh]">
            
            {/* Campo de Correo Electrónico */}
            <div className="space-y-1">
              <label className="text-neutral-400 uppercase text-[10px] font-bold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#E88B00]" />
                <span>Correo Electrónico</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu_correo@ejemplo.com"
                className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-2 text-white outline-none transition text-xs"
              />
              <span className="text-[9px] text-neutral-500 block">
                Si modificas el correo, deberás confirmarlo con un código OTP antes de aplicarse.
              </span>
            </div>

            {/* Ubicación Geográfica */}
            <div className="space-y-3 pt-2 border-t border-[#242129]">
              <div className="flex items-center justify-between">
                <label className="text-neutral-400 uppercase text-[10px] font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E88B00]" />
                  <span>Ubicación Comercial (Colombia)</span>
                </label>
                {loadingGeo && (
                  <span className="text-[10px] text-[#E88B00] flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Cargando zonas...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] text-neutral-500 mb-1 block uppercase font-bold">Departamento</span>
                  <select
                    disabled={loadingGeo || departments.length === 0}
                    value={selectedDept}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-2 text-white outline-none transition disabled:opacity-50 cursor-pointer"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#121118] text-white">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-500 mb-1 block uppercase font-bold">Municipio / Ciudad</span>
                  <select
                    disabled={loadingGeo || municipalities.length === 0}
                    value={selectedMuni}
                    onChange={(e) => setSelectedMuni(e.target.value)}
                    className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-2 text-white outline-none transition disabled:opacity-50 cursor-pointer"
                  >
                    {municipalities.map((muni) => (
                      <option key={muni} value={muni} className="bg-[#121118] text-white">
                        {muni}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 mb-1 block uppercase font-bold">Punto de Encuentro Habitual (Opcional)</span>
                <input
                  type="text"
                  placeholder="Ej: Tienda local MTG, Estación de metro, Centro Comercial..."
                  value={zoneDetails}
                  onChange={(e) => setZoneDetails(e.target.value)}
                  className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl px-3 py-2 text-white placeholder-neutral-600 outline-none transition text-xs"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5 pt-2 border-t border-[#242129]">
              <label className="text-neutral-400 uppercase text-[10px] font-bold flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-[#E88B00]" />
                <span>Bio / Condiciones de Intercambio</span>
              </label>
              <textarea 
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ej: Juego Commander y Modern. Disponible fines de semana en tiendas locales."
                className="w-full bg-[#181622] border border-[#2A2733] focus:border-[#E88B00] rounded-xl p-3 text-white placeholder-neutral-600 outline-none resize-none leading-relaxed text-xs font-sans"
              />
            </div>

            {/* Botones de acción */}
            <div className="pt-3 flex gap-2 justify-end border-t border-[#242129]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#181622] hover:bg-[#242129] text-neutral-300 font-bold rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loadingSubmit}
                className="px-6 py-2 bg-[#E88B00] hover:bg-[#FF9D0A] disabled:opacity-40 text-black font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E88B00]/15"
              >
                {loadingSubmit && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{loadingSubmit ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
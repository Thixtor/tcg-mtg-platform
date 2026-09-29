// ---------------------------------------------------------
// COMPONENTE: MODAL DE EDICIÓN DE PERFIL P2P (LIMPIO)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  AlignLeft, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { updateMyProfileApi } from '../../api/users';
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

  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchDepts = async () => {
      setLoadingGeo(true);
      const depts = await getColombiaDepartments();
      if (!isMounted) return;
      setDepartments(depts);

      // Parsear ubicación previa del usuario
      const currentLoc = user?.location || '';
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
    setError(null);

    fetchDepts();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setError(null);

    // Ubicación estructurada: "Municipio, Departamento (Zona)"
    const finalLocation = zoneDetails.trim()
      ? `${selectedMuni}, ${selectedDept} (${zoneDetails.trim()})`
      : `${selectedMuni}, ${selectedDept}`;

    const payload = {
      location: finalLocation,
      bio: bio.trim()
    };

    try {
      const updatedResponse = await updateMyProfileApi(payload);

      const mergedUser = {
        ...(user || {}),
        ...(updatedResponse || {}),
        location: finalLocation,
        bio: bio.trim()
      };

      try {
        localStorage.setItem('user', JSON.stringify(mergedUser));
        localStorage.setItem('mtg_dev_user', JSON.stringify(mergedUser));
      } catch (errStorage) {
        console.warn('No se pudo guardar la sesión en storage:', errStorage);
      }

      if (onProfileUpdated) {
        onProfileUpdated(mergedUser);
      }
      onClose();
    } catch (err) {
      console.error('Error actualizando perfil:', err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-white">Editar Ubicación y Perfil</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Bloque: Ubicación Geográfica Oficial */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-neutral-400 uppercase font-mono text-[10px] font-bold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-500" /> Ubicación Oficial (DIVIPOLA / DANE)
              </label>
              {loadingGeo && (
                <span className="text-[10px] text-amber-500 flex items-center gap-1 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" /> Cargando datos...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-500 mb-1 block">Departamento</span>
                <select
                  disabled={loadingGeo || departments.length === 0}
                  value={selectedDept}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none transition disabled:opacity-50"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-neutral-500 mb-1 block">Ciudad / Municipio</span>
                <select
                  disabled={loadingGeo || municipalities.length === 0}
                  value={selectedMuni}
                  onChange={(e) => setSelectedMuni(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none transition disabled:opacity-50"
                >
                  {municipalities.map((muni) => (
                    <option key={muni} value={muni}>{muni}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-neutral-500 mb-1 block">Punto / Zona de Encuentro Habitual (Opcional)</span>
              <input
                type="text"
                placeholder="Ej: Estación Niquía, CC Mayorca, Tienda local MTG..."
                value={zoneDetails}
                onChange={(e) => setZoneDetails(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          {/* Bloque: Bio / Políticas Comerciales */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
            <label className="text-neutral-400 uppercase font-mono text-[10px] font-bold flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-neutral-500" /> Bio / Descripción Comercial
            </label>
            <textarea 
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Formatos que juegas (Commander, Modern), horarios disponibles, políticas de cambio..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-600 focus:border-amber-500 outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-3 flex gap-2 justify-end border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loadingSubmit}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl transition flex items-center gap-2"
            >
              {loadingSubmit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
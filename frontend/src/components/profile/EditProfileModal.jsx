// ---------------------------------------------------------
// COMPONENTE: MODAL DE EDICIÓN DE PERFIL EN VIVO
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, User, MapPin, AlignLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { updateMyProfileApi } from '../../api/users';

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updated = await updateMyProfileApi({
        bio: bio.trim(),
        location: location.trim()
      });
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      onClose();
    } catch (err) {
      console.error('Error actualizando perfil:', err);
      setError(err.response?.data?.detail || 'No se pudo actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs font-sans animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-white">Editar Perfil P2P</h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-neutral-400 uppercase font-mono text-[10px] font-bold flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-500" /> Ubicación Comercial
            </label>
            <input 
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="ej: Bello, Antioquia / Medellín"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-neutral-400 uppercase font-mono text-[10px] font-bold flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-neutral-500" /> Bio / Descripción Comercial
            </label>
            <textarea 
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntale a otros jugadores qué formatos juegas, tus condiciones de entrega o políticas de cambio..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-amber-500 outline-none resize-none leading-relaxed"
            />
          </div>

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
              disabled={loading}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// ---------------------------------------------------------
// COMPONENTE: MODAL CREAR NUEVA COLECCIÓN (BINDER)
// ---------------------------------------------------------
import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

export default function CreateCollectionModal({ isOpen, onClose, onCreate, currentCount = 0 }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la colección es obligatorio.');
      return;
    }

    if (currentCount >= 10) {
      setError('Has alcanzado el límite máximo de 10 colecciones.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreate({ name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la colección.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold text-lg">
            <FolderPlus className="w-5 h-5 text-amber-500" />
            <span>Nuevo Binder / Colección</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Nombre de la Carpeta *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Binder Trade Modern, Comunes Foil..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Descripción (Opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas sobre el contenido, propósito o condiciones de cambio..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
            <span>Límite del usuario: {currentCount} / 10 binders</span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || currentCount >= 10}
              className="px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Creando...' : 'Crear Colección'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
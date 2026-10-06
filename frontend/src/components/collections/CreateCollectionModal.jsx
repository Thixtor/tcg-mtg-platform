// ---------------------------------------------------------
// MODAL: CREAR COLECCIÓN (ACCESIBLE, SIN CORB Y HOMOLOGADO)
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Sparkles, AlertCircle, Globe, Lock } from 'lucide-react';

export default function CreateCollectionModal({
  isOpen,
  onClose,
  onCreate,
  currentCount = 0
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublicTrade, setIsPublicTrade] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIsPublicTrade(true);
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentCount >= 10) {
      setErrorMsg('Has alcanzado el límite máximo de 10 colecciones.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Debes ingresar un nombre para la colección.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        is_public_trade: isPublicTrade
      });
      onClose();
    } catch (err) {
      setErrorMsg('Error al guardar la colección. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Crear Nueva Colección</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Capacidad: {currentCount} / 10 colecciones
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario con IDs y Labels Vinculados */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="collection-name" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Nombre de la Colección *
            </label>
            <input
              id="collection-name"
              name="collectionName"
              type="text"
              placeholder="Ej. Cartas para Trade, Modern Staple, Binders..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="collection-description" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Descripción o Propósito
            </label>
            <textarea
              id="collection-description"
              name="collectionDescription"
              rows={3}
              placeholder="Notas sobre el estado físico de las cartas, disponibilidad para trade o ubicación..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 resize-none transition"
            />
          </div>

          {/* Toggle de Privacidad de Trade */}
          <div className="pt-2">
            <label htmlFor="collection-trade-visibility" className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold mb-2">
              Visibilidad en Marketplace
            </label>
            <div
              onClick={() => setIsPublicTrade(!isPublicTrade)}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 cursor-pointer flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                {isPublicTrade ? (
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs text-white block">
                    {isPublicTrade ? 'Colección Pública para Trade' : 'Colección Privada'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isPublicTrade
                      ? 'Los ejemplares marcados se mostrarán en el Muro de Trade.'
                      : 'Solo tú podrás ver y auditar estas cartas.'}
                  </span>
                </div>
              </div>

              <input
                id="collection-trade-visibility"
                name="isPublicTrade"
                type="checkbox"
                checked={isPublicTrade}
                onChange={(e) => setIsPublicTrade(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Pie de Acciones */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={currentCount >= 10 || isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg active:scale-95 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Colección'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
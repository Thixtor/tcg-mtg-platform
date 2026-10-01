// ---------------------------------------------------------
// COMPONENTE: MODAL CREAR NUEVA CARPETA / COLECCIÓN P2P
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderPlus, 
  AlertCircle, 
  Search, 
  Sparkles, 
  Check, 
  Globe, 
  Lock,
  Layers
} from 'lucide-react';

export default function CreateCollectionModal({ isOpen, onClose, onCreate, currentCount = 0 }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublicTrade, setIsPublicTrade] = useState(true);
  
  // Portada seleccionada de Scryfall
  const [coverSearch, setCoverSearch] = useState('');
  const [coverResults, setCoverResults] = useState([]);
  const [selectedCover, setSelectedCover] = useState(null);
  const [isSearchingCover, setIsSearchingCover] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIsPublicTrade(true);
      setCoverSearch('');
      setCoverResults([]);
      setSelectedCover(null);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Búsqueda en Scryfall para la portada
  useEffect(() => {
    if (coverSearch.trim().length < 3) {
      setCoverResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCover(true);
      try {
        const query = encodeURIComponent(coverSearch.trim());
        const res = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=edhrec`);
        if (res.ok) {
          const data = await res.json();
          setCoverResults(data.data?.slice(0, 6) || []);
        } else {
          setCoverResults([]);
        }
      } catch (err) {
        console.error('[CreateCollectionModal] Error buscando portada en Scryfall:', err);
      } finally {
        setIsSearchingCover(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [coverSearch]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la carpeta es obligatorio.');
      return;
    }

    if (currentCount >= 10) {
      setError('Has alcanzado el límite máximo permitido de 10 carpetas.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const artCrop = selectedCover?.image_uris?.art_crop 
        || selectedCover?.card_faces?.[0]?.image_uris?.art_crop 
        || null;

      await onCreate({
        name: name.trim(),
        description: description.trim() || null,
        is_public_trade: isPublicTrade,
        art_url: artCrop
      });

      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la carpeta en el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Nueva Carpeta de Colección</h3>
              <p className="text-xs text-neutral-400 font-mono">
                Capacidad: {currentCount} / 10 carpetas asignadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Nombre de la Carpeta *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Carpeta de Intercambio Modern, Comunes Foil, Colección Vintage..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block font-semibold">
              Descripción o Condiciones de Cambio (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas sobre el estado físico de las cartas, formatos o preferencias de trade..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Selector de Visibilidad / Privacidad */}
          <div className="space-y-2 p-3.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-300 font-bold block">
                  Disponibilidad para Intercambio
                </span>
                <span className="text-[11px] text-neutral-400">
                  {isPublicTrade 
                    ? 'Pública en el Muro de Trade y visible en tu perfil para otros coleccionistas.' 
                    : 'Privada. Solo tú podrás ver las cartas de esta carpeta.'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPublicTrade(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isPublicTrade 
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Pública</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublicTrade(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    !isPublicTrade 
                      ? 'bg-neutral-800 text-white font-bold shadow-xs' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privada</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selección de Portada Panorámica de Carta */}
          <div className="space-y-3 bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-amber-500 block font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Ilustración de Portada (Scryfall)
              </label>
              {selectedCover && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Asignada: {selectedCover.name}
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cualquier carta para la portada (ej: Black Lotus, Sol Ring, Ragavan)..."
                value={coverSearch}
                onChange={(e) => setCoverSearch(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-amber-500 transition"
              />
            </div>

            {isSearchingCover && (
              <div className="text-center py-2 text-neutral-500 font-mono text-[11px]">
                Consultando ilustraciones en Scryfall...
              </div>
            )}

            {coverResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {coverResults.map((card) => {
                  const imgUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;
                  const isSelected = selectedCover?.id === card.id;

                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCover(card)}
                      className={`group cursor-pointer rounded-lg border p-1.5 transition flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                      }`}
                    >
                      <div className="w-full aspect-[2.5/3.5] rounded overflow-hidden bg-neutral-950 relative">
                        <img src={imgUrl} alt={card.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        {isSelected && (
                          <span className="absolute top-1 right-1 bg-amber-500 text-neutral-950 p-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-200 text-center truncate w-full">
                        {card.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Pie de modal */}
        <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Inventario físico local</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || currentCount >= 10}
              className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-95"
            >
              {isSubmitting ? 'Guardando...' : 'Crear Carpeta'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
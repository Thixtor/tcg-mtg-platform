// ---------------------------------------------------------
// VISTA: GESTIÓN DE BINDERS Y COLECCIONES P2P
// ---------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderPlus, 
  Folder, 
  Layers, 
  ArrowLeft, 
  Loader2, 
  RefreshCw,
  AlertCircle,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  getMyCollectionsApi, 
  getUserCollectionsApi, 
  createMyCollectionApi, 
  getCollectionCardsApi 
} from '@/api/collections';
import { getAccessToken } from '@/services/session.service';
import CreateCollectionModal from '@/components/collections/CreateCollectionModal';

/**
 * Vista principal para la gestión de binders, inventario personal e intercambio.
 * @param {Object} props
 * @param {string|number} [props.userId] - Identificador de usuario si se navega en modo visitante.
 * @param {Function} [props.onOpenAuthModal] - Callback para invocar el modal unificado de autenticación.
 */
export default function BindersPage({ userId, onOpenAuthModal }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para la colección activa en inspección
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionCards, setCollectionCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  // Control del modal de creación
  const [isModalOpen, setIsModalOpen] = useState(false);

  const token = getAccessToken();

  // 1. Cargar colecciones (vía JWT o por userId si se visita a otro coleccionista)
  const fetchCollections = useCallback(async () => {
    if (!userId && !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = userId 
        ? await getUserCollectionsApi(userId) 
        : await getMyCollectionsApi();
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Binders] Error al cargar colecciones:', err);
      setError(err.response?.data?.detail || 'Error al cargar las colecciones del usuario.');
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // 2. Cargar cartas de una colección seleccionada
  const handleSelectCollection = async (collection) => {
    setSelectedCollection(collection);
    try {
      setLoadingCards(true);
      const cards = await getCollectionCardsApi(collection.id);
      setCollectionCards(Array.isArray(cards) ? cards : []);
    } catch (err) {
      console.warn('[Binders] Error al cargar cartas de la colección:', err);
      setCollectionCards([]);
    } finally {
      setLoadingCards(false);
    }
  };

  // 3. Crear una nueva colección propia vía endpoint seguro
  const handleCreateCollection = async (payload) => {
    try {
      const newCollection = await createMyCollectionApi(payload);
      setCollections((prev) => [...prev, newCollection]);
      setIsModalOpen(false);
    } catch (err) {
      console.warn('[Binders] Error creando colección:', err);
      alert(err.response?.data?.detail || 'No se pudo crear el binder.');
    }
  };

  // Vista no autenticada
  if (!userId && !token && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Inicia sesión para gestionar tus carpetas</h2>
        <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
          Para ver tus binders, registrar cartas físicas y publicar intercambios necesitas autenticarte con tu cuenta.
        </p>
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition shadow-md"
          >
            Iniciar Sesión / Registrarse
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* VISTA DETALLADA DE UNA COLECCIÓN */}
      {selectedCollection ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <button
              onClick={() => setSelectedCollection(null)}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a mis binders</span>
            </button>
            <span className="text-xs text-neutral-500 font-mono">
              ID: {selectedCollection.id}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Folder className="w-6 h-6 text-amber-500" />
              {selectedCollection.name}
            </h2>
            {selectedCollection.description && (
              <p className="text-neutral-400 text-sm mt-1">{selectedCollection.description}</p>
            )}
          </div>

          {loadingCards ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
              <p className="text-sm">Cargando cartas del binder...</p>
            </div>
          ) : collectionCards.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/50 border border-dashed border-neutral-800 rounded-xl">
              <Layers className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-300">Este binder está vacío</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
                Puedes buscar cartas en el Catálogo y agregarlas con su condición física, acabado foil y notas de trade.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {collectionCards.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between hover:border-neutral-700 transition"
                >
                  <div className="aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-neutral-950 relative mb-3">
                    {item.card_catalog?.image_url ? (
                      <img 
                        src={item.card_catalog.image_url} 
                        alt={item.card_catalog.name}
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-neutral-600">
                        Sin Imagen
                      </div>
                    )}
                    {item.is_foil && (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                        <Sparkles className="w-2.5 h-2.5" /> FOIL
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-neutral-100 truncate" title={item.card_catalog?.name}>
                      {item.card_catalog?.name || 'Carta Desconocida'}
                    </h4>
                    
                    {/* Atribución de artista cumpliendo Scryfall / WotC Fan Content */}
                    {item.card_catalog?.artist && (
                      <p className="text-[10px] text-neutral-500 truncate">
                        Ilustración: {item.card_catalog.artist}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-neutral-400 mt-2">
                      <span>Condición: <strong className="text-neutral-200">{item.condition}</strong></span>
                      <span>Cant: <strong className="text-neutral-200">x{item.quantity}</strong></span>
                    </div>

                    {item.is_for_trade && (
                      <div className="mt-2 text-[11px] bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 px-2 py-0.5 rounded text-center font-medium">
                        En Trade
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VISTA DE CARPETAS / BINDERS DEL USUARIO */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-amber-500" />
                Mis Colecciones & Binders
              </h1>
              <p className="text-neutral-400 text-sm mt-0.5">
                Organiza tu inventario físico, gestiona copias para intercambio y prepara tus cartas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchCollections}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 border border-neutral-800 transition"
                title="Refrescar colecciones"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={collections.length >= 10}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm transition"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Nueva Colección ({collections.length}/10)</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-amber-500" />
              <p className="text-sm">Cargando binders...</p>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-16 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-xl">
              <FolderPlus className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-neutral-300">Aún no tienes colecciones</h3>
              <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1 mb-4">
                Crea tu primera carpeta (hasta 10) para clasificar tus cartas de juego, cambios o colección personal.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition"
              >
                Crear mi primer Binder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {collections.map((col) => (
                <div
                  key={col.id}
                  onClick={() => handleSelectCollection(col)}
                  className="group bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/50 rounded-xl p-5 cursor-pointer transition shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 bg-neutral-800 group-hover:bg-amber-500/10 rounded-lg text-neutral-300 group-hover:text-amber-500 transition">
                        <Folder className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400">
                        Abrir &rarr;
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg text-white group-hover:text-amber-400 transition truncate">
                      {col.name}
                    </h3>
                    <p className="text-sm text-neutral-400 line-clamp-2">
                      {col.description || 'Sin descripción adicional.'}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                    <span>Binder de inventario</span>
                    <span className="font-medium text-neutral-400">Explorar cartas</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para crear nueva colección */}
      <CreateCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCollection}
        currentCount={collections.length}
      />
    </div>
  );
}
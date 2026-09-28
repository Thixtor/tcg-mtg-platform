// ---------------------------------------------------------
// PÁGINA: MURO DE INTERCAMBIOS P2P & MATCHMAKING LOCAL
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Store,
  Star,
  CheckCircle2,
  ShieldCheck,
  Search,
  Layers,
  Sparkles,
  MapPin,
  Clock,
  Send,
  X,
  Flame,
  AlertCircle
} from 'lucide-react';
import { getTradeMarketApi, getMyTradeMatchesApi } from '../api/trade';

export default function TradeWallPage({ currentUser, onNavigateToCatalog }) {
  const [marketCards, setMarketCards] = useState([]);
  const [mutualMatches, setMutualMatches] = useState([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalNote, setProposalNote] = useState('');
  const [proposalSuccess, setProposalSuccess] = useState('');

  const [searchFilter, setSearchFilter] = useState('');
  const [onlyFoils, setOnlyFoils] = useState(false);
  const [nearMintOnly, setNearMintOnly] = useState(false);

  // 1. Cargar cartas disponibles del mercado global
  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoadingMarket(true);

    getTradeMarketApi({ limit: 40 }, { signal: ctrl.signal })
      .then((data) => setMarketCards(data || []))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Error al cargar cartas de trade:', err);
        }
      })
      .finally(() => setIsLoadingMarket(false));

    return () => ctrl.abort();
  }, []);

  // 2. Cargar cruces algorítmicos si el usuario está autenticado
  useEffect(() => {
    if (!currentUser) {
      setMutualMatches([]);
      return;
    }

    const ctrl = new AbortController();
    setIsLoadingMatches(true);

    getMyTradeMatchesApi({ signal: ctrl.signal })
      .then((data) => setMutualMatches(data || []))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('Error al cargar cruces:', err);
        }
      })
      .finally(() => setIsLoadingMatches(false));

    return () => ctrl.abort();
  }, [currentUser]);

  // Filtrado reactivo en cliente sobre las cartas del mercado
  const filteredMarketCards = marketCards.filter((card) => {
    if (onlyFoils && !card.is_foil) return false;
    if (nearMintOnly && card.condition !== 'NM') return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = card.card_name.toLowerCase().includes(q);
      const matchOwner = card.owner_username.toLowerCase().includes(q);
      const matchSet = (card.set_code || '').toLowerCase().includes(q);
      if (!matchName && !matchOwner && !matchSet) return false;
    }
    return true;
  });

  const handleOpenProposal = (match) => {
    setSelectedProposal(match);
    setProposalNote(`Hola ${match.username}, me interesan las cartas de tu colección para revisión presencial.`);
    setProposalSuccess('');
  };

  const handleSendProposal = () => {
    setProposalSuccess(`¡Propuesta enviada con éxito a @${selectedProposal.username}! Te notificaremos cuando responda.`);
    setTimeout(() => {
      setSelectedProposal(null);
      setProposalSuccess('');
    }, 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6 text-neutral-100 font-sans">
      
      {/* 1. TASA Y ESTADO P2P */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-xl px-4 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4 overflow-x-auto text-neutral-400">
          <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1 rounded border border-neutral-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-neutral-200 font-semibold">MOTOR SCRYFALL P2P</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-neutral-500">TASA TRM:</span>
            <span className="text-amber-500 font-bold">1 USD ≈ 3,980 COP</span>
          </div>
          <span className="text-neutral-700">•</span>
          <div>
            <span className="text-neutral-500">Cartas en Trade:</span>{' '}
            <span className="text-neutral-200 font-bold">{marketCards.length} activas</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
          <ShieldCheck className="w-4 h-4" />
          <span>Intercambios presenciales protegidos</span>
        </div>
      </section>

      {/* 2. BARRA DE FILTROS */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs">
              <MapPin className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Ubicación</span>
                <span className="font-bold text-white">Bello • Medellín</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOnlyFoils(!onlyFoils)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                onlyFoils
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Solo Foils
            </button>
            <button
              onClick={() => setNearMintOnly(!nearMintOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition ${
                nearMintOnly
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Solo Near Mint (NM)
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por carta, edición o @usuario..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 transition"
          />
        </div>
      </section>

      {/* 3. CONSOLA PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* COLUMNA IZQUIERDA: CRUCES MUTUOS (7 COLS) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Cruces Mutuos (Mutual Matches)</h2>
                <p className="text-xs text-neutral-400">Coincidencias entre tu Wishlist y cartas en trade</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              {mutualMatches.length} Cruces
            </span>
          </div>

          {!currentUser ? (
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-400 space-y-2">
              <p>Inicia sesión con tu usuario para descubrir coincidencias automáticas con tu Wishlist.</p>
            </div>
          ) : isLoadingMatches ? (
            <div className="py-8 text-center text-xs font-mono text-neutral-500">Calculando cruces de trade...</div>
          ) : mutualMatches.length === 0 ? (
            <div className="p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500 space-y-2">
              <Flame className="w-6 h-6 text-neutral-600 mx-auto" />
              <p>No hay cruces directos en este momento. Agrega más cartas a tu Wishlist y marca cartas para trade en tus colecciones.</p>
            </div>
          ) : (
            mutualMatches.map((match) => (
              <article
                key={match.user_id}
                className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 backdrop-blur-md space-y-4 transition shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-neutral-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 flex items-center justify-center font-bold font-mono text-amber-500 uppercase">
                      {match.username.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">@{match.username}</span>
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {match.reputation_score} pts
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400">Punto de encuentro: Área Metropolitana</span>
                    </div>
                  </div>

                  {match.is_mutual_match && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Coincidencia Mutua
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/60">
                  <div className="space-y-2">
                    <span className="font-mono text-emerald-400 font-semibold uppercase text-[10px]">
                      Tiene de tu Wishlist ({match.they_have.length}):
                    </span>
                    <div className="space-y-1">
                      {match.they_have.map((c) => (
                        <div key={c.scryfall_card_id} className="text-xs text-neutral-200 truncate">
                          • {c.card_name} {c.is_foil ? '(Foil)' : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-amber-500 font-semibold uppercase text-[10px]">
                      Busca de lo que ofreces ({match.they_want.length}):
                    </span>
                    <div className="space-y-1">
                      {match.they_want.map((c) => (
                        <div key={c.scryfall_card_id} className="text-xs text-neutral-200 truncate">
                          • {c.card_name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => handleOpenProposal(match)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/10"
                  >
                    <Send className="w-3.5 h-3.5" /> Iniciar Propuesta
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* COLUMNA DERECHA: BINDERS PÚBLICOS / FEED REAL (5 COLS) */}
        <aside className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Cartas en Binders Locales</h2>
                <p className="text-xs text-neutral-400">Cartas activas para intercambio</p>
              </div>
            </div>
          </div>

          {isLoadingMarket ? (
            <div className="py-12 text-center text-xs font-mono text-neutral-500">Cargando catálogo de trade...</div>
          ) : filteredMarketCards.length === 0 ? (
            <div className="p-8 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-500">
              No hay cartas que coincidan con los filtros aplicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMarketCards.map((item) => (
                <div
                  key={item.user_card_id}
                  className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3 backdrop-blur-md flex flex-col justify-between space-y-2 group transition"
                >
                  <div>
                    <div className="aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-neutral-950 relative mb-2">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.card_name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      ) : (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-600 text-xs">Sin Arte</div>
                      )}
                      {item.set_code && (
                        <span className="absolute top-1.5 left-1.5 text-[8px] font-mono px-1 py-0.5 rounded bg-neutral-950/80 text-neutral-300 border border-neutral-800 uppercase">
                          {item.set_code}
                        </span>
                      )}
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700">
                        FOR TRADE
                      </span>
                      {item.is_foil && (
                        <span className="absolute bottom-1.5 right-1.5 text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500 text-neutral-950">
                          FOIL
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{item.card_name}</span>
                        <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-300">{item.condition}</span>
                      </div>

                      {item.trade_notes && (
                        <div className="bg-neutral-950/70 p-2 rounded border border-neutral-800/60 text-[10px]">
                          <span className="text-amber-400 font-mono block uppercase text-[9px]">Notas:</span>
                          <p className="text-neutral-400 truncate">{item.trade_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400 truncate">
                      @{item.owner_username}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      ★ {item.owner_reputation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

      </div>

      {/* 4. MODAL INTERACTIVO DE PROPUESTA */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Mesa de Negociación • @{selectedProposal.username}</h3>
                <span className="text-xs text-neutral-400 font-mono">
                  Reputación: {selectedProposal.reputation_score} pts
                </span>
              </div>
              <button
                onClick={() => setSelectedProposal(null)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {proposalSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-center font-mono">
                  {proposalSuccess}
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
                      Punto de Encuentro Sugerido (Tienda LGS)
                    </label>
                    <select className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-neutral-200 outline-none focus:border-amber-500">
                      <option>LGS Dragon Hobby • Bello</option>
                      <option>La Cueva del Geek • Medellín / Estadio</option>
                      <option>Comic Store Viva Envigado • Envigado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-mono text-neutral-400 block font-semibold">
                      Mensaje para la contraparte
                    </label>
                    <textarea
                      rows={3}
                      value={proposalNote}
                      onChange={(e) => setProposalNote(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-neutral-200 outline-none focus:border-amber-500 resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {!proposalSuccess && (
              <div className="px-6 py-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Acuerdos presenciales verificados
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProposal(null)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendProposal}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-amber-500/10"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Propuesta P2P
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
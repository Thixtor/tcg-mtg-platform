// ---------------------------------------------------------
// COMPONENTE: CABECERA Y POLÍTICA DE PRECIOS P2P
// ---------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Radio, 
  Star, 
  Layers, 
  Sparkles, 
  ArrowUpDown, 
  Repeat,
  Check,
  Truck,
  Users,
  Store,
  DollarSign
} from 'lucide-react';
import { updateMyProfileApi } from '../../api/users.api';

const STORES = ['Card Kingdom', 'TCGPlayer', 'Cardmarket'];

export default function ProfileHeader({ user, onProfileUpdated }) {
  if (!user) return null;

  // Estados interactivos para modalidades de entrega
  const [allowsMeetup, setAllowsMeetup] = useState(user.allows_meetup !== false);
  const [allowsShipping, setAllowsShipping] = useState(user.allows_shipping === true);

  // Estados interactivos para la política de precios de referencia
  const [selectedStore, setSelectedStore] = useState(() => {
    return localStorage.getItem('mtg_trade_store') || 'Card Kingdom';
  });

  const [usdRate, setUsdRate] = useState(() => {
    return localStorage.getItem('mtg_trade_rate') || '3000';
  });

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(usdRate);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAllowsMeetup(user.allows_meetup !== false);
    setAllowsShipping(user.allows_shipping === true);
  }, [user]);

  const username = user.username || 'Trader';
  const avatarInitials = username.slice(0, 2).toUpperCase();
  const location = user.location || 'Colombia';
  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' }) 
    : 'sept de 2026';
  const bio = user.bio || 'Coleccionista y jugador activo de MTG.';
  const isPhoneVerified = user.is_phone_verified ?? false;

  // Métricas comerciales
  const reputationScore = user.reputation_score ?? 100;
  const rating = user.rating ?? 5.0;
  const positiveRate = user.positive_rate ?? 100;
  const disputes = user.disputes_count ?? user.disputes ?? 0;
  const completedTrades = user.completed_trades ?? 0;

  // KPIs dinámicos
  const kpis = user.kpis || {};
  const activeBinders = kpis.active_binders ?? (user.binders?.length || 0);
  const maxBinders = kpis.max_binders ?? 10;
  const totalCards = kpis.total_cards ?? 0;
  const tradeCards = kpis.cards_for_trade ?? 0;
  const wishlistWants = kpis.wishlist_wants ?? 0;
  const binderCapacityPercent = Math.round((activeBinders / maxBinders) * 100);

  // Guardar política de precios
  const savePricingPolicy = async (newStore, newRate) => {
    setIsSaving(true);
    localStorage.setItem('mtg_trade_store', newStore);
    localStorage.setItem('mtg_trade_rate', newRate);

    const pricingStr = `${newStore} @ $${Number(newRate).toLocaleString('es-CO')}`;

    try {
      // Backend safe: 'COP' para evitar 422 en schemas con Enum/longitud
      await updateMyProfileApi({
        preferred_currency: 'COP',
        location: user.location,
        bio: user.bio
      });

      const updated = {
        ...user,
        trade_store: newStore,
        trade_usd_rate: newRate,
        pricing_policy: pricingStr
      };

      localStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('mtg_dev_user', JSON.stringify(updated));

      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (e) {
      console.warn('Aviso guardando política de precio:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStoreChange = (store) => {
    setSelectedStore(store);
    savePricingPolicy(store, usdRate);
  };

  const handleRateSubmit = (e) => {
    e.preventDefault();
    const cleanRate = tempRate.replace(/\D/g, '') || '3000';
    setUsdRate(cleanRate);
    setIsEditingRate(false);
    savePricingPolicy(selectedStore, cleanRate);
  };

  // Conmutador interactivo de modalidades de entrega
  const toggleDeliveryMode = async (type) => {
    if (isSaving) return;

    const nextMeetup = type === 'meetup' ? !allowsMeetup : allowsMeetup;
    const nextShipping = type === 'shipping' ? !allowsShipping : allowsShipping;

    if (!nextMeetup && !nextShipping) return;

    setAllowsMeetup(nextMeetup);
    setAllowsShipping(nextShipping);
    setIsSaving(true);

    try {
      try {
        await updateMyProfileApi({
          allows_meetup: nextMeetup,
          allows_shipping: nextShipping
        });
      } catch (err) {
        if (err.response?.status !== 422) throw err;
      }

      const updated = {
        ...user,
        allows_meetup: nextMeetup,
        allows_shipping: nextShipping
      };

      localStorage.setItem('user', JSON.stringify(updated));
      localStorage.setItem('mtg_dev_user', JSON.stringify(updated));

      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (e) {
      console.error('Error guardando modalidad:', e);
      setAllowsMeetup(user.allows_meetup !== false);
      setAllowsShipping(user.allows_shipping === true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* --------------------------------------------------------- */}
      {/* 1. HERO / BANNER PRINCIPAL DE IDENTIDAD                   */}
      {/* --------------------------------------------------------- */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Avatar e Información Personal */}
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full border-2 border-amber-500/80 bg-neutral-950 flex items-center justify-center text-xl font-bold font-mono tracking-wider text-amber-500 shadow-lg shadow-amber-500/10">
                {avatarInitials}
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-950 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  @{username}
                </h1>

                {isPhoneVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Teléfono Verificado
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" /> {location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" /> Miembro desde {memberSince}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Radio className="w-3 h-3 animate-ping" /> En línea
                </span>
              </div>

              <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                {bio}
              </p>

              {/* Controles de Comercio y Preferencias de la Comunidad */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                
                {/* 1. Selector de Tienda de Referencia */}
                <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                  <span className="px-2 text-[10px] uppercase font-mono text-neutral-500 flex items-center gap-1">
                    <Store className="w-3 h-3 text-neutral-500" /> Ref:
                  </span>
                  {STORES.map((store) => (
                    <button
                      key={store}
                      type="button"
                      onClick={() => handleStoreChange(store)}
                      disabled={isSaving}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                        selectedStore === store
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
                      }`}
                    >
                      {store === 'Card Kingdom' ? 'CK' : store === 'TCGPlayer' ? 'TCG' : 'MKM'}
                    </button>
                  ))}
                </div>

                {/* 2. Cotización del Dólar Local (Dólar CK / TCG) */}
                <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-0.5 text-[11px] font-mono">
                  <span className="text-neutral-500 text-[10px] mr-1.5">DÓLAR:</span>
                  {isEditingRate ? (
                    <form onSubmit={handleRateSubmit} className="flex items-center gap-1">
                      <span className="text-neutral-500">$</span>
                      <input
                        type="text"
                        autoFocus
                        value={tempRate}
                        onChange={(e) => setTempRate(e.target.value)}
                        onBlur={handleRateSubmit}
                        placeholder="3000"
                        className="w-14 bg-neutral-900 border border-amber-500 rounded px-1 text-white text-xs font-bold outline-none text-center"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTempRate(usdRate);
                        setIsEditingRate(true);
                      }}
                      title="Clic para cambiar la tasa acordada del dólar"
                      className="font-bold text-amber-400 hover:text-amber-300 underline decoration-dotted underline-offset-2 transition"
                    >
                      ${Number(usdRate).toLocaleString('es-CO')} COP
                    </button>
                  )}
                </div>

                {/* 3. Modalidad: Encuentro Local */}
                <button
                  type="button"
                  onClick={() => toggleDeliveryMode('meetup')}
                  disabled={isSaving}
                  title="Clic para activar/desactivar encuentros presenciales"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                    allowsMeetup 
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:border-emerald-500' 
                      : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700 opacity-60'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Encuentro Local</span>
                  {allowsMeetup && <Check className="w-3 h-3 stroke-[2.5]" />}
                </button>

                {/* 4. Modalidad: Envíos Nacionales */}
                <button
                  type="button"
                  onClick={() => toggleDeliveryMode('shipping')}
                  disabled={isSaving}
                  title="Clic para activar/desactivar envíos nacionales"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                    allowsShipping 
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:border-emerald-500' 
                      : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700 opacity-60'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Envíos Nacionales</span>
                  {allowsShipping && <Check className="w-3 h-3 stroke-[2.5]" />}
                </button>

              </div>
            </div>
          </div>

          {/* Tarjeta de Reputación P2P */}
          <div className="w-full lg:w-auto">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 w-full sm:w-64 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase text-[10px] tracking-wider text-neutral-500">Reputación P2P</span>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {reputationScore}
                </span>
                <span className="text-xs font-semibold uppercase text-amber-500 font-mono">PUNTOS</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-center">
                <div>
                  <div className="text-xs font-bold text-white flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {rating}
                  </div>
                  <span className="text-[9px] text-neutral-500 uppercase">Calificación</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400">{positiveRate}%</div>
                  <span className="text-[9px] text-neutral-500 uppercase">Positivo</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-300">{disputes}</div>
                  <span className="text-[9px] text-neutral-500 uppercase">Disputas</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">{completedTrades}</div>
                  <span className="text-[9px] text-neutral-500 uppercase">Trades</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* 2. BARRA DE KPIS Y MÉTRICAS DE INVENTARIO                 */}
      {/* --------------------------------------------------------- */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Binders Activos</span>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {activeBinders} <span className="text-sm font-normal text-neutral-500">/ {maxBinders}</span>
            </div>
            <span className="text-[10px] text-neutral-500">{binderCapacityPercent}% de capacidad</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Cartas en Colección</span>
            <div className="text-2xl font-black font-mono text-white mt-1">{totalCards}</div>
            <span className="text-[10px] text-emerald-400">Inventario físico</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Cartas Para Cambio</span>
            <div className="text-2xl font-black font-mono text-white mt-1">{tradeCards}</div>
            <span className="text-[10px] text-amber-400">Trade Público Activo</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ArrowUpDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Wishlist Wants</span>
            <div className="text-2xl font-black font-mono text-white mt-1">{wishlistWants}</div>
            <span className="text-[10px] text-rose-400">Objetivos de búsqueda</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Repeat className="w-5 h-5" />
          </div>
        </div>
      </section>
    </div>
  );
}
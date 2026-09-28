// ---------------------------------------------------------
// COMPONENTE: CABECERA Y MÉTRICAS DEL PERFIL DE USUARIO
// ---------------------------------------------------------
import React from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Radio, 
  Settings, 
  Edit3, 
  Star, 
  Layers, 
  Sparkles, 
  ArrowUpDown, 
  Repeat 
} from 'lucide-react';

export default function ProfileHeader({ user, onEditProfile, onTradeSettings }) {
  const profileUser = user || {
    username: 'SebasAcosta',
    avatarInitials: 'SA',
    location: 'Bello, Antioquia',
    memberSince: 'Sep 2026',
    bio: 'Commander brewer, Modern player, and reliable local trader. Open to fair value swaps and meetup trades around Medellín.',
    reputationScore: 100,
    rating: 5.0,
    positiveRate: 100,
    disputes: 0,
    tradesCompleted: 42,
    isPhoneVerified: true
  };

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------- */}
      {/* 1. HERO / BANNER PRINCIPAL DE IDENTIDAD                   */}
      {/* --------------------------------------------------------- */}
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Avatar e Información Personal */}
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-amber-500/80 bg-neutral-950 flex items-center justify-center text-xl font-bold font-mono tracking-wider text-amber-500 shadow-lg shadow-amber-500/10">
                {profileUser.avatarInitials || profileUser.username?.slice(0, 2).toUpperCase() || 'TR'}
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-950 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  @{profileUser.username}
                </h1>
                {profileUser.isPhoneVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" /> Phone Verified
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500" /> {profileUser.location || 'Colombia'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" /> Member since {profileUser.memberSince || '2026'}
                </span>
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Radio className="w-3 h-3 animate-ping" /> Online now
                </span>
              </div>

              <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                {profileUser.bio || 'Coleccionista y jugador activo de MTG.'}
              </p>

              {/* Tags de Preferencias */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-[11px] font-mono text-neutral-300 border border-neutral-700">
                  USD / COP
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-[11px] font-mono text-neutral-300 border border-neutral-700">
                  LOCAL MEET-UP
                </span>
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-[11px] font-mono text-neutral-300 border border-neutral-700">
                  SHIPS NATIONWIDE
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta de Reputación P2P y Acciones */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 w-full sm:w-64 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-mono uppercase text-[10px] tracking-wider text-neutral-500">P2P Reputation</span>
                <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {profileUser.reputationScore ?? 100}
                </span>
                <span className="text-xs font-semibold uppercase text-amber-500 font-mono">REP SCORE</span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-center">
                <div>
                  <div className="text-xs font-bold text-white flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {profileUser.rating ?? 5.0}
                  </div>
                  <span className="text-[9px] text-neutral-500 uppercase">Rating</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-400">{profileUser.positiveRate ?? 100}%</div>
                  <span className="text-[9px] text-neutral-500 uppercase">Positive</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-300">{profileUser.disputes ?? 0}</div>
                  <span className="text-[9px] text-neutral-500 uppercase">Disputes</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">{profileUser.tradesCompleted ?? 0}</div>
                  <span className="text-[9px] text-neutral-500 uppercase">Trades</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button 
                onClick={onEditProfile}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 border border-neutral-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
              <button 
                onClick={onTradeSettings}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 transition"
              >
                <Settings className="w-3.5 h-3.5" /> Trade Settings
              </button>
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
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Active Binders</span>
            <div className="text-2xl font-black font-mono text-white mt-1">3 <span className="text-sm font-normal text-neutral-500">/ 10</span></div>
            <span className="text-[10px] text-neutral-500">30% capacity</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Collection Cards</span>
            <div className="text-2xl font-black font-mono text-white mt-1">428</div>
            <span className="text-[10px] text-emerald-400">+$2,430 Value</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Cards For Trade</span>
            <div className="text-2xl font-black font-mono text-white mt-1">86</div>
            <span className="text-[10px] text-amber-400">20% of Binder</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ArrowUpDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Wishlist Wants</span>
            <div className="text-2xl font-black font-mono text-white mt-1">14</div>
            <span className="text-[10px] text-rose-400">3 Matches Ready</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Repeat className="w-5 h-5" />
          </div>
        </div>
      </section>
    </div>
  );
}
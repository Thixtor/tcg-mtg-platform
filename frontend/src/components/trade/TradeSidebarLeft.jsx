// ---------------------------------------------------------
// COMPONENTE: BARRA LATERAL IZQUIERDA (FILTROS Y GEOLOCALIZACIÓN)
// ---------------------------------------------------------
import React from 'react';
import { 
  Home, 
  Compass, 
  Layers, 
  ArrowLeftRight, 
  Heart, 
  Users, 
  Bookmark, 
  MapPin, 
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export default function TradeSidebarLeft({
  activeNav = 'feed',
  onSelectNav,
  filterZoneOnly,
  onToggleZoneOnly,
  filterVerifiedOnly,
  onToggleVerifiedOnly,
  userLocation = 'Medellín, Antioquia',
  searchRadius = '25 km',
  onSelectRadius,
}) {
  const radii = ['5 km', '10 km', '25 km'];
  const scopes = ['Colombia', 'Internacional'];

  return (
    <aside className="w-full lg:w-64 space-y-6 font-mono text-xs select-none">
      
      {/* 1. Header con Badge */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-amber-500 font-bold tracking-wider uppercase text-[11px]">
          <ArrowLeftRight className="w-4 h-4" />
          <span>Trade Wall</span>
        </div>
        <p className="text-neutral-500 text-[10px] leading-tight">
          Intercambia, conecta y completa tu colección física.
        </p>
      </div>

      {/* 2. Navegación Principal */}
      <nav className="space-y-1">
        {[
          { id: 'feed', label: 'Inicio / Feed', icon: Home },
          { id: 'explore', label: 'Explorar', icon: Compass },
          { id: 'my-posts', label: 'Mis publicaciones', icon: Layers },
          { id: 'my-trades', label: 'Mis intercambios', icon: ArrowLeftRight },
          { id: 'wishlist', label: 'Wishlist', icon: Heart },
          { id: 'nearby', label: 'Usuarios cercanos', icon: Users },
          { id: 'saved', label: 'Guardados', icon: Bookmark },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav?.(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. Filtros Rápidos (Toggles) */}
      <div className="pt-4 border-t border-neutral-800 space-y-3">
        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
          Filtros rápidos
        </span>

        <label className="flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer">
          <span className="flex items-center gap-2 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            Solo de mi zona
          </span>
          <input
            type="checkbox"
            checked={filterZoneOnly}
            onChange={(e) => onToggleZoneOnly?.(e.target.checked)}
            className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between text-neutral-300 hover:text-white cursor-pointer">
          <span className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Intercambios verificados
          </span>
          <input
            type="checkbox"
            checked={filterVerifiedOnly}
            onChange={(e) => onToggleVerifiedOnly?.(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </label>
      </div>

      {/* 4. Ubicación y Radio de Búsqueda */}
      <div className="pt-4 border-t border-neutral-800 space-y-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Mi ubicación</span>
          <button className="text-amber-500 hover:underline cursor-pointer">Editar</button>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="truncate">{userLocation}</span>
        </div>

        <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block pt-1">
          Radio de búsqueda
        </span>

        <div className="grid grid-cols-3 gap-1.5">
          {radii.map((r) => (
            <button
              key={r}
              onClick={() => onSelectRadius?.(r)}
              className={`py-1.5 px-2 rounded-lg text-center transition cursor-pointer border text-[10px] ${
                searchRadius === r
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500 font-bold'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {scopes.map((s) => (
            <button
              key={s}
              onClick={() => onSelectRadius?.(s)}
              className={`py-1.5 px-2 rounded-lg text-center transition cursor-pointer border text-[10px] ${
                searchRadius === s
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500 font-bold'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Banner de Confianza y Reglas */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-2">
        <div className="flex items-center gap-2 text-neutral-200 font-bold text-[11px]">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>¿Cómo funciona el trade?</span>
        </div>
        <p className="text-neutral-500 text-[10px] leading-relaxed">
          Aprende a negociar de forma segura, califica a otros jugadores y mantén activa tu reputación en la comunidad.
        </p>
        <button className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer">
          Ver guía rápida →
        </button>
      </div>

    </aside>
  );
}
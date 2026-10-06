// ---------------------------------------------------------
// COMPONENTE: LISTA EXHAUSTIVA DE MECÁNICAS Y EFECTOS CLAVE
// ---------------------------------------------------------
import React, { useState } from 'react';
import { 
  Wind, 
  Zap, 
  Skull, 
  ShieldAlert, 
  HeartHandshake, 
  Eye, 
  Flame, 
  RefreshCw, 
  Sparkles, 
  Crosshair, 
  Layers, 
  Swords, 
  Lock, 
  ChevronDown, 
  ChevronUp,
  Search,
  Activity,
  BellRing,
  Coins,
  Repeat
} from 'lucide-react';

export const MECHANICS_CATALOG = [
  // --- NATURALEZA Y TIPO DE HABILIDAD ---
  { 
    id: 'ability_activated', 
    label: 'Habilidad Activada (Coste: Efecto)', 
    category: 'Tipo de Habilidad', 
    customQuery: 'o:/:/', 
    icon: Activity 
  },
  { 
    id: 'ability_triggered', 
    label: 'Habilidad Disparada (Al entrar / Cuando...)', 
    category: 'Tipo de Habilidad', 
    customQuery: '(o:"when " or o:"whenever " or o:"at ")', 
    icon: BellRing 
  },
  { 
    id: 'ability_mana', 
    label: 'Habilidad de Maná (Agrega maná)', 
    category: 'Tipo de Habilidad', 
    customQuery: 'o:"add "', 
    icon: Coins 
  },
  { 
    id: 'ability_replacement', 
    label: 'Efecto de Reemplazo (En vez de / Si fuera a...)', 
    category: 'Tipo de Habilidad', 
    customQuery: '(o:"if" o:"instead")', 
    icon: Repeat 
  },

  // --- COMBATE Y EVASIÓN ---
  { id: 'flying', label: 'Vuela (Flying)', category: 'Combate', scryfallKw: 'Flying', icon: Wind },
  { id: 'trample', label: 'Arrolla (Trample)', category: 'Combate', scryfallKw: 'Trample', icon: Zap },
  { id: 'deathtouch', label: 'Toque mortal (Deathtouch)', category: 'Combate', scryfallKw: 'Deathtouch', icon: Skull },
  { id: 'haste', label: 'Prisa (Haste)', category: 'Combate', scryfallKw: 'Haste', icon: Zap },
  { id: 'first_strike', label: 'Daña primero (First Strike)', category: 'Combate', scryfallKw: 'First strike', icon: Swords },
  { id: 'double_strike', label: 'Doble golpe (Double Strike)', category: 'Combate', scryfallKw: 'Double strike', icon: Swords },
  { id: 'menace', label: 'Amenaza (Menace)', category: 'Combate', scryfallKw: 'Menace', icon: ShieldAlert },
  { id: 'vigilance', label: 'Vigilancia (Vigilance)', category: 'Combate', scryfallKw: 'Vigilance', icon: ShieldAlert },
  { id: 'reach', label: 'Alcance (Reach)', category: 'Combate', scryfallKw: 'Reach', icon: Crosshair },

  // --- PROTECCIÓN Y DEFENSA ---
  { id: 'hexproof', label: 'Antimaleficio (Hexproof)', category: 'Protección', scryfallKw: 'Hexproof', icon: Lock },
  { id: 'ward', label: 'Protección con coste (Ward)', category: 'Protección', scryfallKw: 'Ward', icon: Lock },
  { id: 'indestructible', label: 'Indestructible', category: 'Protección', scryfallKw: 'Indestructible', icon: ShieldAlert },
  { id: 'protection', label: 'Protección (Protection)', category: 'Protección', customQuery: 'o:"protection from"', icon: Lock },

  // --- CONTROL, REMOVAL Y DISRUPCIÓN ---
  { id: 'removal_destroy', label: 'Destruir permanente/criatura', category: 'Control', customQuery: 'o:"destroy target"', icon: Skull },
  { id: 'removal_exile', label: 'Exiliar permanente/carta', category: 'Control', customQuery: 'o:"exile target"', icon: Flame },
  { id: 'counterspell', label: 'Contrarrestar hechizo', category: 'Control', customQuery: 'o:"counter target spell"', icon: ShieldAlert },
  { id: 'board_wipe', label: 'Limpieza de mesa (Wipe)', category: 'Control', customQuery: '(o:"destroy all" or o:"exile all")', icon: Skull },
  { id: 'bounce', label: 'Regresar a la mano (Bounce)', category: 'Control', customQuery: 'o:"return target" o:"to its owner\'s hand"', icon: RefreshCw },
  { id: 'discard', label: 'Descarte forzado', category: 'Control', customQuery: 'o:"discards a card" or o:"discard target"', icon: Eye },

  // --- VENTAJA DE RECURSOS, MANÁ Y ROBO ---
  { id: 'card_draw', label: 'Robar cartas (Card Draw)', category: 'Ventaja', customQuery: 'o:"draw a card"', icon: Eye },
  { id: 'ramp', label: 'Búsqueda de tierras (Ramp)', category: 'Ventaja', customQuery: 'o:"search your library for a" (o:"land card" or o:"basic land")', icon: Layers },
  { id: 'scry', label: 'Adivinar (Scry)', category: 'Ventaja', customQuery: 'o:"scry"', icon: Eye },
  { id: 'tutor', label: 'Buscar cualquier carta (Tutor)', category: 'Ventaja', customQuery: 'o:"search your library for a card"', icon: Search },
  { id: 'lifelink', label: 'Vínculo vital (Lifelink)', category: 'Ventaja', scryfallKw: 'Lifelink', icon: HeartHandshake },
  { id: 'treasure', label: 'Fichas de Tesoro (Treasures)', category: 'Ventaja', customQuery: 'o:"treasure token"', icon: Sparkles },

  // --- CEMENTERIO Y RECURSIÓN ---
  { id: 'graveyard_recur', label: 'Recuperar del cementerio', category: 'Cementerio', customQuery: 'o:"return" o:"from your graveyard"', icon: RefreshCw },
  { id: 'flashback', label: 'Retrospectiva (Flashback)', category: 'Cementerio', scryfallKw: 'Flashback', icon: RefreshCw },
  { id: 'dredge', label: 'Dragar (Dredge)', category: 'Cementerio', scryfallKw: 'Dredge', icon: RefreshCw },
  { id: 'mill', label: 'Moler cartas (Mill)', category: 'Cementerio', customQuery: 'o:"mill" or o:"put the top" o:"cards of your library into your graveyard"', icon: Layers },

  // --- ARQUETIPOS Y SINERGIAS POPULARES ---
  { id: 'tokens', label: 'Crear Fichas (Tokens)', category: 'Sinergia', customQuery: 'o:"create" o:"token"', icon: Sparkles },
  { id: 'counters_11', label: 'Contadores +1/+1', category: 'Sinergia', customQuery: 'o:"+1/+1 counter"', icon: Zap },
  { id: 'landfall', label: 'Aterrizaje (Landfall)', category: 'Sinergia', customQuery: 'o:"landfall"', icon: Layers },
  { id: 'cascade', label: 'Cascada (Cascade)', category: 'Sinergia', scryfallKw: 'Cascade', icon: Zap },
  { id: 'proliferate', label: 'Proliferar (Proliferate)', category: 'Sinergia', customQuery: 'o:"proliferate"', icon: Sparkles },
  { id: 'prowess', label: 'Destreza (Prowess)', category: 'Sinergia', scryfallKw: 'Prowess', icon: Flame },
];

export default function MechanicsFilterPanel({
  selectedMechanics = [],
  onToggleMechanic,
  isLightMode = false,
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    'Todas', 
    'Tipo de Habilidad', 
    'Combate', 
    'Protección', 
    'Control', 
    'Ventaja', 
    'Cementerio', 
    'Sinergia'
  ];

  const filteredMechanics = MECHANICS_CATALOG.filter((m) => {
    const matchesCat = activeCategory === 'Todas' || m.category === activeCategory;
    const matchesText = m.label.toLowerCase().includes(filterQuery.toLowerCase());
    return matchesCat && matchesText;
  });

  const displayedMechanics = isExpanded ? filteredMechanics : filteredMechanics.slice(0, 12);

  return (
    <div className={`rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4 transition-all ${
      isLightMode ? 'bg-white/80 shadow-neutral-200/60' : 'bg-[#111113]/90 shadow-black/60'
    }`}>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-amber-500 block">
            Mecánicas y Efectos Clave
          </span>
          <h3 className={`text-base font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>
            Filtra cartas por lo que hacen en el campo de batalla
          </h3>
        </div>

        {/* Buscador de mecánicas */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar efecto o habilidad..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className={`w-full sm:w-64 pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono outline-none transition ${
              isLightMode 
                ? 'bg-[#FAF7F2] text-neutral-900 placeholder-neutral-400 focus:ring-1 focus:ring-amber-500' 
                : 'bg-black/40 text-neutral-200 placeholder-neutral-500 focus:ring-1 focus:ring-amber-500/80'
            }`}
          />
        </div>
      </div>

      {/* Selector de Categorías */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-xl font-mono text-[11px] transition-all cursor-pointer shrink-0 ${
              activeCategory === cat
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/20'
                : isLightMode
                  ? 'bg-[#FAF7F2] text-neutral-600 hover:text-neutral-950'
                  : 'bg-black/30 text-neutral-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cuadrícula de Mecánicas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {displayedMechanics.map((m) => {
          const Icon = m.icon;
          const active = selectedMechanics.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onToggleMechanic(m)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-semibold transition cursor-pointer text-left ${
                active
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-lg shadow-amber-500/25 scale-[1.02]'
                  : isLightMode
                    ? 'bg-[#FAF7F2] text-neutral-700 hover:bg-[#EAE4D7] hover:text-neutral-950'
                    : 'bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Botón Ver Más / Menos */}
      {filteredMechanics.length > 12 && (
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
              isLightMode 
                ? 'bg-[#EAE4D7] hover:bg-[#DDD5C5] text-neutral-800' 
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400'
            }`}
          >
            {isExpanded ? (
              <>
                <span>Mostrar menos efectos</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Ver todos los efectos ({filteredMechanics.length})</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
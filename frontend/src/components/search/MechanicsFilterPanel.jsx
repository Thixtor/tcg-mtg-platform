// ---------------------------------------------------------
// COMPONENTE: PANEL DE MECÁNICAS (PALETA UNIFICADA)
// ---------------------------------------------------------
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  Swords, 
  Zap, 
  RotateCcw, 
  Sparkles, 
  Skull,
  Coins,
  TrendingUp,
  Eye,
  Layers
} from 'lucide-react';

export const MECHANICS_DATA = [
  // --- COMBATE ---
  { id: 'flying', label: 'Vuela (Flying)', category: 'combat', scryfallKw: 'flying', icon: Zap },
  { id: 'trample', label: 'Arrolla (Trample)', category: 'combat', scryfallKw: 'trample', icon: Zap },
  { id: 'deathtouch', label: 'Toque mortal (Deathtouch)', category: 'combat', scryfallKw: 'deathtouch', icon: Skull },
  { id: 'haste', label: 'Prisa (Haste)', category: 'combat', scryfallKw: 'haste', icon: Zap },
  { id: 'first_strike', label: 'Daña primero (First Strike)', category: 'combat', scryfallKw: 'first strike', icon: Swords },
  { id: 'double_strike', label: 'Doble golpe (Double Strike)', category: 'combat', scryfallKw: 'double strike', icon: Swords },
  { id: 'menace', label: 'Amenaza (Menace)', category: 'combat', scryfallKw: 'menace', icon: Shield },
  { id: 'vigilance', label: 'Vigilancia (Vigilance)', category: 'combat', scryfallKw: 'vigilance', icon: Shield },
  { id: 'reach', label: 'Alcance (Reach)', category: 'combat', scryfallKw: 'reach', icon: Shield },
  { id: 'lifelink', label: 'Vínculo vital (Lifelink)', category: 'combat', scryfallKw: 'lifelink', icon: TrendingUp },

  // --- PROTECCIÓN ---
  { id: 'hexproof', label: 'Antimaleficio (Hexproof)', category: 'protection', scryfallKw: 'hexproof', icon: Shield },
  { id: 'indestructible', label: 'Indestructible', category: 'protection', scryfallKw: 'indestructible', icon: Shield },
  { id: 'ward', label: 'Protección (Ward)', category: 'protection', scryfallKw: 'ward', icon: Shield },
  { id: 'shroud', label: 'Velo (Shroud)', category: 'protection', scryfallKw: 'shroud', icon: Shield },
  { id: 'protection_from', label: 'Protección contra...', category: 'protection', customQuery: 'o:"protection from"', icon: Shield },

  // --- CONTROL ---
  { id: 'counterspell', label: 'Contrarrestar hechizo', category: 'control', customQuery: 'o:"counter target"', icon: Shield },
  { id: 'board_wipe', label: 'Ira / Board Wipe', category: 'control', customQuery: '(o:"destroy all" or o:"exile all")', icon: Skull },
  { id: 'bounce', label: 'Regresar a la mano (Bounce)', category: 'control', customQuery: 'o:"return target" and o:"to its owner\'s hand"', icon: RotateCcw },
  { id: 'exile_target', label: 'Exiliar objetivo', category: 'control', customQuery: 'o:"exile target"', icon: Eye },

  // --- VENTAJA ---
  { id: 'card_draw', label: 'Robo de cartas (Draw)', category: 'advantage', customQuery: '(o:"draw a card" or o:"draws a card")', icon: Eye },
  { id: 'scry', label: 'Adivinar (Scry)', category: 'advantage', scryfallKw: 'scry', icon: Eye },
  { id: 'surveil', label: 'Vigilar (Surveil)', category: 'advantage', scryfallKw: 'surveil', icon: Eye },
  { id: 'tutor', label: 'Tutor (Buscar en biblioteca)', category: 'advantage', customQuery: 'o:"search your library for"', icon: Search },

  // --- CEMENTERIO ---
  { id: 'flashback', label: 'Retrospectiva (Flashback)', category: 'graveyard', scryfallKw: 'flashback', icon: RotateCcw },
  { id: 'reanimate', label: 'Reanimar criatura', category: 'graveyard', customQuery: 'o:"return" and o:"from your graveyard to the battlefield"', icon: Skull },
  { id: 'dredge', label: 'Dragar (Dredge)', category: 'graveyard', scryfallKw: 'dredge', icon: Skull },
  { id: 'escape', label: 'Escapatoria (Escape)', category: 'graveyard', scryfallKw: 'escape', icon: RotateCcw },
  { id: 'mill', label: 'Dañar biblioteca (Mill)', category: 'graveyard', scryfallKw: 'mill', icon: Layers },

  // --- SINERGIAS (CON CONTADORES -1/-1 Y ARQUETIPOS) ---
  { id: 'minus_counters', label: 'Contadores -1/-1', category: 'synergy', customQuery: 'o:"-1/-1 counter"', icon: Skull },
  { id: 'plus_counters', label: 'Contadores +1/+1', category: 'synergy', customQuery: 'o:"+1/+1 counter"', icon: TrendingUp },
  { id: 'proliferate', label: 'Proliferar (Proliferate)', category: 'synergy', scryfallKw: 'proliferate', icon: Sparkles },
  { id: 'aristocrats', label: 'Sacrificio / Aristocrats', category: 'synergy', customQuery: '(o:"sacrifice a creature" or o:"whenever a creature dies")', icon: Skull },
  { id: 'tokens', label: 'Fichas de Criatura (Tokens)', category: 'synergy', customQuery: 'o:"create" and (o:"token" or o:"tokens")', icon: Layers },
  { id: 'treasures', label: 'Tesoros (Treasure)', category: 'synergy', customQuery: 'o:"Treasure token"', icon: Coins },
  { id: 'ramp', label: 'Rampa de tierras (Ramp)', category: 'synergy', customQuery: '(o:"search your library for a" and o:"land card")', icon: TrendingUp },
  { id: 'blink', label: 'Blink / Flicker', category: 'synergy', customQuery: '(o:"exile" and o:"return it to the battlefield")', icon: RotateCcw },
  { id: 'spellslinger', label: 'Spellslinger / Magecraft', category: 'synergy', customQuery: '(o:"whenever you cast an instant or sorcery" or o:"magecraft")', icon: Sparkles },
  { id: 'lifegain', label: 'Ganancia de Vidas', category: 'synergy', customQuery: '(o:"whenever you gain life" or o:"gains that much life")', icon: TrendingUp },
  { id: 'infect', label: 'Infectar / Tóxico', category: 'synergy', customQuery: '(kw:infect or kw:toxic)', icon: Skull },
  { id: 'landfall', label: 'Aterrizaje (Landfall)', category: 'synergy', scryfallKw: 'landfall', icon: Layers }
];

const CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'combat', label: 'Combate' },
  { id: 'protection', label: 'Protección' },
  { id: 'control', label: 'Control' },
  { id: 'advantage', label: 'Ventaja' },
  { id: 'graveyard', label: 'Cementerio' },
  { id: 'synergy', label: 'Sinergia' }
];

export default function MechanicsFilterPanel({
  selectedMechanics = [],
  onToggleMechanic,
}) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredMechanics = useMemo(() => {
    return MECHANICS_DATA.filter((m) => {
      const matchCategory = activeCategory === 'all' || m.category === activeCategory;
      const matchSearch = searchFilter.trim() === '' || 
        m.label.toLowerCase().includes(searchFilter.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchFilter]);

  const visibleMechanics = isExpanded ? filteredMechanics : filteredMechanics.slice(0, 12);

  return (
    <div className="p-6 border border-[#2A2733] bg-[#131217] rounded-2xl font-mono text-xs space-y-4 shadow-xl">
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A2733] pb-3">
        <div>
          <span className="text-[10px] font-bold text-[#E88B00] uppercase tracking-wider block">
            Mecánicas y Efectos Clave
          </span>
          <h3 className="text-sm font-black text-white tracking-tight">
            Filtra cartas por lo que hacen en el campo de batalla
          </h3>
        </div>

        {/* Buscador de efectos */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar efecto o habilidad..."
            className="w-full pl-9 pr-3 py-2 bg-[#0C0B0E] border border-[#2A2733] focus:border-[#E88B00] text-xs text-white placeholder-neutral-500 outline-none rounded-xl"
          />
        </div>
      </div>

      {/* PESTAÑAS TIPO PASTILLA */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full transition cursor-pointer border ${
                isActive
                  ? 'bg-[#E88B00] text-black border-[#E88B00] font-black shadow-sm'
                  : 'bg-[#0C0B0E] text-neutral-400 border-[#2A2733] hover:text-white hover:border-neutral-500'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* BOTONES DE EFECTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
        {visibleMechanics.map((mech) => {
          const isSelected = selectedMechanics.includes(mech.id);
          const IconComponent = mech.icon || Zap;

          return (
            <button
              key={mech.id}
              type="button"
              onClick={() => onToggleMechanic?.(mech)}
              className={`px-3 py-2 text-left border rounded-xl flex items-center gap-2.5 transition cursor-pointer ${
                isSelected
                  ? 'bg-[#1F170E] border-[#E88B00] text-[#E88B00] shadow-sm'
                  : 'bg-[#0C0B0E] border-[#2A2733] text-neutral-300 hover:border-neutral-500 hover:text-white'
              }`}
            >
              <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#E88B00]' : 'text-neutral-500'}`} />
              <span className="truncate text-[11px] font-bold">{mech.label}</span>
            </button>
          );
        })}
      </div>

      {/* BOTÓN EXPANDIR / COLAPSAR */}
      {filteredMechanics.length > 12 && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] text-neutral-400 hover:text-white inline-flex items-center gap-1 font-bold tracking-wider uppercase cursor-pointer"
          >
            <span>{isExpanded ? 'Ver menos' : `Ver todos los efectos (${filteredMechanics.length})`}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

    </div>
  );
}
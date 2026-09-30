// ---------------------------------------------------------
// UTILIDAD: CLASIFICADOR CANÓNICO DE TIPOS DE MTG
// ---------------------------------------------------------

export const KNOWN_TYPE_HINTS = {
  lands: ['plains', 'island', 'swamp', 'mountain', 'forest', 'tower', 'barrens', 'cove', 'passage', 'orchard', 'vista', 'exotic', 'shrine', 'valley', 'village'],
  artifacts: ['signet', 'sol ring', 'talisman', 'sword', 'boots', 'greaves', 'helm', 'plate', 'axe', 'glove', 'weapon', 'materia', 'arm'],
  sorceries: ['command', 'cultivate', 'lore', 'growth', 'business', 'vandalblast', 'horde', 'wrath', 'demonic', 'tutor'],
  instants: ['warp', 'concealment', 'break', 'dispatch', 'intervention', 'counterspell', 'swords to', 'path to', 'bolt', 'charm', 'opt']
};

export const SECTIONS_CONFIG = [
  { key: 'commander', label: 'Comandante' },
  { key: 'companion', label: 'Companion' },
  { key: 'creature', label: 'Criaturas' },
  { key: 'sorcery', label: 'Conjuros' },
  { key: 'instant', label: 'Instantáneos' },
  { key: 'artifact', label: 'Artefactos' },
  { key: 'enchantment', label: 'Encantamientos' },
  { key: 'planeswalker', label: 'Planeswalkers' },
  { key: 'battle', label: 'Batallas' },
  { key: 'land', label: 'Tierras' },
  { key: 'other', label: 'Otros Hechizos' }
];

export const resolveCardType = (card) => {
  if (!card) return 'other';
  const t = (card.type_line || '').toLowerCase();
  const n = (card.name || '').toLowerCase();

  if (card.category === 'commander') return 'commander';
  if (card.category === 'companion') return 'companion';

  if (t.includes('creature') || t.includes('criatura')) return 'creature';
  if (t.includes('sorcery') || t.includes('conjuro')) return 'sorcery';
  if (t.includes('instant') || t.includes('instantáneo')) return 'instant';
  if (t.includes('artifact') || t.includes('artefacto')) return 'artifact';
  if (t.includes('enchantment') || t.includes('encantamiento')) return 'enchantment';
  if (t.includes('planeswalker')) return 'planeswalker';
  if (t.includes('land') || t.includes('tierra')) return 'land';
  if (t.includes('battle') || t.includes('batalla')) return 'battle';

  if (KNOWN_TYPE_HINTS.lands.some((k) => n.includes(k))) return 'land';
  if (KNOWN_TYPE_HINTS.artifacts.some((k) => n.includes(k))) return 'artifact';
  if (KNOWN_TYPE_HINTS.sorceries.some((k) => n.includes(k))) return 'sorcery';
  if (KNOWN_TYPE_HINTS.instants.some((k) => n.includes(k))) return 'instant';

  if (n.includes(',') || n.includes('the ') || n.includes('last ') || n.includes('leader')) return 'creature';

  return 'other';
};
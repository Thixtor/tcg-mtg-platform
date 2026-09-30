// ---------------------------------------------------------
// CLASIFICADOR CANÓNICO DE TIPOS MTG (ESTANDARIZADO)
// ---------------------------------------------------------

export const SECTIONS_CONFIG = [
  { key: 'commander', label: 'Commander', icon: '👑' },
  { key: 'companion', label: 'Companion', icon: '🧭' },
  { key: 'creature', label: 'Creatures', icon: '⚔️' },
  { key: 'planeswalker', label: 'Planeswalkers', icon: '✨' },
  { key: 'battle', label: 'Battles', icon: '🛡️' },
  { key: 'sorcery', label: 'Sorceries', icon: '📜' },
  { key: 'instant', label: 'Instants', icon: '⚡' },
  { key: 'artifact', label: 'Artifacts', icon: '🏆' },
  { key: 'enchantment', label: 'Enchantments', icon: '🌟' },
  { key: 'land', label: 'Lands', icon: '🏔️' },
  { key: 'other', label: 'Other', icon: '📦' }
];

export const resolveCardType = (card) => {
  if (!card) return 'other';

  // 1. Zonas prioritarias
  if (card.category === 'commander') return 'commander';
  if (card.category === 'companion') return 'companion';

  // 2. Extraer texto de tipos de cualquier campo disponible
  let rawType = (
    card.type_line ||
    card.type ||
    card.card_type ||
    card.card_faces?.[0]?.type_line ||
    ''
  ).toLowerCase();

  // 3. Jerarquía oficial MTG
  // Planeswalkers
  if (rawType.includes('planeswalker')) return 'planeswalker';
  
  // Batallas
  if (rawType.includes('battle') || rawType.includes('batalla')) return 'battle';

  // Criaturas (incluso Artifact Creature o Enchantment Creature van a Criaturas)
  if (rawType.includes('creature') || rawType.includes('criatura')) return 'creature';

  // Hechizos de un solo uso
  if (rawType.includes('sorcery') || rawType.includes('conjuro')) return 'sorcery';
  if (rawType.includes('instant') || rawType.includes('instantáneo') || rawType.includes('instantaneo')) return 'instant';

  // Artefactos no criatura
  if (rawType.includes('artifact') || rawType.includes('artefacto')) return 'artifact';

  // Encantamientos no criatura
  if (rawType.includes('enchantment') || rawType.includes('encantamiento')) return 'enchantment';

  // Tierras (incluso Artifact Land va a Lands)
  if (rawType.includes('land') || rawType.includes('tierra')) return 'land';

  // 4. Heurística de respaldo por nombres de tierras básicas
  const name = (card.name || '').toLowerCase();
  const basicLands = [
    'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
    'llanura', 'isla', 'pantano', 'montaña', 'bosque'
  ];
  if (basicLands.some((b) => name.includes(b))) return 'land';

  return 'other';
};
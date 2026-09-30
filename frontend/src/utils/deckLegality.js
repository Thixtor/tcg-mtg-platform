// ---------------------------------------------------------
// UTILIDAD: VALIDACIÓN DE REGLAS OFICIALES MTG (COMMANDER)
// ---------------------------------------------------------

const BASIC_LAND_NAMES = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
  'snow-covered mountain', 'snow-covered forest'
]);

/**
 * Determina la identidad de color combinada de los comandantes (Reglas 702.124c / 903.4)
 */
export function getCommanderColorIdentity(commanders = []) {
  const identity = new Set();
  commanders.forEach((cmd) => {
    const colors = cmd.color_identity || [];
    colors.forEach((c) => identity.add(c.toUpperCase()));
  });
  return identity;
}

/**
 * Valida si una carta cumple la identidad de color del comandante (Regla 903.5c)
 */
export function isCardColorIdentityLegal(card, commanderIdentity) {
  const cardColors = card.color_identity || [];
  if (cardColors.length === 0) return true; // Las incoloras siempre son legales
  return cardColors.every((c) => commanderIdentity.has(c.toUpperCase()));
}

/**
 * Valida si una carta puede tener más de una copia en Commander (Regla 903.5b)
 */
export function canHaveMultipleCopies(cardName = '') {
  if (!cardName) return false;
  const normalized = cardName.trim().toLowerCase();
  
  if (BASIC_LAND_NAMES.has(normalized)) return true;

  // Cartas con reglas explícitas de múltiples copias
  if (
    normalized.includes('relentless rats') || 
    normalized.includes('shadowborn apostle') || 
    normalized.includes('persistent petitioners') || 
    normalized.includes("dragon's approach") ||
    normalized.includes('hare apparent') ||
    normalized.includes('slime against humanity')
  ) {
    return true;
  }

  return false;
}

/**
 * Valida la legalidad completa de la baraja en formato Commander
 */
export function validateDeckLegality(deckCards = [], format = 'Commander') {
  if (format.toLowerCase() !== 'commander') {
    return { isLegal: true, errors: [] };
  }

  const errors = [];
  const commanders = deckCards.filter((c) => c.category === 'commander');
  
  if (commanders.length === 0) {
    errors.push('El mazo debe designar al menos un Comandante legendario (Regla 903.3).');
  } else if (commanders.length > 2) {
    errors.push('Un mazo no puede tener más de dos Comandantes (Regla 702.124g).');
  }

  const commanderIdentity = getCommanderColorIdentity(commanders);
  const cardCountsByName = {};
  let totalCards = 0;

  deckCards.forEach((c) => {
    const qty = c.quantity_needed || 1;
    totalCards += qty;
    const nameLower = (c.name || '').trim().toLowerCase();

    // 1. Singleton (Regla 903.5b)
    cardCountsByName[nameLower] = (cardCountsByName[nameLower] || 0) + qty;
    if (cardCountsByName[nameLower] > 1 && !canHaveMultipleCopies(c.name)) {
      errors.push(`Regla Singleton: "${c.name}" tiene ${cardCountsByName[nameLower]} copias (máx. 1).`);
    }

    // 2. Identidad de Color (Regla 903.5c)
    if (commanders.length > 0 && !isCardColorIdentityLegal(c, commanderIdentity)) {
      const illegalColors = (c.color_identity || []).filter((col) => !commanderIdentity.has(col.toUpperCase()));
      errors.push(`Identidad ilegal: "${c.name}" contiene {${illegalColors.join(', ')}} fuera de la identidad del comandante.`);
    }
  });

  if (totalCards !== 100) {
    errors.push(`El mazo tiene ${totalCards} cartas (debe contener exactamente 100).`);
  }

  return {
    isLegal: errors.length === 0,
    errors
  };
}

export default validateDeckLegality;
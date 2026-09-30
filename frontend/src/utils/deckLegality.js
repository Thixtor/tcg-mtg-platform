// ---------------------------------------------------------
// UTILIDAD: VALIDACIÓN DE REGLAS OFICIALES MTG (MULTIFORMATO)
// ---------------------------------------------------------

const BASIC_LAND_NAMES = new Set([
  'plains', 'island', 'swamp', 'mountain', 'forest', 'wastes',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp',
  'snow-covered mountain', 'snow-covered forest'
]);

/**
 * Extrae la identidad de color de una carta de forma resiliente
 * independientemente del payload del backend o de Scryfall.
 */
export function extractCardColorIdentity(card) {
  if (!card) return [];
  if (Array.isArray(card.color_identity)) return card.color_identity;
  if (Array.isArray(card.card_catalog?.color_identity)) return card.card_catalog.color_identity;
  if (Array.isArray(card.scryfall_raw_data?.color_identity)) return card.scryfall_raw_data.color_identity;
  return [];
}

/**
 * Determina la identidad de color combinada de los comandantes (Reglas 702.124c / 903.4)
 */
export function getCommanderColorIdentity(commanders = []) {
  const identity = new Set();
  commanders.forEach((cmd) => {
    const colors = extractCardColorIdentity(cmd);
    colors.forEach((c) => identity.add(c.toUpperCase()));
  });
  return identity;
}

/**
 * Valida si una carta cumple la identidad de color del comandante (Regla 903.5c)
 */
export function isCardColorIdentityLegal(card, commanderIdentity) {
  const cardColors = extractCardColorIdentity(card);
  if (cardColors.length === 0) return true; // Cartas incoloras son siempre legales
  return cardColors.every((c) => commanderIdentity.has(c.toUpperCase()));
}

/**
 * Valida si una carta puede tener copias ilimitadas (Tierras básicas o reglas específicas de carta)
 */
export function canHaveUnlimitedCopies(cardName = '') {
  if (!cardName) return false;
  const normalized = cardName.trim().toLowerCase();
  
  if (BASIC_LAND_NAMES.has(normalized)) return true;

  // Cartas con texto que anula la regla de construcción (CR 113.6n)
  return (
    normalized.includes('relentless rats') || 
    normalized.includes('shadowborn apostle') || 
    normalized.includes('persistent petitioners') || 
    normalized.includes("dragon's approach") ||
    normalized.includes('hare apparent') ||
    normalized.includes('slime against humanity') ||
    normalized.includes('templar knight')
  );
}

/**
 * Valida la legalidad completa de una baraja según el formato especificado.
 * Conforme a MTG Comprehensive Rules (CR 100.2a para Construido, CR 903 para Commander).
 * 
 * @param {Array} deckCards - Listado de cartas asociadas al mazo
 * @param {string} format - 'commander' | 'standard' | 'modern' | 'pioneer' | 'pauper'
 * @returns {{ isLegal: boolean, errors: string[] }}
 */
export function validateDeckLegality(deckCards = [], format = 'commander') {
  const errors = [];
  const normalizedFormat = (format || 'commander').trim().toLowerCase();

  // 1. Segregación estricta de zonas
  // Commander y Mainboard componen el mazo activo. Sideboard y Maybeboard se evalúan por separado.
  const commanderCards = deckCards.filter((c) => c.category === 'commander');
  const mainboardCards = deckCards.filter((c) => !c.category || c.category === 'mainboard');
  const activeDeckCards = [...commanderCards, ...mainboardCards];
  const sideboardCards = deckCards.filter((c) => c.category === 'sideboard');

  // =========================================================================
  // REGLAS ESPECÍFICAS DE COMMANDER / EDH (CR 903)
  // =========================================================================
  if (normalizedFormat === 'commander') {
    if (commanderCards.length === 0) {
      errors.push('El mazo debe designar al menos un Comandante legendario (Regla 903.3).');
    } else if (commanderCards.length > 2) {
      errors.push('Un mazo no puede tener más de dos Comandantes mediante Partner/Friends Forever (Regla 702.124).');
    }

    const commanderIdentity = getCommanderColorIdentity(commanderCards);
    const cardCountsByName = {};
    let totalMainCards = 0;

    activeDeckCards.forEach((c) => {
      const qty = Number(c.quantity_needed ?? c.quantity ?? 1);
      totalMainCards += qty;
      const cardName = c.card_catalog?.name || c.name || 'Carta desconocida';
      const nameLower = cardName.trim().toLowerCase();

      // Regla Singleton (CR 903.5b)
      cardCountsByName[nameLower] = (cardCountsByName[nameLower] || 0) + qty;
      if (cardCountsByName[nameLower] > 1 && !canHaveUnlimitedCopies(cardName)) {
        errors.push(`Regla Singleton: "${cardName}" tiene ${cardCountsByName[nameLower]} copias en el mazo (máx. 1).`);
      }

      // Identidad de color del Comandante (CR 903.5c)
      if (commanderCards.length > 0 && !isCardColorIdentityLegal(c, commanderIdentity)) {
        const cardColors = extractCardColorIdentity(c);
        const illegalColors = cardColors.filter((col) => !commanderIdentity.has(col.toUpperCase()));
        errors.push(`Identidad ilegal: "${cardName}" contiene {${illegalColors.join(', ')}} fuera de la identidad del comandante.`);
      }
    });

    // En Commander el mazo activo (incluyendo comandantes) debe tener exactamente 100 cartas (CR 903.5a)
    if (totalMainCards !== 100) {
      errors.push(`El mazo principal contiene ${totalMainCards} cartas (debe contener exactamente 100).`);
    }

    return {
      isLegal: errors.length === 0,
      errors
    };
  }

  // =========================================================================
  // REGLAS DE FORMATOS CONSTRUIDOS (Standard, Modern, Pioneer, Pauper) (CR 100.2a)
  // =========================================================================
  let totalMainCards = 0;
  let totalSideCards = 0;
  const combinedCountsByName = {};

  activeDeckCards.forEach((c) => {
    const qty = Number(c.quantity_needed ?? c.quantity ?? 1);
    totalMainCards += qty;
    const cardName = c.card_catalog?.name || c.name || 'Carta desconocida';
    const nameLower = cardName.trim().toLowerCase();
    combinedCountsByName[nameLower] = (combinedCountsByName[nameLower] || 0) + qty;
  });

  sideboardCards.forEach((c) => {
    const qty = Number(c.quantity_needed ?? c.quantity ?? 1);
    totalSideCards += qty;
    const cardName = c.card_catalog?.name || c.name || 'Carta desconocida';
    const nameLower = cardName.trim().toLowerCase();
    combinedCountsByName[nameLower] = (combinedCountsByName[nameLower] || 0) + qty;
  });

  // Mínimo 60 cartas en mainboard
  if (totalMainCards < 60) {
    errors.push(`El mazo principal tiene ${totalMainCards} cartas (mínimo requerido: 60 cartas).`);
  }

  // Máximo 15 cartas en sideboard
  if (totalSideCards > 15) {
    errors.push(`El sideboard tiene ${totalSideCards} cartas (máximo permitido: 15 cartas).`);
  }

  // Regla de 4 copias máximas entre mainboard y sideboard (CR 100.2a)
  Object.entries(combinedCountsByName).forEach(([nameLower, count]) => {
    if (count > 4 && !canHaveUnlimitedCopies(nameLower)) {
      errors.push(`Límite de copias excedido: "${nameLower}" tiene ${count} copias combinadas (máx. 4).`);
    }
  });

  return {
    isLegal: errors.length === 0,
    errors
  };
}

export default validateDeckLegality;
// ---------------------------------------------------------
// UTILIDAD: NORMALIZADOR Y PARSER DE SÍMBOLOS MTG (CR 107)
// ---------------------------------------------------------

// Regex optimizada y compilada una sola vez para capturar cualquier símbolo entre llaves {X}
export const MANA_TOKEN_REGEX = /\{([^}]+)\}/g;

/**
 * Traduce tokens canónicos de reglas a la clase correspondiente de Mana Font
 * Ejemplos:
 *  - "W/U" -> "wu" (Híbrido)
 *  - "2/B" -> "2b" (Híbrido monocolor)
 *  - "G/P" -> "gp" (Pirexiano)[cite: 9]
 *  - "T"   -> "tap" (Girar permanent)[cite: 9]
 *  - "Q"   -> "untap" (Enderezar)[cite: 9]
 */
export function normalizeManaClass(rawToken) {
  if (!rawToken) return '';
  const token = rawToken.toLowerCase().replace(/[{}]/g, '').trim();

  // Casos especiales de reglas MTG
  const SPECIAL_MAP = {
    t: 'tap',
    q: 'untap',
    chaos: 'chaos',
    pw: 'planeswalker',
    e: 'e',
    energy: 'e',
  };

  if (SPECIAL_MAP[token]) {
    return SPECIAL_MAP[token];
  }

  // Eliminar barras en híbridos y pirexianos: "w/u" -> "wu", "g/p" -> "gp"
  return token.replace(/\//g, '');
}
// ---------------------------------------------------------
// UTILIDAD: CONSTRUCTOR DE CONSULTA DE CARTAS SIMILARES
// ---------------------------------------------------------
/**
 * Extrae las dimensiones mecánicas clave de una carta seleccionada
 * y genera una consulta con sintaxis Scryfall para encontrar sustitutos.
 */
const ORACLE_FUNCTIONAL_PATTERNS = [
  { regex: /counter target/i, syntax: 'o:"counter target"' },
  { regex: /destroy target/i, syntax: 'o:"destroy target"' },
  { regex: /destroy all/i, syntax: 'o:"destroy all"' },
  { regex: /exile target/i, syntax: 'o:"exile target"' },
  { regex: /exile all/i, syntax: 'o:"exile all"' },
  { regex: /draw (a|\d+) cards?/i, syntax: 'o:"draw"' },
  { regex: /search your library/i, syntax: 'o:"search your library"' },
  { regex: /deals? \d+ damage/i, syntax: 'o:"damage"' },
  { regex: /create a (treasure|food|clue) token/i, syntax: 'o:"token"' },
  { regex: /add \{[wubrgc]\}/i, syntax: 'o:"add {"' },
  { regex: /enters.*tapped/i, syntax: 'o:"enters tapped"' },
];

export function buildSimilarCardsQuery(card) {
  if (!card) return '';

  const tokens = [];
  const raw = card.scryfall_raw_data || {};
  const cardName = card.name || raw.name || '';
  const typeLine = card.type_line || raw.type_line || '';
  const oracleText = card.oracle_text || raw.oracle_text || '';
  const cmc = card.cmc ?? raw.cmc;
  const colors = card.colors || raw.colors;

  // 1. Excluir la propia carta para que los resultados sean solo alternativas
  if (cardName) {
    tokens.push(`-!"${cardName}"`);
  }

  // 2. Tipo primario canónico (Creature, Instant, Sorcery, Artifact, Enchantment, etc.)
  if (typeLine) {
    const mainTypes = [
      'Creature', 'Instant', 'Sorcery', 'Artifact',
      'Enchantment', 'Land', 'Planeswalker', 'Battle'
    ];
    const matched = mainTypes.find((t) => typeLine.toLowerCase().includes(t.toLowerCase()));
    if (matched) {
      tokens.push(`t:${matched.toLowerCase()}`);
    }
  }

  // 3. Restricción de Color / Identidad
  if (colors && colors.length > 0) {
    const colorStr = Array.isArray(colors) ? colors.join('') : String(colors);
    tokens.push(`c<=${colorStr.toLowerCase()}`);
  } else {
    tokens.push('c:c'); // Incoloro
  }

  // 4. Rango de Valor de Maná (CMC ± 1)
  if (typeof cmc === 'number' && !isNaN(cmc)) {
    const minCmc = Math.max(0, cmc - 1);
    const maxCmc = cmc + 1;
    tokens.push(`mv>=${minCmc} mv<=${maxCmc}`);
  }

  // 5. Intención del Texto de Reglas (Oracle)
  if (oracleText) {
    for (const item of ORACLE_FUNCTIONAL_PATTERNS) {
      if (item.regex.test(oracleText)) {
        tokens.push(item.syntax);
        break; // Tomar la acción de regla principal
      }
    }
  }

  return tokens.join(' ');
}
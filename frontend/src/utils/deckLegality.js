// ---------------------------------------------------------
// MOTOR DE VALIDACIÓN Y LEGALIDAD DE MAZOS DE MTG
// ---------------------------------------------------------

const BASIC_LAND_NAMES = new Set([
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest', 'Wastes'
]);

/**
 * Normaliza nombres en inglés y remueve sufijos de variantes promocionales.
 */
export const normalizeCardName = (name = '') => {
  return name.split('//')[0].replace(/\s*\([A-Za-z0-9_]+\).*$/, '').trim().toLowerCase();
};

/**
 * Audita las restricciones del mazo según el formato configurado.
 * @param {Array<Object>} cards - Lista auditada de cartas del mazo.
 * @param {string} format - Formato ('Commander', 'Standard', 'Modern', 'Pioneer', 'Brawl', 'Limited').
 * @returns {Object} Reporte con banderas de legalidad, avisos e infracciones.
 */
export const validateDeckLegality = (cards = [], format = 'Commander') => {
  const issues = [];
  const warnings = [];

  const mainboard = cards.filter((c) => c.category === 'mainboard');
  const commanders = cards.filter((c) => c.category === 'commander');
  const sideboard = cards.filter((c) => c.category === 'sideboard');
  const companions = cards.filter((c) => c.category === 'companion');

  const mainCount = mainboard.reduce((acc, c) => acc + (c.quantity_needed || 1), 0);
  const commCount = commanders.reduce((acc, c) => acc + (c.quantity_needed || 1), 0);
  const sideCount = sideboard.reduce((acc, c) => acc + (c.quantity_needed || 1), 0);
  const totalDeckCount = mainCount + commCount;

  // 1. Conteo de copias por nombre canónico en inglés
  const nameCounts = new Map();
  cards.forEach((card) => {
    const rawName = card.name || card.card_catalog?.name || '';
    const norm = normalizeCardName(rawName);
    const current = nameCounts.get(norm) || { total: 0, rawName, isBasic: false };
    current.total += (card.quantity_needed || 1);
    if (BASIC_LAND_NAMES.has(rawName)) {
      current.isBasic = true;
    }
    nameCounts.set(norm, current);
  });

  const fmt = (format || 'Commander').toLowerCase();

  // 2. Reglas específicas por formato
  if (fmt.includes('commander') || fmt === 'edh') {
    if (commCount < 1) {
      issues.push('El mazo debe tener al menos 1 carta designada como Comandante.');
    } else if (commCount > 2) {
      issues.push('Un mazo de Commander solo admite hasta 2 comandantes con la habilidad Partner.');
    }

    if (totalDeckCount !== 100) {
      issues.push(`Commander requiere exactamente 100 cartas en total (tienes ${totalDeckCount}).`);
    }

    if (sideCount > 0) {
      warnings.push('Commander no utiliza Sideboard en juego oficial.');
    }

    nameCounts.forEach(({ total, rawName, isBasic }) => {
      if (!isBasic && total > 1) {
        issues.push(`Regla de formato Singletón infringida: "${rawName}" tiene ${total} copias (máximo 1).`);
      }
    });

  } else if (fmt.includes('brawl')) {
    if (commCount !== 1) {
      issues.push('Brawl requiere exactamente 1 Comandante legendario.');
    }
    if (totalDeckCount !== 60) {
      issues.push(`Brawl requiere exactamente 60 cartas en total (tienes ${totalDeckCount}).`);
    }
    nameCounts.forEach(({ total, rawName, isBasic }) => {
      if (!isBasic && total > 1) {
        issues.push(`Regla Singletón infringida: "${rawName}" tiene ${total} copias.`);
      }
    });

  } else if (fmt.includes('limited') || fmt.includes('draft') || fmt.includes('sealed')) {
    if (mainCount < 40) {
      issues.push(`El mazo Limitado debe tener al menos 40 cartas (tienes ${mainCount}).`);
    }

  } else {
    // Construido Tradicional (Standard, Modern, Pioneer, Legacy, etc.)
    if (mainCount < 60) {
      issues.push(`Mínimo 60 cartas en el mazo principal para construido (tienes ${mainCount}).`);
    }
    if (sideCount > 15) {
      issues.push(`El sideboard no puede exceder 15 cartas (tienes ${sideCount}).`);
    }
    nameCounts.forEach(({ total, rawName, isBasic }) => {
      if (!isBasic && total > 4) {
        issues.push(`Límite de copias excedido: "${rawName}" tiene ${total} copias (máximo 4 entre mazo y banquillo).`);
      }
    });
  }

  if (companions.length > 1) {
    issues.push('Solo se permite designar 1 carta de Acompañante (Companion) fuera del mazo.');
  }

  return {
    isLegal: issues.length === 0,
    issues,
    warnings,
    counts: {
      mainCount,
      commCount,
      sideCount,
      totalDeckCount
    }
  };
};
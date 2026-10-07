// ---------------------------------------------------------
// UTILIDAD UNIVERSAL DE EXTRACCIÓN DE PRECIOS MTG
// ---------------------------------------------------------

/**
 * Limpia y convierte cualquier entrada a un número flotante válido.
 */
function cleanNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Busca de forma recursiva cualquier indicio de precio USD o CardKingdom.
 */
export function getCardPriceBySource(cardItem, source = 'tcgplayer') {
  if (!cardItem) return 0;

  // 1. Extraer el objeto representativo de la carta
  const cardObj = 
    cardItem.card_catalog || 
    cardItem.card || 
    cardItem.card_details || 
    cardItem.scryfall_card || 
    cardItem;

  const isFoil = Boolean(cardItem.is_foil || cardObj.is_foil);

  // 2. Extraer o parsear el diccionario de 'prices' si existe
  let prices = cardObj.prices || cardItem.prices || {};
  if (typeof prices === 'string') {
    try {
      prices = JSON.parse(prices);
    } catch {
      prices = {};
    }
  }

  // 3. Revisar campos planos en cardItem o cardObj
  const flatFields = [
    cardItem.price_usd,
    cardItem.price,
    cardItem.usd,
    cardItem.market_price,
    cardItem.current_price,
    cardObj.price_usd,
    cardObj.price,
    cardObj.usd,
    cardObj.market_price
  ];

  for (const f of flatFields) {
    const val = cleanNumber(f);
    if (val > 0) return val;
  }

  // 4. Si la fuente elegida es Card Kingdom
  if (source === 'cardkingdom') {
    const ckCandidates = [
      prices.cardkingdom_foil,
      prices.cardkingdom,
      prices.ck_foil,
      prices.ck,
      cardItem.price_cardkingdom,
      cardObj.price_cardkingdom
    ];
    for (const c of ckCandidates) {
      const val = cleanNumber(c);
      if (val > 0) return val;
    }
  }

  // 5. Fuente TCGplayer Market (Scryfall)
  const tcgCandidates = isFoil
    ? [prices.usd_foil, prices.usd_etched, prices.usd]
    : [prices.usd, prices.usd_foil];

  for (const t of tcgCandidates) {
    const val = cleanNumber(t);
    if (val > 0) return val;
  }

  // 6. Si es Sol Ring y Scryfall no trajo precio (o es un print especial como DRC de la imagen)
  // Revisa si viene en purchase_uris o purchase_prices
  if (cardObj.purchase_uris?.tcgplayer) {
    // Es una carta válida registrada
  }

  return 0;
}

/**
 * Calcula total de copias y suma de precios
 */
export function calculateCollectionMetrics(cards = [], source = 'tcgplayer') {
  if (!Array.isArray(cards) || cards.length === 0) {
    return { count: 0, totalValue: 0 };
  }

  return cards.reduce(
    (acc, item) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = getCardPriceBySource(item, source);
      return {
        count: acc.count + qty,
        totalValue: acc.totalValue + (price * qty),
      };
    },
    { count: 0, totalValue: 0 }
  );
}
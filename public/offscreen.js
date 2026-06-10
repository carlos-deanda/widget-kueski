// Documento offscreen: parsea HTML de páginas de producto con DOMParser
// (no disponible en el service worker) y extrae el precio.
// Replica las estrategias de src/content.js: meta tags, selectores CSS y JSON-LD.

const PRICE_SELECTORS = [
  '.a-price .a-offscreen',
  '#corePrice_feature_div .a-offscreen',
  '#priceblock_ourprice',
  '#priceblock_dealprice',
  '.a-price-whole',
  '.priceToPay',
  '.apexPriceToPay',
  '[itemprop="price"]',
  '.price',
  '.price-sales',
  '.current-price',
  '.precio',
  '.product-price',
  '.product-price__price',
  '.price-final_price',
  '.price__amount',
];

const META_PRICE_SELECTORS = [
  'meta[property="product:price:amount"]',
  'meta[property="og:price:amount"]',
  'meta[itemprop="price"]',
  '[itemprop="price"][content]',
];

function parsePriceValue(rawValue) {
  const value = Number(String(rawValue || '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractJsonLdPrice(doc) {
  const normalizeNode = (node) => {
    if (!node) return null;
    if (Array.isArray(node)) {
      return node.map(normalizeNode).find(Boolean) || null;
    }
    if (node['@graph']) {
      return normalizeNode(node['@graph']);
    }

    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes('Product')) {
      const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      return offers?.price || offers?.lowPrice || offers?.highPrice || null;
    }

    return null;
  };

  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const price = normalizeNode(JSON.parse(script.textContent || ''));
      if (price) return price;
    } catch {
      // JSON-LD inválido de la tienda, lo ignoramos.
    }
  }

  return null;
}

function extractPriceFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const selector of META_PRICE_SELECTORS) {
    const value = doc.querySelector(selector)?.getAttribute('content');
    const price = parsePriceValue(value);
    if (price) return price;
  }

  const jsonLdPrice = parsePriceValue(extractJsonLdPrice(doc));
  if (jsonLdPrice) return jsonLdPrice;

  for (const selector of PRICE_SELECTORS) {
    const element = doc.querySelector(selector);
    const price = parsePriceValue(element?.textContent);
    if (price) return price;
  }

  return null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'kueski_parse_product_price') {
    return false;
  }

  try {
    const price = extractPriceFromHtml(message.html || '');
    sendResponse({ ok: true, price });
  } catch (error) {
    sendResponse({ ok: false, error: error.message });
  }

  return true;
});

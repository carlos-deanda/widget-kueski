// src/content.js
console.log("✅ Kueski Content Script cargado en:", window.location.href);

if (window.__KUESKI_CONTENT_SCRIPT_LOADED__) {
  console.log("Kueski Content Script ya estaba cargado.");
} else {
  window.__KUESKI_CONTENT_SCRIPT_LOADED__ = true;

function extraerPrecio() {
  const selectores = [
    '.a-price .a-offscreen',       // Precio principal
    '#corePrice_feature_div .a-offscreen', // Contenedor moderno
    '#priceblock_ourprice',        // Precio viejo
    '#priceblock_dealprice',       // Precio de oferta
    '.a-price-whole',              // Parte entera
    '.priceToPay',                 // Contenedor alternativo
    '.apexPriceToPay'              // Otro común
  ];

  // Selectores adicionales para Bodega Aurrera y tiendas similares
  selectores.push(
    '[itemprop="price"]',
    '.price',
    '.price-sales',
    '.current-price',
    '.precio',
    '.product-price',
    '.product-price__price',
    '.price-final_price',
    '.price__amount'
  );

  const metaSelectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[itemprop="price"]',
    '[itemprop="price"][content]',
  ];

  for (let selector of metaSelectors) {
    const elemento = document.querySelector(selector);
    const value = elemento?.getAttribute("content");
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }

  for (let selector of selectores) {
    const elemento = document.querySelector(selector);
    const value = (elemento?.innerText || elemento?.textContent || "").trim();
    if (value !== "") {
      return value;
    }
  }

  const jsonLdProduct = extraerProductoJsonLd();
  if (jsonLdProduct?.price) {
    return String(jsonLdProduct.price);
  }

  return null;
}

// --- NUEVA FUNCIÓN (Solo para el nombre) ---
function extraerNombre() {
  const selectoresNombre = [
    '#productTitle',       // Amazon estándar
    'h1',                  // Genérico
    '.ui-pdp-title'        // Mercado Libre (por si acaso)
  ];

  // Selectores comunes en tiendas como Bodega Aurrera
  selectoresNombre.push(
    'h1.product-title',
    '.product-name',
    '.product-main-info h1',
    '.title',
    '.product-title',
    '.pdp-title'
  );

  const metaSelectors = [
    'meta[property="og:title"]',
    'meta[name="title"]',
    'meta[itemprop="name"]',
  ];

  for (let selector of metaSelectors) {
    const elemento = document.querySelector(selector);
    const value = elemento?.getAttribute("content");
    if (value && value.trim() !== "") {
      return value.trim();
    }
  }

  for (let selector of selectoresNombre) {
    const elemento = document.querySelector(selector);
    const value = (elemento?.innerText || elemento?.textContent || "").trim();
    if (value !== "") {
      return value;
    }
  }

  const jsonLdProduct = extraerProductoJsonLd();
  if (jsonLdProduct?.name) {
    return String(jsonLdProduct.name);
  }

  return document.title; // Fallback: título de la pestaña
}

function normalizarJsonLdNodo(node) {
  if (!node) return null;

  if (Array.isArray(node)) {
    return node.map(normalizarJsonLdNodo).find(Boolean) || null;
  }

  if (node["@graph"]) {
    return normalizarJsonLdNodo(node["@graph"]);
  }

  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("Product")) {
    const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
    return {
      name: node.name,
      price: offers?.price || offers?.lowPrice || offers?.highPrice,
    };
  }

  return null;
}

function extraerProductoJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (let script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "");
      const product = normalizarJsonLdNodo(parsed);
      if (product) {
        return product;
      }
    } catch {
      // Ignoramos JSON-LD invalido de la tienda.
    }
  }

  return null;
}

function extraerUrlCanonica() {
  try {
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const url = new URL(canonical || window.location.href);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return window.location.href;
  }
}

function extraerTienda() {
  return window.location.hostname.replace(/^www\./, "");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Mensaje recibido en Amazon:", request);

  if (request.action === "GET_PRODUCT_PRICE" || request.action === "GET_PAGE_PRODUCT") {
    const foundPrice = extraerPrecio();
    const foundName = extraerNombre(); // <--- Llamamos a la nueva función
    const productUrl = extraerUrlCanonica();
    const storeName = extraerTienda();
    
    console.log("🏷️ Enviando datos al widget:", { foundPrice, foundName, productUrl, storeName });
    
    // Devolvemos ambos datos sin romper tu estructura
    sendResponse({ 
      price: foundPrice || "No encontrado",
      name: foundName,
      productUrl,
      url: productUrl,
      storeName,
    });
  }
  
  return true; 
});
}

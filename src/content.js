// src/content.js
console.log("✅ Kueski Content Script cargado en:", window.location.href);

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

  for (let selector of selectores) {
    const elemento = document.querySelector(selector);
    if (elemento && elemento.innerText.trim() !== "") {
      return elemento.innerText.trim();
    }
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

  for (let selector of selectoresNombre) {
    const elemento = document.querySelector(selector);
    if (elemento && elemento.innerText.trim() !== "") {
      return elemento.innerText.trim();
    }
  }
  return document.title; // Fallback: título de la pestaña
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Mensaje recibido en Amazon:", request);

  if (request.action === "GET_PRODUCT_PRICE") {
    const foundPrice = extraerPrecio();
    const foundName = extraerNombre(); // <--- Llamamos a la nueva función
    
    console.log("🏷️ Enviando datos al widget:", { foundPrice, foundName });
    
    // Devolvemos ambos datos sin romper tu estructura
    sendResponse({ 
      price: foundPrice || "No encontrado",
      name: foundName 
    });
  }
  
  return true; 
});
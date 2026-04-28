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

  for (let selector of selectores) {
    const elemento = document.querySelector(selector);
    if (elemento && elemento.innerText.trim() !== "") {
      return elemento.innerText.trim();
    }
  }
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📩 Mensaje recibido en Amazon:", request);

  if (request.action === "GET_PRODUCT_PRICE") {
    const foundPrice = extraerPrecio();
    
    console.log("🏷️ Enviando precio al widget:", foundPrice);
    sendResponse({ price: foundPrice || "No encontrado" });
  }
  
  // Importante: mantiene el canal abierto para la respuesta asíncrona
  return true; 
});
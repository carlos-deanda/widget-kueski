// Script de demo: infla el precio de un producto en la BD para que el
// siguiente scrape detecte una "bajada" al precio real de la tienda y
// dispare la alerta (notificación + correo Resend).
//
// Uso:   node test-price-drop.js [productId] [precioInflado]
// Ej.:   node test-price-drop.js 8 1099

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const productId = Number(process.argv[2]) || 8;
const inflatedPrice = Number(process.argv[3]) || 1099;

(async () => {
  const before = await pool.query('SELECT id, name, current_price FROM products WHERE id = $1', [productId]);

  if (before.rowCount === 0) {
    console.error(`No existe producto con id=${productId}`);
    process.exit(1);
  }

  await pool.query('UPDATE products SET current_price = $1 WHERE id = $2', [inflatedPrice, productId]);
  await pool.query('INSERT INTO price_history (product_id, price) VALUES ($1, $2)', [productId, inflatedPrice]);

  console.log(`Producto: ${before.rows[0].name.slice(0, 70)}`);
  console.log(`Precio en BD: $${before.rows[0].current_price} -> $${inflatedPrice.toFixed(2)}`);
  console.log('Listo. Cuando el scraper lea el precio real de la tienda, detectará la bajada.');

  await pool.end();
})().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

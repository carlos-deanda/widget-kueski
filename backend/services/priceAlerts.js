function getPriceDropQuery() {
  return `
    WITH latest_prices AS (
      SELECT
        ph.id AS price_history_id,
        ph.product_id,
        ph.price,
        ph.recorded_at,
        LAG(ph.price) OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at) AS previous_price,
        ROW_NUMBER() OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at DESC) AS rn
      FROM price_history ph
    )
    SELECT
      pt.id AS tracking_id,
      pt.user_id,
      u.name AS user_name,
      u.email AS user_email,
      pt.product_id,
      pr.name AS product_name,
      pr.store_name,
      pr.current_price,
      latest_prices.price AS latest_history_price,
      latest_prices.price_history_id,
      latest_prices.previous_price
    FROM price_trackings pt
    JOIN users u ON u.id = pt.user_id
    JOIN products pr ON pr.id = pt.product_id
    LEFT JOIN latest_prices ON latest_prices.product_id = pr.id AND latest_prices.rn = 1
    WHERE pt.is_active = TRUE
      AND latest_prices.previous_price IS NOT NULL
      AND latest_prices.price < latest_prices.previous_price
    ORDER BY pt.id ASC
  `;
}

async function createNotificationLog(pool, row, channel) {
  await pool.query(
    `
      INSERT INTO notification_logs (
        user_id,
        product_id,
        channel,
        event_type,
        price_history_id,
        current_price,
        previous_price
      )
      VALUES ($1, $2, $3, 'price_drop', $4, $5, $6)
      ON CONFLICT (user_id, product_id, channel, event_type, price_history_id) DO NOTHING
    `,
    [
      row.user_id,
      row.product_id,
      channel,
      row.price_history_id,
      row.current_price,
      row.previous_price,
    ]
  );
}

async function hasNotificationLog(pool, row, channel) {
  const result = await pool.query(
    `
      SELECT 1
      FROM notification_logs
      WHERE user_id = $1
        AND product_id = $2
        AND channel = $3
        AND event_type = 'price_drop'
        AND price_history_id = $4
      LIMIT 1
    `,
    [row.user_id, row.product_id, channel, row.price_history_id]
  );

  return result.rowCount > 0;
}

async function collectPriceDropCandidates(pool) {
  const result = await pool.query(getPriceDropQuery());
  return result.rows;
}

async function sendPriceDropEmailAlerts(pool, { sendEmail, buildPriceDropEmail }) {
  const candidates = await collectPriceDropCandidates(pool);
  const results = [];

  for (const row of candidates) {
    const alreadySent = await hasNotificationLog(pool, row, 'email');
    if (alreadySent) {
      continue;
    }

    const emailPayload = buildPriceDropEmail({
      userName: row.user_name,
      productName: row.product_name,
      storeName: row.store_name,
      currentPrice: row.current_price,
      previousPrice: row.previous_price,
      changePercent: row.previous_price ? Math.abs(((row.current_price - row.previous_price) / row.previous_price) * 100) : 0,
    });

    await sendEmail({
      to: row.user_email,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
    });

    await createNotificationLog(pool, row, 'email');

    results.push({
      userId: row.user_id,
      productId: row.product_id,
      email: row.user_email,
      productName: row.product_name,
      currentPrice: Number(row.current_price),
      previousPrice: Number(row.previous_price),
    });
  }

  return {
    checked: candidates.length,
    sent: results.length,
    notifications: results,
  };
}

module.exports = {
  collectPriceDropCandidates,
  sendPriceDropEmailAlerts,
};

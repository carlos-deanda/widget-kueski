require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '127.0.0.1';
const clientUrl = process.env.CLIENT_URL || 'http://127.0.0.1:5173';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const creditRequestLimitByRating = {
  1: 500,
  2: 1500,
  3: 3000,
  4: 6000,
  5: 10000,
};

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    creditRating: row.credit_rating,
    creditRemaining: money(row.credit_remaining),
    creditRequestLimit: creditRequestLimitByRating[row.credit_rating] || creditRequestLimitByRating[1],
    lastLoginAt: row.last_login_at,
  };
}

function money(value) {
  return Number(value || 0);
}

function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google Calendar integration is not configured in environment variables');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function encodeOAuthState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeOAuthState(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDashboardPurchase(row) {
  const remaining = row.total_installments - row.completed_installments;

  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    status: row.status,
    paymentsLeft: `${remaining} payments left`,
    amount: `$${money(row.installment_amount).toFixed(2)} biweekly`,
    installmentAmount: money(row.installment_amount),
    totalInstallments: row.total_installments,
    completedInstallments: row.completed_installments,
    nextPaymentDate: row.next_payment_date,
  };
}

function formatTrackedProduct(row) {
  const currentPrice = money(row.current_price);
  const previousPrice = money(row.previous_price || row.current_price);
  const changeAmount = currentPrice - previousPrice;
  const change = previousPrice === 0 ? 0 : Math.abs((changeAmount / previousPrice) * 100);
  const isDeal = currentPrice <= money(row.target_price) || changeAmount < 0;

  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    price: `$${currentPrice.toFixed(2)}`,
    currentPrice,
    targetPrice: money(row.target_price),
    change: `${change.toFixed(1)}%`,
    trend: changeAmount <= 0 ? 'down' : 'up',
    badge: isDeal ? 'Good Deal' : null,
    isActive: row.is_active,
  };
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
      callback(null, true);
      return;
    }

    if (origin.startsWith('chrome-extension://')) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
}));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, database: 'disconnected', error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, username, email, phone, credit_rating, credit_remaining, last_login_at
      FROM users
      ORDER BY credit_rating DESC, name ASC
    `);

    res.json({ users: result.rows.map(mapUser) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Usuario y contrasena son requeridos' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        UPDATE users
        SET last_login_at = NOW()
        WHERE username = $1 AND password = $2
        RETURNING id, name, username, email, phone, credit_rating, credit_remaining, last_login_at
      `,
      [username, password]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(401).json({ error: 'Usuario o contrasena incorrectos' });
      return;
    }

    await client.query('INSERT INTO login_events (user_id) VALUES ($1)', [result.rows[0].id]);
    await client.query('COMMIT');

    res.json({ user: mapUser(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/users/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;

  try {
    const [user, purchases, trackedProducts] = await Promise.all([
      pool.query(
        `
          SELECT id, name, username, email, phone, credit_rating, credit_remaining, last_login_at
          FROM users
          WHERE id = $1
        `,
        [userId]
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.product_id,
            pr.name,
            p.status,
            p.installment_amount,
            p.total_installments,
            p.completed_installments,
            p.next_payment_date
          FROM purchases p
          JOIN products pr ON pr.id = p.product_id
          WHERE p.user_id = $1
          ORDER BY p.created_at DESC
        `,
        [userId]
      ),
      pool.query(
        `
          WITH latest_prices AS (
            SELECT
              ph.product_id,
              ph.price,
              LAG(ph.price) OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at) AS previous_price,
              ROW_NUMBER() OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at DESC) AS rn
            FROM price_history ph
          )
          SELECT
            pt.id,
            pt.product_id,
            pr.name,
            pr.current_price,
            pt.target_price,
            pt.is_active,
            latest_prices.previous_price
          FROM price_trackings pt
          JOIN products pr ON pr.id = pt.product_id
          LEFT JOIN latest_prices ON latest_prices.product_id = pr.id AND latest_prices.rn = 1
          WHERE pt.user_id = $1
          ORDER BY pt.created_at DESC
        `,
        [userId]
      ),
    ]);

    if (user.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: mapUser(user.rows[0]),
      activePurchases: purchases.rows.map(formatDashboardPurchase),
      trackedProducts: trackedProducts.rows.map(formatTrackedProduct),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/credit-options', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT id, name, username, email, phone, credit_rating, credit_remaining, last_login_at
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = mapUser(result.rows[0]);

    res.json({
      user,
      options: {
        minAmount: 500,
        maxAmount: user.creditRequestLimit,
        step: 500,
        singleInterestRate: 0.08,
        biweeklyInterestRate: 0.12,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/credit-requests', async (req, res) => {
  const { userId } = req.params;
  const {
    amount,
    paymentType,
    singleTerm,
    biweeklyPayments,
  } = req.body;

  const requestedAmount = money(amount);

  if (!requestedAmount || requestedAmount <= 0) {
    res.status(400).json({ error: 'Monto invalido' });
    return;
  }

  if (!['single', 'biweekly'].includes(paymentType)) {
    res.status(400).json({ error: 'Metodo de pago invalido' });
    return;
  }

  if (paymentType === 'single' && ![15, 30].includes(Number(singleTerm))) {
    res.status(400).json({ error: 'Plazo de pago invalido' });
    return;
  }

  if (paymentType === 'biweekly' && (Number(biweeklyPayments) < 2 || Number(biweeklyPayments) > 12)) {
    res.status(400).json({ error: 'Numero de quincenas invalido' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `
        SELECT id, name, username, email, phone, credit_rating, credit_remaining, last_login_at
        FROM users
        WHERE id = $1
        FOR UPDATE
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = mapUser(userResult.rows[0]);

    if (requestedAmount > user.creditRequestLimit) {
      await client.query('ROLLBACK');
      res.status(400).json({
        error: `Tu limite para esta solicitud es $${user.creditRequestLimit.toFixed(2)}`,
      });
      return;
    }

    const interestRate = paymentType === 'single' ? 0.08 : 0.12;
    const interestAmount = requestedAmount * interestRate;
    const totalAmount = requestedAmount + interestAmount;

    const requestResult = await client.query(
      `
        INSERT INTO credit_requests (
          user_id,
          amount,
          payment_type,
          single_term_days,
          biweekly_payments,
          interest_rate,
          interest_amount,
          total_amount,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved')
        RETURNING *
      `,
      [
        userId,
        requestedAmount,
        paymentType,
        paymentType === 'single' ? Number(singleTerm) : null,
        paymentType === 'biweekly' ? Number(biweeklyPayments) : null,
        interestRate,
        interestAmount,
        totalAmount,
      ]
    );

    const updatedUser = await client.query(
      `
        UPDATE users
        SET credit_remaining = credit_remaining + $1
        WHERE id = $2
        RETURNING id, name, username, email, phone, credit_rating, credit_remaining, last_login_at
      `,
      [requestedAmount, userId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      creditRequest: {
        id: requestResult.rows[0].id,
        amount: money(requestResult.rows[0].amount),
        paymentType: requestResult.rows[0].payment_type,
        interestRate: money(requestResult.rows[0].interest_rate),
        interestAmount: money(requestResult.rows[0].interest_amount),
        totalAmount: money(requestResult.rows[0].total_amount),
        status: requestResult.rows[0].status,
      },
      user: mapUser(updatedUser.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/api/purchases/:purchaseId', async (req, res) => {
  const { purchaseId } = req.params;

  try {
    const purchase = await pool.query(
      `
        SELECT
          p.*,
          pr.name AS product_name,
          pr.current_price,
          u.credit_rating
        FROM purchases p
        JOIN products pr ON pr.id = p.product_id
        JOIN users u ON u.id = p.user_id
        WHERE p.id = $1
      `,
      [purchaseId]
    );

    if (purchase.rowCount === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const row = purchase.rows[0];
    const paidSoFar = money(row.installment_amount) * row.completed_installments;

    res.json({
      purchase: {
        id: row.id,
        productName: row.product_name,
        status: row.status,
        nextPaymentDate: row.next_payment_date,
        remainingInstallments: row.total_installments - row.completed_installments,
        progressPercent: Math.round((row.completed_installments / row.total_installments) * 100),
        installmentAmount: money(row.installment_amount),
        totalInstallments: row.total_installments,
        completedInstallments: row.completed_installments,
        originalPrice: money(row.original_price),
        paidSoFar,
        remainingBalance: Math.max(money(row.total_cost) - paidSoFar, 0),
        totalCost: money(row.total_cost),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/purchases/:purchaseId/calendar/google/start', async (req, res) => {
  const { purchaseId } = req.params;

  try {
    const purchase = await pool.query(
      `
        SELECT id
        FROM purchases
        WHERE id = $1
      `,
      [purchaseId]
    );

    if (purchase.rowCount === 0) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const oauth2Client = getGoogleOAuthClient();
    const state = encodeOAuthState({ purchaseId });
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
      state,
    });

    res.redirect(authUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/integrations/google/calendar/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    res.status(400).send('Missing Google OAuth parameters.');
    return;
  }

  let purchaseId;

  try {
    const parsedState = decodeOAuthState(String(state));
    purchaseId = Number(parsedState.purchaseId);
  } catch (error) {
    res.status(400).send('Invalid OAuth state.');
    return;
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    const purchaseResult = await pool.query(
      `
        SELECT
          p.id,
          p.product_id,
          p.installment_amount,
          p.total_installments,
          p.completed_installments,
          p.next_payment_date,
          pr.name AS product_name
        FROM purchases p
        JOIN products pr ON pr.id = p.product_id
        WHERE p.id = $1
      `,
      [purchaseId]
    );

    if (purchaseResult.rowCount === 0) {
      res.status(404).send('Purchase not found.');
      return;
    }

    const purchase = purchaseResult.rows[0];
    const pendingPaymentsResult = await pool.query(
      `
        SELECT installment_number, amount, due_date
        FROM payments
        WHERE purchase_id = $1 AND status = 'pending'
        ORDER BY due_date ASC
      `,
      [purchaseId]
    );

    const remainingInstallments = purchase.total_installments - purchase.completed_installments;
    const pendingPayments = pendingPaymentsResult.rows.length > 0
      ? pendingPaymentsResult.rows.map((row) => ({
          installmentNumber: row.installment_number,
          amount: money(row.amount),
          dueDate: row.due_date,
        }))
      : Array.from({ length: Math.max(remainingInstallments, 0) }, (_, index) => {
          const sequence = purchase.completed_installments + index + 1;
          const baseDate = purchase.next_payment_date
            ? new Date(purchase.next_payment_date)
            : addDays(new Date(), 14 * index);
          const dueDate = purchase.next_payment_date ? addDays(baseDate, 14 * index) : baseDate;
          return {
            installmentNumber: sequence,
            amount: money(purchase.installment_amount),
            dueDate,
          };
        });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    let createdEvents = 0;

    for (const payment of pendingPayments) {
      const startDate = new Date(payment.dueDate);
      const endDate = addDays(startDate, 1);

      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `Pago Kueski: ${purchase.product_name}`,
          description: `Pago ${payment.installmentNumber} de ${purchase.total_installments} por $${payment.amount.toFixed(2)}.`,
          start: { date: formatDateOnly(startDate) },
          end: { date: formatDateOnly(endDate) },
        },
      });

      createdEvents += 1;
    }

    res.redirect('https://calendar.google.com/calendar/u/0/r');
  } catch (error) {
    res.status(500).send(`No se pudieron crear los eventos: ${error.message}`);
  }
});

app.get('/api/price-trackings/:trackingId', async (req, res) => {
  const { trackingId } = req.params;

  try {
    const tracking = await pool.query(
      `
        WITH price_stats AS (
          SELECT
            product_id,
            MIN(price) AS historical_low,
            MAX(price) AS historical_high
          FROM price_history
          GROUP BY product_id
        ),
        latest_prices AS (
          SELECT
            ph.product_id,
            ph.price,
            LAG(ph.price) OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at) AS previous_price,
            ROW_NUMBER() OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at DESC) AS rn
          FROM price_history ph
        )
        SELECT
          pt.id,
          pt.target_price,
          pt.is_active,
          pr.name,
          pr.current_price,
          price_stats.historical_low,
          price_stats.historical_high,
          latest_prices.previous_price
        FROM price_trackings pt
        JOIN products pr ON pr.id = pt.product_id
        LEFT JOIN price_stats ON price_stats.product_id = pr.id
        LEFT JOIN latest_prices ON latest_prices.product_id = pr.id AND latest_prices.rn = 1
        WHERE pt.id = $1
      `,
      [trackingId]
    );

    if (tracking.rowCount === 0) {
      res.status(404).json({ error: 'Tracking not found' });
      return;
    }

    const row = tracking.rows[0];
    const currentPrice = money(row.current_price);
    const targetPrice = money(row.target_price);
    const previousPrice = money(row.previous_price || row.current_price);
    const changeAmount = currentPrice - previousPrice;
    const changePercent = previousPrice === 0 ? 0 : Math.abs((changeAmount / previousPrice) * 100);
    const historicalHigh = money(row.historical_high || row.current_price);

    res.json({
      tracking: {
        id: row.id,
        productName: row.name,
        currentPrice,
        targetPrice,
        historicalLow: money(row.historical_low || row.current_price),
        savingsVsHigh: Math.max(historicalHigh - currentPrice, 0),
        amountAway: Math.max(currentPrice - targetPrice, 0),
        change: `${changePercent.toFixed(1)}%`,
        trend: changeAmount <= 0 ? 'down' : 'up',
        isNearTarget: currentPrice <= targetPrice * 1.12,
        isActive: row.is_active,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});

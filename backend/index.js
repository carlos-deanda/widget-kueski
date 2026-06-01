require('dotenv').config();

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { google } = require('googleapis');
const { sendPriceDropEmail } = require('./services/emailService');
const {
  hasEmailTransport,
  buildPriceDropEmail,
  buildTestEmail,
  sendEmail,
} = require('./services/emailAlerts');
const { sendPriceDropEmailAlerts } = require('./services/priceAlerts');

const app = express();
const port = process.env.PORT || 3001;
const host = process.env.HOST || '127.0.0.1';

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

const emailAlertIntervalMinutes = Number(process.env.PRICE_ALERT_EMAIL_INTERVAL_MINUTES || 0);
const emailAlertsEnabled = String(process.env.ENABLE_PRICE_ALERT_EMAILS || '').toLowerCase() === 'true';
let emailAlertIntervalId = null;

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function resetSerialSequence(tableName, columnName = 'id') {
  const tableIdentifier = quoteIdentifier(tableName);
  const columnIdentifier = quoteIdentifier(columnName);

  await pool.query(
    `
      SELECT setval(
        pg_get_serial_sequence($1, $2),
        COALESCE((SELECT MAX(${columnIdentifier}) FROM ${tableIdentifier}), 1),
        (SELECT COUNT(*) FROM ${tableIdentifier}) > 0
      )
    `,
    [tableName, columnName]
  );
}

async function ensureDatabaseSchema() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS price_notify_browser BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price_notify_email BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price_notify_google_calendar BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price_notification_preferences_set BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'none' CHECK (verification_level IN ('none', 'partial', 'full')),
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS phone_verification_code TEXT,
      ADD COLUMN IF NOT EXISTS phone_verification_expires_at TIMESTAMP;

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS product_url TEXT;

    CREATE UNIQUE INDEX IF NOT EXISTS products_product_url_unique
      ON products (product_url)
      WHERE product_url IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS price_trackings_user_product_unique
      ON price_trackings (user_id, product_id);
  `);

  await Promise.all([
    resetSerialSequence('users'),
    resetSerialSequence('products'),
    resetSerialSequence('purchases'),
    resetSerialSequence('price_trackings'),
  ]);
}

const USER_SELECT_FIELDS = `
  id,
  name,
  username,
  email,
  phone,
  credit_rating,
  credit_remaining,
  identidad_verificada,
  verification_level,
  phone_verified,
  last_login_at,
  price_notify_browser,
  price_notify_email,
  price_notify_google_calendar,
  price_notification_preferences_set,
  (google_refresh_token IS NOT NULL) AS google_calendar_connected
`;

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatIcsDateOnly(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

async function getPurchaseCalendarData(purchaseId) {
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
    return null;
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

  return { purchase, pendingPayments };
}

function buildIcsCalendar(purchase, pendingPayments) {
  const now = formatIcsDate(new Date());

  const events = pendingPayments.map((payment) => {
    const startDate = new Date(payment.dueDate);
    const endDate = addDays(startDate, 1);

    return [
      'BEGIN:VEVENT',
      `UID:kueski-${purchase.id}-${payment.installmentNumber}@kueski.local`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${formatIcsDateOnly(startDate)}`,
      `DTEND;VALUE=DATE:${formatIcsDateOnly(endDate)}`,
      `SUMMARY:${escapeIcsText(`Pago Kueski: ${purchase.product_name}`)}`,
      `DESCRIPTION:${escapeIcsText(`Pago ${payment.installmentNumber} de ${purchase.total_installments} por $${payment.amount.toFixed(2)}.`)}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kueski Widget//Payments//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

function normalizeCheckoutCalendarPayload(source) {
  const productName = String(source.productName || 'Producto seleccionado').trim().slice(0, 120);
  const installmentAmount = money(source.installmentAmount);
  const totalInstallments = Number.parseInt(source.totalInstallments, 10);
  const firstPaymentDate = new Date(source.firstPaymentDate);

  if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) {
    throw new Error('Invalid installment amount.');
  }

  if (!Number.isInteger(totalInstallments) || totalInstallments <= 0 || totalInstallments > 52) {
    throw new Error('Invalid total installments.');
  }

  if (Number.isNaN(firstPaymentDate.getTime())) {
    throw new Error('Invalid first payment date.');
  }

  return {
    productName: productName || 'Producto seleccionado',
    installmentAmount,
    totalInstallments,
    firstPaymentDate: formatDateOnly(firstPaymentDate),
  };
}

function buildCheckoutCalendarData(payload) {
  const normalized = normalizeCheckoutCalendarPayload(payload);
  const firstPaymentDate = new Date(normalized.firstPaymentDate);
  const purchase = {
    id: `checkout-${Buffer.from(JSON.stringify(normalized)).toString('base64url').slice(0, 24)}`,
    product_name: normalized.productName,
    total_installments: normalized.totalInstallments,
  };
  const pendingPayments = Array.from({ length: normalized.totalInstallments }, (_, index) => ({
    installmentNumber: index + 1,
    amount: normalized.installmentAmount,
    dueDate: addDays(firstPaymentDate, 14 * index),
  }));

  return { purchase, pendingPayments, normalized };
}

async function openIcsInAppleCalendar(ics, purchaseId) {
  const directory = path.join(os.tmpdir(), 'kueski-calendar');
  const filePath = path.join(directory, `kueski-pagos-${purchaseId}-${Date.now()}.ics`);

  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(filePath, ics, 'utf8');
  await new Promise((resolve, reject) => {
    execFile('open', ['-a', 'Calendar', filePath], (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  return filePath;
}

function mapUser(row) {
  const identidadVerificada = row.identidad_verificada === true;
  const storedVerificationLevel = row.verification_level || 'none';
  const verificationLevel = identidadVerificada
    ? 'full'
    : row.phone_verified === true && storedVerificationLevel === 'none'
      ? 'partial'
      : storedVerificationLevel;

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    phone: row.phone,
    creditRating: row.credit_rating,
    creditRemaining: money(row.credit_remaining),
    identidadVerificada,
    verificationLevel,
    phoneVerified: row.phone_verified === true || ['partial', 'full'].includes(verificationLevel),
    creditRequestLimit: creditRequestLimitByRating[row.credit_rating] || creditRequestLimitByRating[1],
    lastLoginAt: row.last_login_at,
    priceNotificationPreferences: {
      browser: row.price_notify_browser === true,
      email: row.price_notify_email === true,
      googleCalendar: row.price_notify_google_calendar === true,
      configured: row.price_notification_preferences_set === true,
    },
    googleCalendarConnected: row.google_calendar_connected === true,
  };
}

function getEmailAlertStatus() {
  return {
    enabled: emailAlertsEnabled,
    intervalMinutes: emailAlertIntervalMinutes,
    smtpConfigured: hasEmailTransport(),
  };
}

async function runEmailPriceAlerts() {
  if (!hasEmailTransport()) {
    return {
      ok: false,
      skipped: true,
      reason: 'SMTP not configured',
      ...getEmailAlertStatus(),
    };
  }

  const result = await sendPriceDropEmailAlerts(pool, {
    sendEmail,
    buildPriceDropEmail,
  });

  return {
    ok: true,
    ...getEmailAlertStatus(),
    ...result,
  };
}

async function sendEmailTestToUser(userId, customMessage) {
  const result = await pool.query(
    `
      SELECT id, name, email
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const user = result.rows[0];
  const emailPayload = buildTestEmail({
    message: customMessage || `Hola ${user.name}, este es un correo de prueba de Kueski Widget.`,
  });

  await sendEmail({
    to: user.email,
    subject: emailPayload.subject,
    text: emailPayload.text,
    html: emailPayload.html,
  });

  return { userId: user.id, email: user.email };
}

function money(value) {
  return Number(value || 0);
}

function generateVerificationCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

function parseMoneyInput(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const numericValue = Number(String(value || '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeProductUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(rawValue);
    parsedUrl.hash = '';
    parsedUrl.search = '';
    return parsedUrl.toString();
  } catch {
    return '';
  }
}

function normalizePriceTrackingProduct(source) {
  const productUrl = normalizeProductUrl(source.productUrl || source.url);
  let storeName = String(source.storeName || '').trim().slice(0, 120);

  if (!storeName && productUrl) {
    try {
      storeName = new URL(productUrl).hostname.replace(/^www\./, '');
    } catch {
      storeName = '';
    }
  }

  return {
    productName: String(source.productName || source.name || '').trim().slice(0, 160),
    currentPrice: parseMoneyInput(source.currentPrice ?? source.price),
    productUrl,
    storeName,
  };
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

function escapeGooglePrivatePropertyValue(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function insertGooglePriceAlertEvent(calendar, productName, previousPrice, currentPrice, productId) {
  const today = new Date();
  const endDate = addDays(today, 1);
  const sourcePropertyValue = String(productId);

  const existingEvents = await calendar.events.list({
    calendarId: 'primary',
    privateExtendedProperty: [`kueskiPriceAlert=${escapeGooglePrivatePropertyValue(sourcePropertyValue)}`],
    maxResults: 1,
    singleEvents: true,
    timeMin: today.toISOString(),
  });

  if ((existingEvents.data.items || []).length > 0) {
    return false;
  }

  await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: `Bajada de precio: ${productName}`,
      description: `El precio bajó de $${Number(previousPrice).toFixed(2)} a $${Number(currentPrice).toFixed(2)}.`,
      start: { date: formatDateOnly(today) },
      end: { date: formatDateOnly(endDate) },
      extendedProperties: {
        private: {
          kueskiPriceAlert: sourcePropertyValue,
        },
      },
    },
  });

  return true;
}

async function getGoogleCalendarClientForUser(userId) {
  const result = await pool.query(
    `
      SELECT google_refresh_token
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rowCount === 0 || !result.rows[0].google_refresh_token) {
    return null;
  }

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({ refresh_token: result.rows[0].google_refresh_token });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function normalizeNotificationPreferences(body) {
  return {
    browser: body?.browser === true,
    email: body?.email === true,
    googleCalendar: body?.googleCalendar === true,
  };
}

async function insertGooglePaymentEvents(calendar, purchase, pendingPayments, sourceKey, sourceValue) {
  for (const payment of pendingPayments) {
    const startDate = new Date(payment.dueDate);
    const endDate = addDays(startDate, 1);
    const sourcePropertyValue = String(sourceValue);
    const installmentPropertyValue = String(payment.installmentNumber);

    const existingEvents = await calendar.events.list({
      calendarId: 'primary',
      privateExtendedProperty: [
        `${sourceKey}=${escapeGooglePrivatePropertyValue(sourcePropertyValue)}`,
        `kueskiInstallment=${escapeGooglePrivatePropertyValue(installmentPropertyValue)}`,
      ],
      maxResults: 1,
      singleEvents: true,
    });

    if ((existingEvents.data.items || []).length > 0) {
      continue;
    }

    await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Pago Kueski: ${purchase.product_name}`,
        description: `Pago ${payment.installmentNumber} de ${purchase.total_installments} por $${payment.amount.toFixed(2)}.`,
        start: { date: formatDateOnly(startDate) },
        end: { date: formatDateOnly(endDate) },
        extendedProperties: {
          private: {
            [sourceKey]: sourcePropertyValue,
            kueskiInstallment: installmentPropertyValue,
          },
        },
      },
    });
  }
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

function getPriceTrend(hasPreviousPrice, changeAmount) {
  if (!hasPreviousPrice || changeAmount === 0) {
    return 'flat';
  }

  return changeAmount < 0 ? 'down' : 'up';
}

function formatTrackedProduct(row) {
  const currentPrice = money(row.current_price);
  const hasPreviousPrice = row.previous_price !== null && row.previous_price !== undefined;
  const previousPrice = hasPreviousPrice ? money(row.previous_price) : currentPrice;
  const changeAmount = currentPrice - previousPrice;
  const change = previousPrice === 0 ? 0 : Math.abs((changeAmount / previousPrice) * 100);

  return {
    id: row.id,
    productId: row.product_id,
    productUrl: row.product_url,
    name: row.name,
    price: `$${currentPrice.toFixed(2)}`,
    currentPrice,
    change: `${change.toFixed(1)}%`,
    trend: getPriceTrend(hasPreviousPrice, changeAmount),
    badge: changeAmount < 0 ? 'Good Deal' : null,
    isActive: row.is_active,
  };
}

async function getTrackedProductById(client, userId, trackingId) {
  const result = await client.query(
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
        pr.product_url,
        pt.is_active,
        latest_prices.previous_price
      FROM price_trackings pt
      JOIN products pr ON pr.id = pt.product_id
      LEFT JOIN latest_prices ON latest_prices.product_id = pr.id AND latest_prices.rn = 1
      WHERE pt.user_id = $1 AND pt.id = $2
    `,
    [userId, trackingId]
  );

  return result.rowCount > 0 ? formatTrackedProduct(result.rows[0]) : null;
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
      SELECT ${USER_SELECT_FIELDS}
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
        RETURNING ${USER_SELECT_FIELDS}
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
          SELECT ${USER_SELECT_FIELDS}
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
            pr.product_url,
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

app.post('/api/users/:userId/phone-verification/start', async (req, res) => {
  const { userId } = req.params;
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          phone_verification_code = $2,
          phone_verification_expires_at = $3
        WHERE id = $1
        RETURNING id
      `,
      [userId, code, expiresAt]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      message: 'Verification code generated',
      code,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/phone-verification/verify', async (req, res) => {
  const { userId } = req.params;
  const code = String(req.body?.code || '').trim();

  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'Codigo de verificacion invalido' });
    return;
  }

  try {
    const userResult = await pool.query(
      `
        SELECT id, phone_verification_code, phone_verification_expires_at
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userResult.rows[0];
    const expiresAt = user.phone_verification_expires_at
      ? new Date(user.phone_verification_expires_at).getTime()
      : 0;

    if (user.phone_verification_code !== code) {
      res.status(400).json({ error: 'Codigo de verificacion invalido' });
      return;
    }

    if (!expiresAt || expiresAt < Date.now()) {
      res.status(400).json({ error: 'Codigo de verificacion expirado' });
      return;
    }

    const result = await pool.query(
      `
        UPDATE users
        SET
          phone_verified = TRUE,
          verification_level = CASE
            WHEN identidad_verificada = TRUE OR verification_level = 'full' THEN 'full'
            ELSE 'partial'
          END,
          phone_verification_code = NULL,
          phone_verification_expires_at = NULL
        WHERE id = $1
        RETURNING ${USER_SELECT_FIELDS}
      `,
      [userId]
    );

    res.json({ user: mapUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/price-trackings', async (req, res) => {
  const { userId } = req.params;
  const normalized = normalizePriceTrackingProduct(req.body);

  if (!normalized.productName || !normalized.currentPrice || !normalized.productUrl) {
    res.status(400).json({ error: 'productName, currentPrice and productUrl are required' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const productResult = await client.query(
      `
        INSERT INTO products (name, store_name, current_price, product_url)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (product_url) WHERE product_url IS NOT NULL
        DO UPDATE SET
          name = EXCLUDED.name,
          store_name = COALESCE(EXCLUDED.store_name, products.store_name),
          current_price = EXCLUDED.current_price
        RETURNING id
      `,
      [
        normalized.productName,
        normalized.storeName || null,
        normalized.currentPrice,
        normalized.productUrl,
      ]
    );

    const productId = productResult.rows[0].id;
    const existingTracking = await client.query(
      `
        SELECT id, is_active
        FROM price_trackings
        WHERE user_id = $1 AND product_id = $2
      `,
      [userId, productId]
    );

    const latestHistory = await client.query(
      `
        SELECT price
        FROM price_history
        WHERE product_id = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `,
      [productId]
    );

    if (latestHistory.rowCount === 0 || money(latestHistory.rows[0].price) !== normalized.currentPrice) {
      await client.query(
        'INSERT INTO price_history (product_id, price) VALUES ($1, $2)',
        [productId, normalized.currentPrice]
      );
    }

    const trackingResult = await client.query(
      `
        INSERT INTO price_trackings (user_id, product_id, is_active)
        VALUES ($1, $2, TRUE)
        ON CONFLICT (user_id, product_id)
        DO UPDATE SET is_active = TRUE
        RETURNING id
      `,
      [userId, productId]
    );

    const tracking = await getTrackedProductById(client, userId, trackingResult.rows[0].id);
    const alreadyTracked = existingTracking.rowCount > 0 && existingTracking.rows[0].is_active === true;

    await client.query('COMMIT');

    res.status(alreadyTracked ? 200 : 201).json({
      tracking,
      alreadyTracked,
      reactivated: existingTracking.rowCount > 0 && !alreadyTracked,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.patch('/api/users/:userId/identity-verification', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          identidad_verificada = TRUE,
          verification_level = 'full'
        WHERE id = $1
        RETURNING ${USER_SELECT_FIELDS}
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: mapUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/notification-preferences', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT ${USER_SELECT_FIELDS}
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: mapUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:userId/notification-preferences', async (req, res) => {
  const { userId } = req.params;
  const preferences = normalizeNotificationPreferences(req.body);

  if (!preferences.browser && !preferences.email && !preferences.googleCalendar) {
    res.status(400).json({ error: 'Selecciona al menos un canal de notificación.' });
    return;
  }

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET
          price_notify_browser = $2,
          price_notify_email = $3,
          price_notify_google_calendar = $4,
          price_notification_preferences_set = TRUE
        WHERE id = $1
        RETURNING ${USER_SELECT_FIELDS}
      `,
      [userId, preferences.browser, preferences.email, preferences.googleCalendar]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: mapUser(result.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/notifications/google/start', async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);

    if (user.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const oauth2Client = getGoogleOAuthClient();
    const state = encodeOAuthState({ notificationUserId: Number(userId) });
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

app.post('/api/users/:userId/price-alerts/test', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT name, email, price_notify_email
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    if (!user.price_notify_email) {
      res.status(400).json({ error: 'Activa las alertas por correo en tus preferencias primero.' });
      return;
    }

    const emailResult = await sendPriceDropEmail({
      to: user.email,
      userName: user.name,
      productName: 'Producto de prueba Kueski',
      previousPrice: 1999.99,
      currentPrice: 1799.99,
    });

    if (!emailResult.sent) {
      res.status(503).json({
        error: emailResult.reason || 'No se pudo enviar el correo de prueba',
        emailSent: false,
      });
      return;
    }

    res.json({
      emailSent: true,
      sentTo: user.email,
      message: 'Correo de prueba enviado. Revisa tu bandeja en unos segundos.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/price-alerts', async (req, res) => {
  const { userId } = req.params;
  const { productName, previousPrice, currentPrice, productId } = req.body;

  if (!productName || previousPrice === undefined || currentPrice === undefined) {
    res.status(400).json({ error: 'productName, previousPrice and currentPrice are required' });
    return;
  }

  try {
    const result = await pool.query(
      `
        SELECT
          name,
          email,
          price_notify_email,
          price_notify_google_calendar,
          google_refresh_token
        FROM users
        WHERE id = $1
      `,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    const response = {
      emailSent: false,
      calendarEventCreated: false,
    };

    if (user.price_notify_email) {
      try {
        const emailResult = await sendPriceDropEmail({
          to: user.email,
          userName: user.name,
          productName,
          previousPrice,
          currentPrice,
        });
        response.emailSent = emailResult.sent === true;
        if (!emailResult.sent) {
          response.emailSkippedReason = emailResult.reason;
        }
      } catch (emailError) {
        response.emailError = emailError.message;
      }
    }

    if (user.price_notify_google_calendar && user.google_refresh_token) {
      try {
        const calendar = await getGoogleCalendarClientForUser(userId);
        if (calendar) {
          response.calendarEventCreated = await insertGooglePriceAlertEvent(
            calendar,
            productName,
            previousPrice,
            currentPrice,
            productId || productName
          );
        }
      } catch (calendarError) {
        response.calendarError = calendarError.message;
      }
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/credit-options', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT ${USER_SELECT_FIELDS}
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
        SELECT ${USER_SELECT_FIELDS}
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
        RETURNING ${USER_SELECT_FIELDS}
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
  let checkoutCalendarPayload;
  let notificationUserId;

  try {
    const parsedState = decodeOAuthState(String(state));
    if (parsedState.checkoutCalendar) {
      checkoutCalendarPayload = parsedState.checkoutCalendar;
    } else if (parsedState.notificationUserId) {
      notificationUserId = Number(parsedState.notificationUserId);
    } else {
      purchaseId = Number(parsedState.purchaseId);
    }
  } catch {
    res.status(400).send('Invalid OAuth state.');
    return;
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (notificationUserId) {
      if (!tokens.refresh_token) {
        res.status(400).send('Google no devolvió un refresh token. Vuelve a autorizar con consentimiento.');
        return;
      }

      await pool.query(
        `
          UPDATE users
          SET google_refresh_token = $1
          WHERE id = $2
        `,
        [tokens.refresh_token, notificationUserId]
      );

      res.send(`
        <!DOCTYPE html>
        <html lang="es">
          <body style="font-family: Arial, sans-serif; padding: 32px; color: #20212A;">
            <h1>Google Calendar conectado</h1>
            <p>Tus alertas de precio ya pueden sincronizarse con Google Calendar.</p>
            <p>Puedes cerrar esta pestaña y volver al widget de Kueski.</p>
          </body>
        </html>
      `);
      return;
    }

    if (checkoutCalendarPayload) {
      const { purchase, pendingPayments } = buildCheckoutCalendarData(checkoutCalendarPayload);
      await insertGooglePaymentEvents(calendar, purchase, pendingPayments, 'kueskiCheckoutId', purchase.id);
      res.redirect('https://calendar.google.com/calendar/u/0/r');
      return;
    }

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

    await insertGooglePaymentEvents(calendar, purchase, pendingPayments, 'kueskiPurchaseId', purchase.id);

    res.redirect('https://calendar.google.com/calendar/u/0/r');
  } catch (error) {
    res.status(500).send(`No se pudieron crear los eventos: ${error.message}`);
  }
});

app.get('/api/purchases/:purchaseId/calendar/ics', async (req, res) => {
  const { purchaseId } = req.params;

  try {
    const calendarData = await getPurchaseCalendarData(purchaseId);

    if (!calendarData) {
      res.status(404).send('Purchase not found.');
      return;
    }

    const { purchase, pendingPayments } = calendarData;
    const ics = buildIcsCalendar(purchase, pendingPayments);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="kueski-pagos-${purchase.id}.ics"`);
    res.send(ics);
  } catch (error) {
    res.status(500).send(`No se pudo generar el calendario: ${error.message}`);
  }
});

app.post('/api/purchases/:purchaseId/calendar/apple/open', async (req, res) => {
  const { purchaseId } = req.params;

  if (process.platform !== 'darwin') {
    res.status(409).json({
      opened: false,
      error: 'Apple Calendar automatic open is only available on macOS.',
      fallbackUrl: `/api/purchases/${purchaseId}/calendar/ics`,
    });
    return;
  }

  try {
    const calendarData = await getPurchaseCalendarData(purchaseId);

    if (!calendarData) {
      res.status(404).json({ opened: false, error: 'Purchase not found.' });
      return;
    }

    const { purchase, pendingPayments } = calendarData;
    const ics = buildIcsCalendar(purchase, pendingPayments);
    await openIcsInAppleCalendar(ics, purchase.id);

    res.json({ opened: true });
  } catch (error) {
    res.status(500).json({
      opened: false,
      error: error.message,
      fallbackUrl: `/api/purchases/${purchaseId}/calendar/ics`,
    });
  }
});

app.get('/api/calendar/checkout/google/start', async (req, res) => {
  try {
    const checkoutCalendar = normalizeCheckoutCalendarPayload(req.query);
    const oauth2Client = getGoogleOAuthClient();
    const state = encodeOAuthState({ checkoutCalendar });
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent',
      state,
    });

    res.redirect(authUrl);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/calendar/checkout/ics', async (req, res) => {
  try {
    const { purchase, pendingPayments } = buildCheckoutCalendarData(req.query);
    const ics = buildIcsCalendar(purchase, pendingPayments);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="kueski-pagos-checkout.ics"');
    res.send(ics);
  } catch (error) {
    res.status(400).send(`No se pudo generar el calendario: ${error.message}`);
  }
});

app.post('/api/calendar/checkout/apple/open', async (req, res) => {
  if (process.platform !== 'darwin') {
    res.status(409).json({
      opened: false,
      error: 'Apple Calendar automatic open is only available on macOS.',
      fallbackUrl: '/api/calendar/checkout/ics',
    });
    return;
  }

  try {
    const { purchase, pendingPayments } = buildCheckoutCalendarData(req.body);
    const ics = buildIcsCalendar(purchase, pendingPayments);
    await openIcsInAppleCalendar(ics, purchase.id);

    res.json({ opened: true });
  } catch (error) {
    res.status(400).json({
      opened: false,
      error: error.message,
      fallbackUrl: '/api/calendar/checkout/ics',
    });
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
            MIN(price) AS historical_low
          FROM price_history
          GROUP BY product_id
        ),
        first_prices AS (
          SELECT
            product_id,
            price AS first_seen_price
          FROM (
            SELECT
              ph.product_id,
              ph.price,
              ROW_NUMBER() OVER (PARTITION BY ph.product_id ORDER BY ph.recorded_at ASC) AS rn
            FROM price_history ph
          ) ranked_prices
          WHERE rn = 1
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
          pt.is_active,
          pr.name,
          pr.current_price,
          pr.product_url,
          price_stats.historical_low,
          first_prices.first_seen_price,
          latest_prices.previous_price
        FROM price_trackings pt
        JOIN products pr ON pr.id = pt.product_id
        LEFT JOIN price_stats ON price_stats.product_id = pr.id
        LEFT JOIN first_prices ON first_prices.product_id = pr.id
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
    const firstSeenPrice = money(row.first_seen_price || row.current_price);
    const hasPreviousPrice = row.previous_price !== null && row.previous_price !== undefined;
    const previousPrice = hasPreviousPrice ? money(row.previous_price) : currentPrice;
    const changeAmount = currentPrice - previousPrice;
    const changePercent = previousPrice === 0 ? 0 : Math.abs((changeAmount / previousPrice) * 100);

    res.json({
      tracking: {
        id: row.id,
        productName: row.name,
        productUrl: row.product_url,
        currentPrice,
        firstSeenPrice,
        historicalLow: money(row.historical_low || row.current_price),
        savings: firstSeenPrice - currentPrice,
        change: `${changePercent.toFixed(1)}%`,
        trend: getPriceTrend(hasPreviousPrice, changeAmount),
        isActive: row.is_active,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/email/status', (req, res) => {
  res.json({
    ok: true,
    ...getEmailAlertStatus(),
  });
});

app.post('/api/notifications/email/test', async (req, res) => {
  try {
    if (!hasEmailTransport()) {
      res.status(503).json({
        ok: false,
        error: 'SMTP not configured',
        ...getEmailAlertStatus(),
      });
      return;
    }

    const userId = Number(req.body.userId || 0);
    if (!userId) {
      res.status(400).json({ ok: false, error: 'userId is required' });
      return;
    }

    const result = await sendEmailTestToUser(userId, req.body.message);
    res.json({ ok: true, ...getEmailAlertStatus(), email: result.email });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
});

app.post('/api/notifications/email/price-check', async (req, res) => {
  try {
    const result = await runEmailPriceAlerts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message, ...getEmailAlertStatus() });
  }
});

if (emailAlertsEnabled && emailAlertIntervalMinutes > 0) {
  const intervalMs = emailAlertIntervalMinutes * 60 * 1000;
  emailAlertIntervalId = setInterval(async () => {
    try {
      const result = await runEmailPriceAlerts();
      if (result.sent > 0) {
        console.log(`Email alerts sent: ${result.sent}`);
      }
    } catch (error) {
      console.warn('Email alert interval failed', error);
    }
  }, intervalMs);

  console.log(`Email price alerts enabled every ${emailAlertIntervalMinutes} minute(s)`);
}

(async () => {
  try {
    await ensureDatabaseSchema();

    app.listen(port, host, () => {
      console.log(`Backend listening on http://${host}:${port}`);
      if (emailAlertIntervalId) {
        console.log('Email alert polling is active');
      }
    });
  } catch (error) {
    console.error('Failed to initialize database schema', error);
    process.exit(1);
  }
})();

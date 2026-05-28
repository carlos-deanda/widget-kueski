const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
    from,
  };
}

function hasEmailTransport() {
  return Boolean(getSmtpConfig());
}

function getTransporter() {
  const config = getSmtpConfig();
  if (!config) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  return cachedTransporter;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function buildPriceDropEmail({ userName, productName, storeName, currentPrice, previousPrice, changePercent }) {
  const previousLabel = formatMoney(previousPrice);
  const currentLabel = formatMoney(currentPrice);
  const storeLabel = storeName ? ` en ${storeName}` : '';
  const subject = `Bajada de precio: ${productName}${storeLabel}`;
  const text = [
    `Hola ${userName},`,
    '',
    `${productName}${storeLabel} bajó de ${previousLabel} a ${currentLabel}.`,
    `Cambio aproximado: ${Number(changePercent || 0).toFixed(1)}%`,
    '',
    'Revisa el widget para ver el detalle del seguimiento.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 12px; color: #0057ff;">Bajada de precio detectada</h2>
      <p style="margin: 0 0 8px;">Hola <strong>${escapeHtml(userName)}</strong>,</p>
      <p style="margin: 0 0 8px;">${escapeHtml(productName)}${storeLabel ? ` en <strong>${escapeHtml(storeName)}</strong>` : ''} bajó de <strong>${previousLabel}</strong> a <strong>${currentLabel}</strong>.</p>
      <p style="margin: 0 0 16px;">Cambio aproximado: <strong>${Number(changePercent || 0).toFixed(1)}%</strong></p>
      <p style="margin: 0; color: #475569;">Revisa el widget para ver más detalles del seguimiento.</p>
    </div>
  `;

  return { subject, text, html };
}

function buildTestEmail({ message = 'Este es un correo de prueba de Kueski Widget.' } = {}) {
  const subject = 'Prueba de notificación por correo';
  const text = message;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <h2 style="margin: 0 0 12px; color: #0057ff;">Correo de prueba</h2>
      <p style="margin: 0;">${escapeHtml(message)}</p>
    </div>
  `;

  return { subject, text, html };
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('SMTP email transport is not configured');
  }

  const config = getSmtpConfig();
  const result = await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });

  return result;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  hasEmailTransport,
  buildPriceDropEmail,
  buildTestEmail,
  sendEmail,
};

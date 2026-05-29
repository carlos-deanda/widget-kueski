const { Resend } = require('resend');

let resendClient;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL || 'Kueski Widget <onboarding@resend.dev>';
}

async function sendPriceDropEmail({ to, userName, productName, previousPrice, currentPrice }) {
  const client = getResendClient();

  if (!client) {
    return { sent: false, reason: 'RESEND_API_KEY is not configured' };
  }

  const previousLabel = `$${Number(previousPrice || 0).toFixed(2)}`;
  const currentLabel = `$${Number(currentPrice || 0).toFixed(2)}`;

  const { data, error } = await client.emails.send({
    from: getFromAddress(),
    to: [to],
    subject: `Bajada de precio: ${productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #20212A; max-width: 520px;">
        <h2 style="color: #4B73F8;">Alerta de precio Kueski</h2>
        <p>Hola ${userName || 'usuario'},</p>
        <p>Detectamos una bajada en un producto que sigues:</p>
        <p style="font-size: 18px; font-weight: bold;">${productName}</p>
        <p>Precio anterior: <strong>${previousLabel}</strong></p>
        <p>Precio actual: <strong style="color: #16A34A;">${currentLabel}</strong></p>
        <p style="color: #6B7280; font-size: 14px;">Puedes revisar el detalle en tu widget de Kueski.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || 'No se pudo enviar el correo');
  }

  return { sent: true, id: data?.id };
}

module.exports = {
  sendPriceDropEmail,
};

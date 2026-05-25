import { useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import {
  getAppleCalendarUrl,
  getCheckoutAppleCalendarUrl,
  getCheckoutGoogleCalendarStartUrl,
  getGoogleCalendarStartUrl,
  openAppleCalendar,
  openCheckoutAppleCalendar,
} from '../api.js';
import { useNotifications } from '../components/useNotifications.js';

function parsePrice(price) {
  if (!price) return null;
  const value = Number(String(price).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function truncateName(name, limit = 60) {
  if (!name) return "";
  return name.length > limit ? name.substring(0, limit) + "..." : name;
}

function CheckoutPage({ user, product, price, purchaseId, onBack, onResult, onClose, onRequireIdentityVerification }) {
  const { info: notifyInfo, warning: notifyWarning, error: notifyError } = useNotifications();
  const [installments, setInstallments] = useState(3);
  const [calendarMessage, setCalendarMessage] = useState('');

  const capturedAmount = parsePrice(price);
  const requestedAmount = capturedAmount ?? parsePrice(product?.currentPrice) ?? 0;

  const rawName = product?.name || (capturedAmount ? 'Producto de la página actual' : 'Producto seleccionado');
  const productName = truncateName(rawName, 65);

  const limitsByLevel = { 5: 10000, 4: 8000, 3: 6000, 2: 4000, 1: 2000 };
  const userLevel = user?.creditRating || 1;
  const maxAllowed = limitsByLevel[userLevel];

  const isOverLimit = requestedAmount > maxAllowed;

  const fee = requestedAmount * 0.1008;
  const totalCost = requestedAmount + fee;
  const amountPerPayment = (totalCost / installments).toFixed(2);
  const firstPaymentDate = new Date();
  firstPaymentDate.setDate(firstPaymentDate.getDate() + 14);

  const getCheckoutCalendarPayload = () => ({
    productName,
    installmentAmount: amountPerPayment,
    totalInstallments: installments,
    firstPaymentDate: firstPaymentDate.toISOString().slice(0, 10),
  });

  const handleConfirmPurchase = () => {
    if (user?.identidadVerificada === false) {
      notifyWarning('Debes verificar tu identidad antes de confirmar la compra.', {
        title: 'Verificación requerida',
      });
      onRequireIdentityVerification?.();
      return;
    }

    if (!isOverLimit) {
      notifyInfo('Compra validada correctamente.', { title: 'Listo' });
      onResult(true);
    } else {
      notifyError('El monto solicitado excede tu límite disponible.', { title: 'Compra rechazada' });
      onResult(false);
    }
  };

  const handleAddToGoogleCalendar = () => {
    const url = purchaseId
      ? getGoogleCalendarStartUrl(purchaseId)
      : getCheckoutGoogleCalendarStartUrl(getCheckoutCalendarPayload());

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url }, () => {
        if (chrome.runtime?.lastError) {
          window.location.assign(url);
          setCalendarMessage('No se pudo abrir pestaña nueva; se abrió el flujo en esta ventana.');
          notifyWarning('No se pudo abrir una pestaña nueva para Google Calendar.', { title: 'Aviso de calendario' });
          return;
        }

        setCalendarMessage('Se abrió una pestaña para autorizar Google Calendar.');
        notifyInfo('Se abrió el flujo de Google Calendar en una nueva pestaña.', { title: 'Calendario' });
      });
      return;
    }

    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.assign(url);
      setCalendarMessage('Tu navegador bloqueó la ventana emergente; se redirigió en la misma pestaña.');
      notifyWarning('El navegador bloqueó la ventana emergente de Google Calendar.', { title: 'Ventana bloqueada' });
      return;
    }

    setCalendarMessage('Se abrió Google para autorizar y agregar los pagos pendientes al calendario.');
    notifyInfo('Google Calendar se abrió para registrar tus pagos.', { title: 'Calendario' });
  };

  const handleAddToAppleCalendar = async () => {
    const payload = getCheckoutCalendarPayload();
    const url = purchaseId ? getAppleCalendarUrl(purchaseId) : getCheckoutAppleCalendarUrl(payload);

    try {
      if (purchaseId) {
        await openAppleCalendar(purchaseId);
      } else {
        await openCheckoutAppleCalendar(payload);
      }
      return;
    } catch {
      setCalendarMessage('No se pudo abrir Apple Calendar automáticamente; se abrió el archivo de calendario.');
      notifyWarning('No se pudo abrir Apple Calendar automáticamente.', { title: 'Aviso de calendario' });
    }

    window.location.assign(url);
  };

  return (
    <div className="flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <TopBar onClose={onClose} />

      <main className="grow overflow-y-auto px-5 pb-6 pt-2">
        <button
          onClick={onBack}
          className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
        >
          Volver al menú
        </button>

        <div className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#6B7280]">{user?.name} · nivel {userLevel}/5</p>
              <h2 className="mt-1 text-3xl font-bold leading-tight text-[#20212A]">Completa tu compra</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4B73F8]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z" />
              </svg>
            </div>
          </div>

          <section className="mt-6 rounded-3xl border border-[#D1D5DB]/70 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-[#6B7280]">Producto</p>
            <p className="mt-1 text-2xl font-bold leading-tight text-[#20212A]">{productName}</p>
            {capturedAmount && (
              <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#4B73F8]">
                Precio detectado: ${capturedAmount.toFixed(2)}
              </p>
            )}
          </section>

          <section className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
              <svg className="mx-auto h-5 w-5 text-[#4B73F8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016Z" />
              </svg>
              <p className="mt-2 text-[10px] font-bold text-[#20212A]">Seguro</p>
              <p className="text-[10px] font-medium text-[#6B7280]">SSL 256-bit</p>
            </div>

            <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
              <svg className="mx-auto h-5 w-5 text-[#4B73F8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7Z" />
              </svg>
              <p className="mt-2 text-[10px] font-bold text-[#20212A]">Instante</p>
              <p className="text-[10px] font-medium text-[#6B7280]">Aprobación</p>
            </div>

            <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
              <svg className="mx-auto h-5 w-5 text-[#4B73F8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="mt-2 text-[10px] font-bold text-[#20212A]">Flexible</p>
              <p className="text-[10px] font-medium text-[#6B7280]">Plazos</p>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-[#D1D5DB]/70 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm font-bold text-[#20212A]">Plazo preferido</p>
              <div className="text-right">
                <p className="text-lg font-bold leading-none text-[#4B73F8]">
                  {installments} {installments === 1 ? 'quincena' : 'quincenas'}
                </p>
                <p className="mt-1 text-[10px] font-medium text-[#6B7280]">
                  ({installments * 2} semanas totales)
                </p>
              </div>
            </div>
            <div className="relative mt-4 flex h-6 w-full items-center">
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value))}
                className="absolute z-20 h-2 w-full cursor-pointer appearance-none bg-transparent accent-[#4B73F8]"
              />
              <div className="absolute z-10 h-2 w-full rounded-full bg-gray-100">
                {/* El progreso ahora se calcula sobre la base de 1-6 */}
                <div className="h-full rounded-full bg-[#4B73F8]" style={{ width: `${((installments - 1) / 5) * 100}%` }} />
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-3xl bg-[#EEF2FF] p-5">
            <p className="text-sm font-semibold text-[#6B7280]">Pago por quincena</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-black text-[#4B73F8]">${amountPerPayment}</p>
              <p className="text-sm font-bold text-[#6B7280]">
                ({installments} {installments === 1 ? 'pago' : 'pagos'})
              </p>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#4B73F8]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m5 13 4 4L19 7" />
              </svg>
              <span>{installments === 1 ? 'Liquidación inmediata' : 'Primer pago en 14 días'}</span>
            </div>
          </section>

          <section className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <p className="font-medium text-[#6B7280]">Monto solicitado</p>
                <p className="font-bold text-[#20212A]">${requestedAmount.toFixed(2)}</p>
              </div>

              <div className={`flex items-center justify-between rounded-2xl border p-3 text-sm ${
                isOverLimit
                  ? 'border-red-100 bg-red-50 text-[#EF4444]'
                  : 'border-green-100 bg-green-50 text-[#16A34A]'
              }`}>
                <div className="flex items-center gap-2">
                  {isOverLimit ? (
                    <svg className="h-5 w-5 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 12 2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  )}
                  <p className="font-bold">
                    {isOverLimit ? 'Excede límite nivel ' : 'Límite nivel '} {userLevel}
                  </p>
                </div>
                <p className="font-bold">${maxAllowed.toLocaleString('es-MX')}</p>
              </div>

              <div className="flex justify-between text-sm">
                <p className="font-medium text-[#6B7280]">Comisión (10.08%)</p>
                <p className="font-bold text-[#20212A]">${fee.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#D1D5DB]/70 pt-4">
              <p className="text-lg font-bold text-[#20212A]">Costo total</p>
              <p className="text-3xl font-black text-[#4B73F8]">${totalCost.toFixed(2)}</p>
            </div>
          </section>

          <button
            onClick={handleConfirmPurchase}
            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all active:scale-[0.98] ${
              isOverLimit ? 'cursor-not-allowed bg-gray-300 shadow-none' : 'bg-[#4B73F8] hover:bg-[#345ee8]'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z" />
            </svg>
            {isOverLimit ? 'Monto no disponible' : 'Confirmar compra'}
          </button>

          {!isOverLimit && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToGoogleCalendar}
                  className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
                >
                  Google Calendar
                </button>

                <button
                  type="button"
                  onClick={handleAddToAppleCalendar}
                  className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
                >
                  Apple Calendar
                </button>
              </div>

              {calendarMessage && (
                <p className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-[#4B73F8]">
                  {calendarMessage}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CheckoutPage;

import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { getAppleCalendarUrl, getGoogleCalendarStartUrl, getPurchase, openAppleCalendar } from '../api.js';

// Se añade onClose a las props
function ProductPage({ purchaseId, onBack, onClose }) {
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarMessage, setCalendarMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    getPurchase(purchaseId)
      .then((data) => {
        if (!isMounted) return;
        setPurchase(data.purchase);
        setError('');
      })
      .catch((apiError) => {
        if (!isMounted) return;
        setError(apiError.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [purchaseId]);

  const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

  const nextPayment = purchase?.nextPaymentDate
    ? new Date(purchase.nextPaymentDate).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
    : 'Pendiente';

  const handleAddToCalendar = () => {
    if (!purchaseId) {
      setCalendarMessage('No se encontró la compra para sincronizar el calendario.');
      return;
    }

    const url = getGoogleCalendarStartUrl(purchaseId);

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url }, () => {
        if (chrome.runtime?.lastError) {
          window.location.assign(url);
          setCalendarMessage('No se pudo abrir pestaña nueva; se abrió el flujo en esta ventana.');
          return;
        }

        setCalendarMessage('Se abrió una pestaña para autorizar Google Calendar.');
      });
      return;
    }

    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.assign(url);
      setCalendarMessage('Tu navegador bloqueó la ventana emergente; se redirigió en la misma pestaña.');
      return;
    }

    setCalendarMessage('Se abrió Google para autorizar y agregar los pagos pendientes al calendario.');
  };

  const handleAddToAppleCalendar = async () => {
    if (!purchaseId) {
      setCalendarMessage('No se encontró la compra para sincronizar el calendario.');
      return;
    }

    const url = getAppleCalendarUrl(purchaseId);

    try {
      await openAppleCalendar(purchaseId);
      return;
    } catch {
      setCalendarMessage('No se pudo abrir Apple Calendar automáticamente; se abrió el archivo de calendario.');
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

        {isLoading && (
          <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-[#4B73F8]">
            Cargando compra...
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#EF4444]">
            {error}
          </p>
        )}

        {purchase && (
          <div className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#6B7280]">Seguimiento de pagos</p>
                <h2 className="mt-1 text-3xl font-bold leading-tight text-[#20212A]">Compra activa</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4B73F8]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
                </svg>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[#D1D5DB]/70 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-[#6B7280]">Producto</p>
              <p className="mt-1 text-2xl font-bold leading-tight text-[#20212A]">{purchase.productName}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
                <p className="text-xs font-bold text-[#6B7280]">Próximo pago</p>
                <p className="mt-2 text-sm font-bold text-[#20212A]">{nextPayment}</p>
              </div>
              <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
                <p className="text-xs font-bold text-[#6B7280]">Restantes</p>
                <p className="mt-2 text-sm font-bold text-[#20212A]">{purchase.remainingInstallments}</p>
              </div>
              <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
                <p className="text-xs font-bold text-[#6B7280]">Progreso</p>
                <p className="mt-2 text-sm font-bold text-[#20212A]">{purchase.progressPercent}%</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-base font-bold text-[#20212A]">Progreso de pago</p>
              <p className="text-sm font-semibold text-[#6B7280]">{purchase.completedInstallments} de {purchase.totalInstallments}</p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-[#4B73F8]" style={{ width: `${purchase.progressPercent}%` }} />
            </div>

            <div className="mt-5 rounded-3xl bg-[#EEF2FF] p-5">
              <p className="text-sm font-semibold text-[#6B7280]">Pago quincenal</p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-black text-[#4B73F8]">{formatMoney(purchase.installmentAmount)}</p>
                <p className="mb-1 text-sm font-semibold text-[#6B7280]">({purchase.totalInstallments} pagos)</p>
              </div>
              <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#4B73F8]">Pagos al corriente</p>
            </div>

            <div className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-[#6B7280]">Precio original</p>
                  <p className="font-bold text-[#20212A]">{formatMoney(purchase.originalPrice)}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-[#6B7280]">Pagado hasta hoy</p>
                  <p className="font-bold text-[#16A34A]">{formatMoney(purchase.paidSoFar)}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-[#6B7280]">Saldo restante</p>
                  <p className="font-bold text-[#20212A]">{formatMoney(purchase.remainingBalance)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#D1D5DB]/70 pt-4">
                <p className="text-base font-bold text-[#20212A]">Costo total</p>
                <p className="text-2xl font-black text-[#4B73F8]">{formatMoney(purchase.totalCost)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCalendar}
                className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
              >
                Google Calendar
              </button>

              <button
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
      </main>
    </div>
  );
}

export default ProductPage;

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
      setCalendarMessage('Se intentó abrir Apple Calendar automáticamente.');
      return;
    } catch {
      setCalendarMessage('No se pudo abrir Apple Calendar automáticamente; se abrió el archivo de calendario.');
    }

    window.location.assign(url);
  };

  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      {/* Se pasa la prop onClose al TopBar */}
      <TopBar onClose={onClose} />

      <div className="grow rounded-b-2xl border-x border-b border-slate-200 bg-[#f5f5f5] p-4 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full bg-slate-200 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-300 active:scale-95 transition-all"
        >
          Volver al menú
        </button>

        {isLoading && (
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700">
            Cargando compra...
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {purchase && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div>
                  <h2 className="text-[24px] font-semibold leading-none">Compra Activa</h2>
                  <p className="text-xs text-slate-500 mt-1">Seguimiento de pagos</p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm text-slate-500">Producto</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1">{purchase.productName}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
                <p className="text-sm font-medium mt-1">Próximo pago</p>
                <p className="text-sm text-slate-500 mt-1">{nextPayment}</p>
              </div>
              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
                <p className="text-sm font-medium mt-1">Restantes</p>
                <p className="text-sm text-slate-500 mt-1">{purchase.remainingInstallments} pagos</p>
              </div>
              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
                <p className="text-sm font-medium mt-1">Progreso</p>
                <p className="text-sm text-slate-500 mt-1">{purchase.progressPercent}%</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-lg font-medium">Progreso de Pago</p>
              <p className="text-slate-500">{purchase.completedInstallments} de {purchase.totalInstallments} completados</p>
            </div>

            <div className="mt-2 h-3 rounded-full bg-slate-300 overflow-hidden">
              <div className="h-full bg-[#0057ff]" style={{ width: `${purchase.progressPercent}%` }} />
            </div>

            <div className="mt-4 rounded-2xl bg-[#e4e8f0] p-4">
              <p className="text-slate-500">Pago quincenal</p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-2xl font-bold text-[#0057ff]">{formatMoney(purchase.installmentAmount)}</p>
                <p className="text-slate-500 mb-1">({purchase.totalInstallments} pagos)</p>
              </div>
              <p className="mt-2 text-[#0057ff]">Pagos al corriente</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-slate-500">Precio original</p>
                <p>{formatMoney(purchase.originalPrice)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-500">Pagado hasta hoy</p>
                <p className="text-[#16a34a]">{formatMoney(purchase.paidSoFar)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-500">Saldo restante</p>
                <p>{formatMoney(purchase.remainingBalance)}</p>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xl font-medium">Costo total</p>
                <p className="text-3xl font-bold text-[#0057ff]">{formatMoney(purchase.totalCost)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={handleAddToCalendar}
                className="w-full rounded-xl border border-slate-300 bg-[#f5f5f5] py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
              >
                Google Calendar
              </button>

              <button
                onClick={handleAddToAppleCalendar}
                className="w-full rounded-xl border border-slate-300 bg-[#f5f5f5] py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
              >
                Apple Calendar
              </button>
            </div>
            {calendarMessage && (
              <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700">
                {calendarMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductPage;
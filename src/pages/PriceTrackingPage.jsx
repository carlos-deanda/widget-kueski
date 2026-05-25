import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { getPriceTracking } from '../api.js';

function PriceTrackingPage({ trackingId, onBack, onCheckout, onClose }) { // Se añade onClose a las props
  const [tracking, setTracking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    getPriceTracking(trackingId)
      .then((data) => {
        if (!isMounted) return;
        setTracking(data.tracking);
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
  }, [trackingId]);

  const formatMoney = (value) => {
    const numericValue = Number(value || 0);
    const sign = numericValue < 0 ? '-' : '';
    return `${sign}$${Math.abs(numericValue).toFixed(2)}`;
  };

  // Variable auxiliar para determinar el color según el valor de ahorro
  const savingsColor = tracking?.savings < 0 ? 'text-[#EF4444]' : 'text-[#16A34A]';

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
            Cargando seguimiento...
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#EF4444]">
            {error}
          </p>
        )}

        {tracking && (
          <div className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#6B7280]">Monitoreo de precios 24/7</p>
                <h2 className="mt-1 text-3xl font-bold leading-tight text-[#20212A]">Seguimiento</h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4B73F8]">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-[#D1D5DB]/70 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-[#6B7280]">Producto</p>
                  <p className="mt-1 text-xl font-bold leading-tight text-[#20212A]">{tracking.productName}</p>
                </div>

                <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  tracking.trend === 'down' ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-[#EF4444]'
                }`}>
                  {tracking.trend === 'down' ? 'Bajó' : 'Subió'} {tracking.change}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
                <svg className="mx-auto h-5 w-5 text-[#4B73F8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
                </svg>
                <p className="mt-2 text-[10px] font-bold text-[#20212A]">Alerta</p>
                <p className="text-[10px] font-medium text-[#6B7280]">{tracking.isActive ? 'Activa' : 'Pausada'}</p>
              </div>

              <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
                <svg className="mx-auto h-5 w-5 text-[#4B73F8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8-8 8-4-4-6 6" />
                </svg>
                <p className="mt-2 text-[10px] font-bold text-[#20212A]">Mínimo</p>
                <p className="text-[10px] font-medium text-[#6B7280]">{formatMoney(tracking.historicalLow)}</p>
              </div>

              <div className="rounded-2xl border border-[#D1D5DB]/70 bg-white p-3 text-center shadow-sm">
                <svg className="mx-auto h-5 w-5 text-[#4B73F8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="mt-2 text-[10px] font-bold text-[#20212A]">Ahorro</p>
                <p className={`text-[10px] font-bold ${savingsColor}`}>{formatMoney(tracking.savings)}</p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl bg-[#EEF2FF] p-5">
              <p className="text-sm font-semibold text-[#6B7280]">Precio actual</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-4xl font-black text-[#4B73F8]">{formatMoney(tracking.currentPrice)}</p>
                <div className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-bold text-[#16A34A]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  Vivo
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-[#6B7280]">Precio inicial</p>
                  <p className="font-bold text-[#20212A]">{formatMoney(tracking.firstSeenPrice)}</p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-[#6B7280]">Mínimo histórico</p>
                  <p className="font-bold text-[#16A34A]">{formatMoney(tracking.historicalLow)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#D1D5DB]/70 pt-4">
                <p className="text-base font-bold text-[#20212A]">Ahorro potencial</p>
                <p className={`text-2xl font-black ${savingsColor}`}>{formatMoney(tracking.savings)}</p>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98]"
            >
              Comprar con Kueski Pay
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default PriceTrackingPage;

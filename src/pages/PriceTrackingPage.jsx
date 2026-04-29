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
  const savingsColor = tracking?.savings < 0 ? 'text-red-600' : 'text-green-600';

  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      {/* Se pasa la prop onClose al TopBar */}
      <TopBar onClose={onClose} />

      <div className="grow rounded-b-2xl border-x border-b border-slate-200 bg-[#f5f5f5] p-4 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full bg-slate-200 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-300 active:scale-95 transition-all mb-4"
        >
          Volver al menú
        </button>

        {isLoading && (
          <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700">
            Cargando seguimiento...
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {tracking && (
          <div className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[24px] font-semibold leading-none text-slate-900 tracking-tight">Seguimiento</h2>
                <p className="text-xs text-slate-500 mt-1">Monitoreo de precios 24/7</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#0057ff] text-white flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="w-7 h-7 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center text-xs font-serif">i</div>
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between">
              <div className="flex-1 pr-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Producto</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 leading-tight">{tracking.productName}</p>
              </div>

              <div className={`rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 ${
                tracking.trend === 'down' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {tracking.trend === 'down' ? '↓' : '↑'} {tracking.change}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center flex flex-col items-center">
                <svg className="w-6 h-6 text-[#0057ff] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-[10px] font-bold text-[#0057ff] uppercase">Alerta</p>
                <p className="text-[10px] text-slate-500">{tracking.isActive ? 'Activa' : 'Pausada'}</p>
              </div>

              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center flex flex-col items-center">
                <svg className="w-6 h-6 text-[#0057ff] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <p className="text-[10px] font-bold text-[#0057ff] uppercase">Mínimo</p>
                <p className="text-[10px] text-slate-500">{formatMoney(tracking.historicalLow)}</p>
              </div>

              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center flex flex-col items-center">
                <svg className="w-6 h-6 text-[#0057ff] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[10px] font-bold text-[#0057ff] uppercase">Ahorro</p>
                <p className={`text-[10px] ${savingsColor}`}>{formatMoney(tracking.savings)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-[#e4e8f0] p-5 border border-slate-200 shadow-inner">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Precio Actual</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className="text-4xl font-black text-[#0057ff] tracking-tighter">{formatMoney(tracking.currentPrice)}</p>
                <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-white px-2 py-0.5 rounded-md shadow-sm">
                   <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  VIVO
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <p className="text-slate-500 font-medium">Precio inicial</p>
                <p className="font-bold text-slate-700">{formatMoney(tracking.firstSeenPrice)}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-slate-500 font-medium">Mínimo histórico</p>
                <p className="font-bold text-green-600">{formatMoney(tracking.historicalLow)}</p>
              </div>

              <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
                <p className="text-base font-bold text-slate-900">Tu ahorro potencial</p>
                <p className={`text-2xl font-black ${savingsColor}`}>{formatMoney(tracking.savings)}</p>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="mt-6 w-full rounded-2xl bg-[#0057ff] py-4 text-white font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              Comprar con Kueski Pay
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceTrackingPage;
import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { getPriceTracking } from '../api.js';

function PriceTrackingPage({ trackingId, onBack, onCheckout }) {
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

  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      <TopBar />

      <div className="grow rounded-b-2xl border-x border-b border-slate-200 bg-[#f5f5f5] p-4 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full bg-slate-200 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-300 active:scale-95 transition-all"
        >
          Volver al menu
        </button>

        {isLoading && (
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700">
            Cargando seguimiento...
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {tracking && (
          <div className="mt-4 rounded-2xl border border-green-200 bg-[#f8f8f8] p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[24px] font-semibold leading-none text-slate-900">Price Tracking</h2>
                <p className="text-xs text-slate-500 mt-1">Monitoring price changes</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#0057ff] text-white flex items-center justify-center text-sm">⏰</div>
                <div className="w-7 h-7 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center text-sm">i</div>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-sm text-slate-500">Product</p>
                <p className="text-xl font-semibold text-slate-900 mt-1">{tracking.productName}</p>
              </div>

              <div className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-600">
                {tracking.trend === 'down' ? '↘' : '↗'} {tracking.change}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
                <p className="text-2xl text-[#0057ff]">◷</p>
                <p className="text-sm font-medium mt-1">Alert</p>
                <p className="text-xs text-slate-500">{tracking.isActive ? 'Active' : 'Paused'}</p>
              </div>

              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
                <p className="text-2xl text-[#0057ff]">◎</p>
                <p className="text-sm font-medium mt-1">Lowest</p>
                <p className="text-xs text-slate-500">{formatMoney(tracking.historicalLow)}</p>
              </div>

              <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
                <p className="text-2xl text-[#0057ff]">ϟ</p>
                <p className="text-sm font-medium mt-1">Ahorro</p>
                <p className="text-xs text-slate-500">{formatMoney(tracking.savings)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[#e4e8f0] p-4">
              <p className="text-slate-500">Current Price</p>

              <div className="mt-1 flex items-end gap-2">
                <p className="text-3xl font-bold text-[#0057ff]">{formatMoney(tracking.currentPrice)}</p>
                <p className="text-green-600 mb-2 text-xs font-medium">Monitoring</p>
              </div>

              <p className="mt-2 text-slate-500 text-sm">
                <span className="text-[#0057ff]">◎</span> Monitoring 24/7
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-slate-500">Current price</p>
                <p className="font-semibold">{formatMoney(tracking.currentPrice)}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-slate-500">First seen price</p>
                <p className="font-semibold text-[#0057ff]">{formatMoney(tracking.firstSeenPrice)}</p>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-slate-500">Historical Low</p>
                <p className="font-semibold text-green-600">{formatMoney(tracking.historicalLow)}</p>
              </div>

              <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
                <p className="text-md font-medium">Ahorro</p>
                <p className="text-xl font-bold text-green-600">{formatMoney(tracking.savings)}</p>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="mt-4 w-full rounded-xl bg-[#0057ff] py-3 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all"
            >
              Buy with Kueski Pay
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceTrackingPage;

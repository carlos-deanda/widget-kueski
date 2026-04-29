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

function parsePrice(price) {
  if (!price) return null;
  const value = Number(String(price).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function truncateName(name, limit = 60) {
  if (!name) return "";
  return name.length > limit ? name.substring(0, limit) + "..." : name;
}

function CheckoutPage({ user, product, price, onBack, onResult }) {
  const [weeks, setWeeks] = useState(12);

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
  const biweeklyPayments = Math.ceil(weeks / 2);
  const amountPerPayment = (totalCost / biweeklyPayments).toFixed(2);

  const handleConfirmPurchase = () => {
    if (!isOverLimit) {
      onResult(true);  
    } else {
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
          setCalendarMessage('No se pudo abrir pestaña nueva; se abrio el flujo en esta ventana.');
          return;
        }

        setCalendarMessage('Se abrio una pestaña para autorizar Google Calendar.');
      });
      return;
    }

    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      window.location.assign(url);
      setCalendarMessage('Tu navegador bloqueo la ventana emergente; se redirigio en la misma pestaña.');
      return;
    }

    setCalendarMessage('Se abrio Google para autorizar y agregar los pagos pendientes al calendario.');
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
      setCalendarMessage('No se pudo abrir Apple Calendar automaticamente; se abrio el archivo de calendario.');
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
          className="w-full bg-slate-200 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-300 active:scale-95 transition-all mb-4"
        >
          Volver al menú
        </button>

        <div className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm mb-6">
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold leading-tight text-slate-900">Completa tu compra</h2>
            <p className="text-xs text-slate-500 mt-1">{user?.name} · nivel {userLevel}/5</p>
          </div>

          <div className="mt-5 mb-6">
            <p className="text-sm text-slate-500 font-medium">Producto</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{productName}</p>
            {capturedAmount && (
              <p className="mt-1 text-xs font-medium text-[#0057ff]">
                Precio detectado: ${capturedAmount.toFixed(2)}
              </p>
            )}
          </div>

          {/* ICONOS DEL GRID */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center flex flex-col items-center">
              <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-[10px] font-bold text-blue-900 uppercase">Seguro</p>
              <p className="text-[9px] text-blue-700 leading-tight">SSL 256-bit</p>
            </div>
            
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center flex flex-col items-center">
              <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-[10px] font-bold text-blue-900 uppercase">Instante</p>
              <p className="text-[9px] text-blue-700 leading-tight">Aprobación</p>
            </div>

            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center flex flex-col items-center">
              <svg className="w-6 h-6 text-blue-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[10px] font-bold text-blue-900 uppercase">Flexible</p>
              <p className="text-[9px] text-blue-700 leading-tight">Plazos</p>
            </div>
          </div>

          {/* AJUSTE DE RANGO: De 1 a 6 quincenas */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm font-bold text-slate-700">Plazo preferido</p>
              <div className="text-right">
                <p className="text-[#0057ff] font-bold text-lg leading-none">
                  {installments} {installments === 1 ? 'quincena' : 'quincenas'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  ({installments * 2} semanas totales)
                </p>
              </div>
            </div>
            <div className="relative w-full h-6 flex items-center">
              <input
                type="range"
                min="1"
                max="6"
                step="1"
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value))}
                className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20 accent-slate-900"
              />
              <div className="absolute w-full h-2 bg-slate-200 rounded-full z-10">
                {/* El progreso ahora se calcula sobre la base de 1-6 */}
                <div className="h-full bg-slate-900 rounded-full" style={{ width: `${((installments - 1) / 5) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* BLOQUE DE PAGO QUINCENAL */}
          <div className="rounded-2xl bg-[#e4e8f0] p-5 mb-6 border border-slate-200 shadow-inner">
            <p className="text-slate-500 text-sm font-medium mb-1">Pago por quincena</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-[#0057ff]">${amountPerPayment}</p>
              <p className="text-slate-600 font-bold text-sm">
                ({installments} {installments === 1 ? 'pago' : 'pagos'})
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[#0057ff] text-xs font-bold">
              <div className="w-4 h-4 rounded-full border-2 border-[#0057ff] flex items-center justify-center text-[10px]">
                ✓
              </div>
              <span>{installments === 1 ? 'Liquidación inmediata' : 'Primer pago en 14 días'}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <p className="text-slate-500">Monto solicitado</p>
              <p className="font-bold text-slate-900">${requestedAmount.toFixed(2)}</p>
            </div>
            
            <div className={`flex justify-between text-sm items-center p-3 rounded-lg border transition-all ${
              isOverLimit 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                {isOverLimit ? (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className="font-medium">
                  {isOverLimit ? 'Excede límite nivel ' : 'Límite nivel '} {userLevel}
                </p>
              </div>
              <p className="font-bold">${maxAllowed.toLocaleString('es-MX')}</p>
            </div>

            <div className="flex justify-between text-sm">
              <p className="text-slate-500">Comisión (10.08%)</p>
              <p className="font-bold text-slate-900">${fee.toFixed(2)}</p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <p className="text-lg font-bold text-slate-900">Costo total</p>
              <p className="text-3xl font-black text-[#0057ff]">${totalCost.toFixed(2)}</p>
            </div>
          </div>

          <button 
            onClick={handleConfirmPurchase} 
            className={`w-full text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
              isOverLimit ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#2563eb]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {isOverLimit ? 'Monto no disponible' : 'Confirmar compra'}
          </button>

          {!isOverLimit && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToGoogleCalendar}
                  className="w-full rounded-xl border border-slate-300 bg-[#f5f5f5] py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  Google Calendar
                </button>

                <button
                  type="button"
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
    </div>
  );
}

export default CheckoutPage;

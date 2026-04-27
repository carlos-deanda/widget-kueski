import React, { useState } from 'react';
import TopBar from '../components/TopBar.jsx';

function CheckoutPage({ user, product, onBack }) {
  // Estado para controlar las semanas (mínimo 4, máximo 52)
  const [weeks, setWeeks] = useState(12);
  const productName = product?.name || 'Producto seleccionado';
  const requestedAmount = Number(product?.currentPrice || 0);
  const approvedAmount = Math.min(requestedAmount, Number(user?.creditRemaining || 0));
  const fee = approvedAmount * 0.1008;
  const totalCost = approvedAmount + fee;

  // Cálculo dinámico simple para tus pruebas
  const biweeklyPayments = Math.ceil(weeks / 2);
  const amount = (totalCost / biweeklyPayments).toFixed(2);

  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      <TopBar />

      <div className="grow rounded-b-2xl border-x border-b border-slate-200 bg-[#f5f5f5] p-4 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full bg-slate-200 text-slate-800 font-bold py-3 rounded-xl hover:bg-slate-300 active:scale-95 transition-all mb-4"
        >
          Volver al menu
        </button>

        <div className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm mb-6">
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold leading-tight text-slate-900">Complete Your Purchase</h2>
            <p className="text-xs text-slate-500 mt-1">{user?.name} · rating {user?.creditRating}/5</p>
          </div>

          <div className="mt-5 mb-6">
            <p className="text-sm text-slate-500 font-medium">Product</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{productName}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Credito disponible: ${Number(user?.creditRemaining || 0).toLocaleString('en-US')}
            </p>
          </div>

          {/* Grid de Beneficios */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <span className="block text-blue-600 text-lg mb-1">🛡️</span>
              <p className="text-[10px] font-bold text-blue-900 uppercase">Secure</p>
              <p className="text-[9px] text-blue-700">256-bit SSL</p>
            </div>
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <span className="block text-blue-600 text-lg mb-1">⚡</span>
              <p className="text-[10px] font-bold text-blue-900 uppercase">Instant</p>
              <p className="text-[9px] text-blue-700">Approval</p>
            </div>
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <span className="block text-blue-600 text-lg mb-1">⏰</span>
              <p className="text-[10px] font-bold text-blue-900 uppercase">Flexible</p>
              <p className="text-[9px] text-blue-700">Terms</p>
            </div>
          </div>

          {/* BARRA DE PLAZOS INTERACTIVA */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm font-bold text-slate-700">Plazo (semanas)</p>
              <div className="text-right">
                <p className="text-[#0057ff] font-bold text-lg leading-none">{weeks} semanas</p>
                <p className="text-[10px] text-slate-500 mt-1">({biweeklyPayments} pagos quincenales)</p>
              </div>
            </div>
            
            <div className="relative w-full h-6 flex items-center">
              {/* Input invisible que captura el movimiento */}
              <input
                type="range"
                min="4"
                max="52"
                step="4"
                value={weeks}
                onChange={(e) => setWeeks(parseInt(e.target.value))}
                className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20 accent-slate-900"
              />
              {/* Barra visual de fondo para que se vea como en la foto */}
              <div className="absolute w-full h-2 bg-slate-200 rounded-full z-10">
                <div 
                  className="h-full bg-slate-900 rounded-full" 
                  style={{ width: `${((weeks - 4) / 48) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
              <span>4 semanas</span>
              <span>52 semanas</span>
            </div>
          </div>

          {/* Caja de Pago dinámico */}
          <div className="rounded-2xl bg-[#e4e8f0] p-5 text-left mb-6 border border-slate-200 shadow-inner">
            <p className="text-slate-500 text-sm font-medium">Pago quincenal</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-5xl font-black text-[#0057ff]">${amount}</p>
              <p className="text-slate-600 font-bold text-lg">({biweeklyPayments} pagos)</p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-blue-600 text-xs font-bold">
              <div className="w-4 h-4 rounded-full border-2 border-blue-600 flex items-center justify-center text-[10px]">✓</div>
              <span>First payment in 14 days</span>
            </div>
          </div>

          {/* Desglose de Costos */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <p className="text-slate-500">Monto solicitado</p>
              <p className="font-bold text-slate-900">${requestedAmount.toFixed(2)}</p>
            </div>
            <div className="flex justify-between text-sm">
              <p className="text-slate-500">Monto aprobado</p>
              <p className="font-bold text-slate-900">${approvedAmount.toFixed(2)}</p>
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

          <button className="w-full bg-[#2563eb] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
            <span>💳</span> Confirmar compra
          </button>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;

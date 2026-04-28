import React, { useState } from 'react';
import TopBar from '../components/TopBar.jsx';

function CreditPage({ onBack }) {
  const [creditAmount, setCreditAmount] = useState(2500);
  const [paymentType, setPaymentType] = useState('single');
  const [singleTerm, setSingleTerm] = useState(15);
  const [biweeklyPayments, setBiweeklyPayments] = useState(4);

  const interestRate = paymentType === 'single' ? 0.08 : 0.12;
  const interest = creditAmount * interestRate;
  const total = creditAmount + interest;
  const paymentAmount =
    paymentType === 'single' ? total : total / biweeklyPayments;

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

        <div className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm">
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold leading-tight text-slate-900">
              Solicita tu crédito
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Elige el monto y la forma de pago
            </p>
          </div>

          <div className="mb-7">
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm font-bold text-slate-700">
                Monto del crédito
              </p>
              <p className="text-[#0057ff] font-black text-2xl">
                ${creditAmount.toLocaleString()}
              </p>
            </div>

            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={creditAmount}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              className="w-full accent-[#0057ff] cursor-pointer"
            />

            <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
              <span>$500</span>
              <span>$10,000</span>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm font-bold text-slate-700 mb-3">
              Método de pago
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentType('single')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  paymentType === 'single'
                    ? 'border-[#0057ff] bg-[#e8eefc] text-[#0057ff]'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <p className="font-bold text-sm">Un solo pago</p>
                <p className="text-xs mt-1">Paga en 15 o 30 días</p>
              </button>

              <button
                onClick={() => setPaymentType('biweekly')}
                className={`rounded-xl border p-3 text-left transition-all ${
                  paymentType === 'biweekly'
                    ? 'border-[#0057ff] bg-[#e8eefc] text-[#0057ff]'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <p className="font-bold text-sm">Quincenas</p>
                <p className="text-xs mt-1">Divide tu pago</p>
              </button>
            </div>
          </div>

          {paymentType === 'single' ? (
            <div className="mb-6">
              <p className="text-sm font-bold text-slate-700 mb-3">
                ¿Cuándo quieres pagar?
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[15, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSingleTerm(days)}
                    className={`rounded-xl border py-3 font-bold transition-all ${
                      singleTerm === days
                        ? 'border-[#0057ff] bg-[#0057ff] text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {days} días
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <p className="text-sm font-bold text-slate-700">
                  Número de quincenas
                </p>
                <p className="text-[#0057ff] font-bold text-lg">
                  {biweeklyPayments} quincenas
                </p>
              </div>

              <input
                type="range"
                min="2"
                max="12"
                step="1"
                value={biweeklyPayments}
                onChange={(e) => setBiweeklyPayments(Number(e.target.value))}
                className="w-full accent-[#0057ff] cursor-pointer"
              />

              <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
                <span>2</span>
                <span>12</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#e4e8f0] p-5 mb-5 border border-slate-200">
            <p className="text-slate-500 text-sm font-medium">
              {paymentType === 'single' ? 'Pago total' : 'Pago por quincena'}
            </p>

            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-black text-[#0057ff]">
                ${paymentAmount.toFixed(2)}
              </p>
            </div>

            <p className="mt-2 text-xs font-bold text-blue-600">
              {paymentType === 'single'
                ? `Pagar en ${singleTerm} días`
                : `${biweeklyPayments} pagos quincenales`}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <p className="text-slate-500">Préstamo solicitado</p>
              <p className="font-bold text-slate-900">
                ${creditAmount.toFixed(2)}
              </p>
            </div>

            <div className="flex justify-between text-sm">
              <p className="text-slate-500">
                Interés ({(interestRate * 100).toFixed(0)}%)
              </p>
              <p className="font-bold text-slate-900">
                ${interest.toFixed(2)}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <p className="text-lg font-bold text-slate-900">Total a pagar</p>
              <p className="text-2xl font-black text-[#0057ff]">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          <button className="w-full bg-[#2563eb] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-transform">
            Confirmar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreditPage;
import React, { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { getCreditOptions, requestCredit } from '../api.js';

function CreditPage({ user, onBack, onCreditApproved }) {
  const [creditAmount, setCreditAmount] = useState(500);
  const [paymentType, setPaymentType] = useState('single');
  const [singleTerm, setSingleTerm] = useState(15);
  const [biweeklyPayments, setBiweeklyPayments] = useState(4);
  const [options, setOptions] = useState(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    getCreditOptions(user.id)
      .then((data) => {
        if (!isMounted) return;
        setOptions(data.options);
        setCurrentUser(data.user);
        setCreditAmount(Math.min(data.options.minAmount, data.options.maxAmount));
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
  }, [user.id]);

  const minAmount = options?.minAmount || 500;
  const maxAmount = options?.maxAmount || 500;
  const step = options?.step || 500;
  const canRequestCredit = maxAmount >= minAmount;
  const interestRate = paymentType === 'single'
    ? options?.singleInterestRate || 0.08
    : options?.biweeklyInterestRate || 0.12;
  const interest = creditAmount * interestRate;
  const total = creditAmount + interest;
  const paymentAmount =
    paymentType === 'single' ? total : total / biweeklyPayments;

  const handleConfirm = async () => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const data = await requestCredit(user.id, {
        amount: creditAmount,
        paymentType,
        singleTerm,
        biweeklyPayments,
      });
      setCurrentUser(data.user);
      onCreditApproved(data.user);
      setSuccess(`Solicitud aprobada. Tu credito disponible ahora es $${Number(data.user.creditRemaining).toLocaleString('en-US')}.`);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Nivel {currentUser.creditRating}/5 · disponible actual ${Number(currentUser.creditRemaining || 0).toLocaleString('en-US')}
            </p>
          </div>

          {isLoading && (
            <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700">
              Cargando opciones...
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">
              {success}
            </p>
          )}

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
              min={minAmount}
              max={maxAmount}
              step={step}
              value={creditAmount}
              onChange={(e) => setCreditAmount(Number(e.target.value))}
              disabled={isLoading || isSubmitting || !canRequestCredit}
              className="w-full accent-[#0057ff] cursor-pointer"
            />

            <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
              <span>${minAmount.toLocaleString()}</span>
              <span>${maxAmount.toLocaleString()}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Maximo permitido para tu nivel: ${maxAmount.toLocaleString()}
            </p>
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

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isSubmitting || !canRequestCredit}
            className="w-full bg-[#2563eb] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreditPage;

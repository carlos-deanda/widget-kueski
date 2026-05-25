import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { getCreditOptions, requestCredit } from '../api.js';
import { useNotifications } from '../components/useNotifications.js';

function CreditPage({ user, onBack, onCreditApproved, onClose }) { // Se añade onClose a las props
  const { error: notifyError, success: notifySuccess } = useNotifications();
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
        notifyError(apiError.message, { title: 'Error en opciones de crédito' });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [notifyError, user.id]);

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
      setSuccess(`Solicitud aprobada. Tu crédito disponible ahora es $${Number(data.user.creditRemaining).toLocaleString('es-MX')}.`);
      notifySuccess('Tu solicitud de crédito fue aprobada.', { title: 'Crédito aprobado' });
    } catch (apiError) {
      setError(apiError.message);
      notifyError(apiError.message, { title: 'No se pudo aprobar el crédito' });
    } finally {
      setIsSubmitting(false);
    }
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
              <p className="text-sm font-semibold text-[#6B7280]">
                Nivel {currentUser.creditRating}/5 · disponible ${Number(currentUser.creditRemaining || 0).toLocaleString('es-MX')}
              </p>
              <h2 className="mt-1 text-3xl font-bold leading-tight text-[#20212A]">
                Solicita tu crédito
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4B73F8]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>

          {isLoading && (
            <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-[#4B73F8]">
              Cargando opciones...
            </p>
          )}

          {error && (
            <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#EF4444]">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-[#16A34A]">
              {success}
            </p>
          )}

          <section className="mt-6 rounded-3xl border border-[#D1D5DB]/70 bg-white p-4 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm font-bold text-[#20212A]">
                Monto del crédito
              </p>
              <p className="text-3xl font-black text-[#4B73F8]">
                ${creditAmount.toLocaleString('es-MX')}
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
              className="mt-5 w-full cursor-pointer accent-[#4B73F8] disabled:cursor-not-allowed"
            />

            <div className="mt-2 flex justify-between text-xs font-semibold text-[#6B7280]">
              <span>${minAmount.toLocaleString('es-MX')}</span>
              <span>${maxAmount.toLocaleString('es-MX')}</span>
            </div>
            <p className="mt-3 text-xs font-medium text-[#6B7280]">
              Máximo permitido para tu nivel: ${maxAmount.toLocaleString('es-MX')}
            </p>
          </section>

          <section className="mt-5">
            <p className="mb-3 text-sm font-bold text-[#20212A]">
              Método de pago
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentType('single')}
                className={`rounded-3xl border p-4 text-left transition-all active:scale-[0.98] ${
                  paymentType === 'single'
                    ? 'border-[#4B73F8] bg-[#EEF2FF] text-[#4B73F8]'
                    : 'border-[#D1D5DB] bg-white text-[#20212A] hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-bold">Un solo pago</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">Paga en 15 o 30 días</p>
              </button>

              <button
                onClick={() => setPaymentType('biweekly')}
                className={`rounded-3xl border p-4 text-left transition-all active:scale-[0.98] ${
                  paymentType === 'biweekly'
                    ? 'border-[#4B73F8] bg-[#EEF2FF] text-[#4B73F8]'
                    : 'border-[#D1D5DB] bg-white text-[#20212A] hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-bold">Quincenas</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280]">Divide tu pago</p>
              </button>
            </div>
          </section>

          {paymentType === 'single' ? (
            <section className="mt-5">
              <p className="mb-3 text-sm font-bold text-[#20212A]">
                ¿Cuándo quieres pagar?
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[15, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => setSingleTerm(days)}
                    className={`rounded-full border py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                      singleTerm === days
                        ? 'border-[#4B73F8] bg-[#4B73F8] text-white'
                        : 'border-[#D1D5DB] bg-gray-50 text-[#20212A] hover:bg-gray-100'
                    }`}
                  >
                    {days} días
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-5 rounded-3xl border border-[#D1D5DB]/70 bg-white p-4 shadow-sm">
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm font-bold text-[#20212A]">
                  Número de quincenas
                </p>
                <p className="text-lg font-bold text-[#4B73F8]">
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
                className="mt-5 w-full cursor-pointer accent-[#4B73F8]"
              />

              <div className="mt-2 flex justify-between text-xs font-semibold text-[#6B7280]">
                <span>2</span>
                <span>12</span>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-3xl bg-[#EEF2FF] p-5">
            <p className="text-sm font-semibold text-[#6B7280]">
              {paymentType === 'single' ? 'Pago total' : 'Pago por quincena'}
            </p>

            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-3xl font-black text-[#4B73F8]">
                ${paymentAmount.toFixed(2)}
              </p>
            </div>

            <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-[#4B73F8]">
              {paymentType === 'single'
                ? `Pagar en ${singleTerm} días`
                : `${biweeklyPayments} pagos quincenales`}
            </p>
          </section>

          <section className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <p className="font-medium text-[#6B7280]">Préstamo solicitado</p>
                <p className="font-bold text-[#20212A]">
                  ${creditAmount.toFixed(2)}
                </p>
              </div>

              <div className="flex justify-between text-sm">
                <p className="font-medium text-[#6B7280]">
                  Interés ({(interestRate * 100).toFixed(0)}%)
                </p>
                <p className="font-bold text-[#20212A]">
                  ${interest.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#D1D5DB]/70 pt-4">
              <p className="text-lg font-bold text-[#20212A]">Total a pagar</p>
              <p className="text-2xl font-black text-[#4B73F8]">
                ${total.toFixed(2)}
              </p>
            </div>
          </section>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || isSubmitting || !canRequestCredit}
            className="mt-5 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar solicitud'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default CreditPage;

import TopBar from '../components/TopBar.jsx';

export default function ErrorPage({ onBack, limit, userLevel, onClose }) { // Se añade onClose a las props
  return (
    <div className="flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <TopBar onClose={onClose} />

      <main className="flex grow flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center">
        <div className="w-full max-w-sm rounded-3xl border border-[#D1D5DB]/80 bg-white p-8 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 text-[#EF4444]">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="mt-7 text-3xl font-bold leading-tight text-[#20212A]">
            Lo sentimos
          </h1>

          <p className="mt-3 text-lg font-medium leading-relaxed text-[#6B7280]">
            Tu compra no pudo ser <br /> procesada.
          </p>

          <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 p-5">
            <p className="text-xs font-bold uppercase text-[#EF4444]">
              Límite de nivel excedido
            </p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#EF4444]">
              Tu nivel {userLevel} permite compras <br /> de hasta <b>${Number(limit).toLocaleString('es-MX')}</b>
            </p>
          </div>

          <button
            onClick={onBack}
            className="mt-8 w-full rounded-full bg-[#20212A] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(32,33,42,0.16)] transition-all hover:bg-black active:scale-[0.98]"
          >
            Volver al menú principal
          </button>
        </div>

        <p className="mt-6 mb-4 text-xs font-bold uppercase text-[#6B7280]">
          Sistema de pago seguro
        </p>
      </main>
    </div>
  );
}

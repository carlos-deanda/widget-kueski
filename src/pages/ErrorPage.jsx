import TopBar from '../components/TopBar.jsx';

export default function ErrorPage({ onBack, limit, userLevel }) {
  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      <TopBar />

      <div className="grow overflow-y-auto flex flex-col items-center justify-center p-4 text-center">
        
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 w-full max-w-sm">
          
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto shadow-sm">
            ✕
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Lo sentimos
          </h1>
          
          <p className="text-slate-500 mt-2 text-base font-medium leading-relaxed">
            Tu compra no pudo ser <br /> procesada.
          </p>

          <div className="mt-6 p-4 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider">
              Límite de Nivel Excedido
            </p>
            <p className="text-red-600 text-sm mt-1 font-medium">
              Tu nivel {userLevel} permite compras <br/> de hasta <b>${Number(limit).toLocaleString('en-US')}</b>
            </p>
          </div>

          <button 
            onClick={onBack}
            className="mt-8 w-full bg-[#1e293b] hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 text-base"
          >
            Volver al Dashboard
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-6 mb-4">
          Secure Payment System
        </p>
      </div>
    </div>
  );
}
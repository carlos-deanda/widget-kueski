import TopBar from '../components/TopBar.jsx';

export default function SuccessPage({ onBack, onClose }) { // Se añade onClose a las props
  return (

    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col absolute inset-0">
      {/* Se pasa la prop onClose al TopBar */}
      <TopBar onClose={onClose} />

      <div className="grow flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-lg border border-slate-200 w-full mb-4">
          
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl mb-8 mx-auto shadow-sm animate-bounce">
            ✓
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            ¡Felicidades!
          </h1>
          
          <p className="text-slate-500 mt-3 text-lg font-medium leading-relaxed">
            Tu compra se ha logrado <br /> con éxito.
          </p>

          <button 
            onClick={onBack}
            className="mt-10 w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-blue-200 shadow-lg transition-all active:scale-95 text-lg"
          >
            Volver al Menú Principal
          </button>
        </div>
        
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-auto pb-4">
          Sistema de Pago Seguro
        </p>
      </div>
    </div>
  );
}
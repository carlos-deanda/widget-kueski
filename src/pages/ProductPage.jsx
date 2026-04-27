import React from 'react';

function ProductPage({ onBack }) {
  return (
    <div className="w-full h-full bg-white flex flex-col font-sans">
      <header className="p-5 bg-emerald-600 text-white shadow-md">
        <h1 className="text-xl font-black tracking-tight">PRODUCT PAGE</h1>
        <p className="text-xs text-emerald-100 opacity-80">Vista de producto</p>
      </header>

      <main className="grow p-6 flex items-center justify-center">
        <h2 className="text-2xl font-bold text-slate-800">Aqui va tu producto</h2>
      </main>

      <footer className="p-5 border-t border-slate-100 bg-slate-50">
        <button
          onClick={onBack}
          className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl
                     hover:bg-emerald-700 active:scale-95 transition-all
                     shadow-lg shadow-emerald-200"
        >
          Volver
        </button>
      </footer>
    </div>
  );
}

export default ProductPage;
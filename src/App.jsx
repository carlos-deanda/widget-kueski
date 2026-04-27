import React, { useState } from 'react';
import ProductPage from './pages/ProductPage.jsx';

function App() {
  // Añadimos un pequeño estado para que el widget sea interactivo
  const [contador, setContador] = useState(0);
  const [screen, setScreen] = useState('home');

  if (screen === 'product') {
    return <ProductPage onBack={() => setScreen('home')} />;
  }

  return (
    /* w-full h-full: Se adapta al tamaño del body definido en index.css
       bg-white: Fondo limpio
       flex flex-col: Organiza los elementos en vertical
    */
    <div className="w-full h-full bg-white flex flex-col font-sans">
      
      {/* --- CABECERA --- */}
      <header className="p-5 bg-indigo-600 text-white shadow-md">
        <h1 className="text-xl font-black tracking-tight">MI WIDGET PRO</h1>
        <p className="text-xs text-indigo-100 opacity-80">React + Tailwind v4</p>
      </header>

      {/* --- CUERPO --- */}
      <main className="grow p-6 flex flex-col items-center justify-center text-center">
        <div className="mb-4">
          <span className="text-6xl inline-block hover:rotate-12 transition-transform cursor-default">
            🚀
          </span>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-800">¡Hola, Dani!</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Has interactuado <span className="font-bold text-indigo-600">{contador}</span> veces con este widget.
        </p>
      </main>

      {/* --- ACCIONES --- */}
      <footer className="p-5 border-t border-slate-100 bg-slate-50">
        <button
          onClick={() => setScreen('product')}
          className="w-full mb-3 bg-slate-200 text-slate-800 font-bold py-3 rounded-xl
                     hover:bg-slate-300 active:scale-95 transition-all"
        >
          Ir a producto
        </button>
        <button 
          onClick={() => setContador(contador + 1)}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl 
                     hover:bg-indigo-700 active:scale-95 transition-all 
                     shadow-lg shadow-indigo-200"
        >
          ¡Pulsar botón!
        </button>
      </footer>

    </div>
  );
}

export default App;
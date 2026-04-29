function TopBar({ onClose }) {
  return (
    <header className="bg-[#0057ff] text-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
            <img
              src="/images/tarjeta_de_credito.webp"
              alt="Kueski icon"
              className="w-4 h-4 object-contain"
            />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Kueski Pay</p>
            <p className="text-[11px] text-white/90">Chrome Extension</p>
          </div>
        </div>
        
        <button
          onClick={onClose} // Ejecuta la función de cierre
          type="button"
          className="text-white/90 hover:text-white transition-colors text-2xl leading-none p-1 active:scale-90"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </header>
  );
}

export default TopBar;

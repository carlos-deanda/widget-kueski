function TopBar({ onClose }) {
  return (
    <header className="bg-white px-5 py-4 text-[#20212A]">
      <div className="flex items-center justify-between border-b border-[#D1D5DB]/70 pb-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/kueski-logo.webp"
            alt="Kueski"
            className="h-8 w-auto object-contain"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold">Kueski Pay</p>
            <p className="text-[11px] font-medium text-[#6B7280]">Widget seguro</p>
          </div>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#20212A]/60 transition-all hover:bg-gray-100 hover:text-[#20212A] active:scale-95"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default TopBar;

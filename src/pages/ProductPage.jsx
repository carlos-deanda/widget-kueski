import React from 'react';
import TopBar from '../components/TopBar.jsx';

function ProductPage({ onBack }) {
  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      <TopBar />

      <div className="grow rounded-b-2xl border-x border-b border-slate-200 bg-[#f5f5f5] p-4 overflow-y-auto">
        <button
          onClick={onBack}
          className="w-full bg-slate-200 text-slate-800 font-bold py-3 rounded-xl
                     hover:bg-slate-300 active:scale-95 transition-all"
        >
          Volver al menu
        </button>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div>
                <h2 className="text-[24px] font-semibold leading-none">Active Purchase</h2>
                <p className="text-xs text-slate-500 mt-1">Payment tracking</p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm text-slate-500">Product</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">Premium Headphones</p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <p className="text-sm font-medium mt-1">Next payment</p>
              <p className="text-sm text-slate-500 mt-1">May 10</p>
            </div>
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <p className="text-sm font-medium mt-1">Remaining</p>
              <p className="text-sm text-slate-500 mt-1">3 pagos</p>
            </div>
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <p className="text-sm font-medium mt-1">Progress</p>
              <p className="text-sm text-slate-500 mt-1">63%</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-lg font-medium">Payment Progress</p>
            <p className="text-slate-500">5 of 8 completed</p>
          </div>

          <div className="mt-2 h-3 rounded-full bg-slate-300 overflow-hidden">
            <div className="h-full w-[63%] bg-[#0057ff]" />
          </div>

          <div className="mt-4 rounded-2xl bg-[#e4e8f0] p-4">
            <p className="text-slate-500">Pago quincenal</p>
            <div className="mt-1 flex items-end gap-2">
              <p className="text-2xl font-bold text-[#0057ff]">$186.87</p>
              <p className="text-slate-500 mb-1">(8 pagos)</p>
            </div>
            <p className="mt-2 text-[#0057ff]">On track with payments</p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-500">Original price</p>
              <p>$1299.99</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500">Paid so far</p>
              <p className="text-[#16a34a]">$934.37</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500">Remaining balance</p>
              <p>$560.62</p>
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xl font-medium">Total cost</p>
              <p className="text-3xl font-bold text-[#0057ff]">$1494.99</p>
            </div>
          </div>

          <button className="mt-4 w-full rounded-xl border border-slate-300 bg-[#f5f5f5] py-3 text-slate-700 hover:bg-slate-100 transition-colors">
            Add to calendar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductPage;
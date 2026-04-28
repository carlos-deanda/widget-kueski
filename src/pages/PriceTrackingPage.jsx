import React from 'react';
import TopBar from '../components/TopBar.jsx';

function PriceTrackingPage({ onBack, onCheckout }) {
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

        <div className="mt-4 rounded-2xl border border-green-200 bg-[#f8f8f8] p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[24px] font-semibold leading-none text-slate-900">
                Price Tracking
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Monitoring price changes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-[#0057ff] text-white flex items-center justify-center text-sm">
                ⏰
              </div>
              <div className="w-7 h-7 rounded-full border border-slate-300 text-slate-500 flex items-center justify-center text-sm">
                i
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-500">Product</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">
                Gaming Laptop RTX
              </p>
            </div>

            <div className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-600">
              ↘️ 5.2%
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <p className="text-2xl text-[#0057ff]">◷</p>
              <p className="text-sm font-medium mt-1">Alert</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>

            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <p className="text-2xl text-[#0057ff]">◎</p>
              <p className="text-sm font-medium mt-1">Lowest</p>
              <p className="text-xs text-slate-500">$1649.99</p>
            </div>

            <div className="rounded-xl border border-[#c8d6ff] bg-[#e8eefc] p-3 text-center">
              <p className="text-2xl text-[#0057ff]">ϟ</p>
              <p className="text-sm font-medium mt-1">Savings</p>
              <p className="text-xs text-slate-500">$400</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-semibold text-green-700">
              ✨ Good time to buy!
            </p>
            <p className="text-xs text-green-700">
              Price is close to your target
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm font-semibold">
              Target: $1699.99
            </p>
            <p className="text-sm text-slate-500">$200.00 away</p>
          </div>

          <div className="mt-2 h-3 rounded-full bg-slate-300 overflow-hidden">
            <div className="h-full w-[55%] bg-green-500" />
          </div>

          <div className="mt-4 rounded-2xl bg-[#e4e8f0] p-4">
            <p className="text-slate-500">Current Price</p>

            <div className="mt-1 flex items-end gap-2">
              <p className="text-2xl font-bold text-[#0057ff]">$1899.99</p>
              <p className="text-green-600 mb-2 text-xs font-medium">
                ✓ Near target
              </p>
            </div>

            <p className="mt-2 text-slate-500 text-sm">
              <span className='text-[#0057ff]'>◎</span> Monitoring 24/7
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-500">Current price</p>
              <p className="font-semibold">$1899.99</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-slate-500">Target price</p>
              <p className="font-semibold text-[#0057ff]">$1699.99</p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-slate-500">Historical Low</p>
              <p className="font-semibold text-green-600">$1649.99</p>
            </div>

            <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
              <p className="text-md font-medium">Savings vs high</p>
              <p className="text-xl font-bold text-green-600">$400.00</p>
            </div>
          </div>

          <button onClick = {onCheckout} 
                  className="mt-4 w-full rounded-xl bg-[#0057ff] py-3 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all">
            Buy with Kueski Pay
          </button>
        </div>
      </div>
    </div>
  );
}

export default PriceTrackingPage;
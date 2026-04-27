import React, { useState } from 'react';
import ProductPage from './ProductPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import PriceTrackingPage from './PriceTrackingPage.jsx';
import TopBar from '../components/TopBar.jsx';

const activePurchases = [
  {
    name: 'Premium Headphones',
    paymentsLeft: '3 payments left',
    amount: '$162.50 biweekly',
  },
  {
    name: 'Smart Watch Pro',
    paymentsLeft: '5 payments left',
    amount: '$106.25 biweekly',
  },
  {
    name: 'Ultra HD Monitor',
    paymentsLeft: '8 payments left',
    amount: '$260.42 biweekly',
  },
];

const trackedProducts = [
  {
    name: 'Gaming Laptop RTX',
    price: '$1899.99',
    change: '5.2%',
    trend: 'down',
    badge: 'Good Deal',
  },
  {
    name: 'Mechanical Keyboard',
    price: '$189.99',
    change: '2.1%',
    trend: 'up',
  },
  {
    name: 'Office Chair Pro',
    price: '$449.99',
    change: '8.5%',
    trend: 'down',
    badge: 'Good Deal',
  },
];

function MenuPage() {
  const [screen, setScreen] = useState('home');

  if (screen === 'product') {
    return <ProductPage onBack={() => setScreen('home')} />;
  }

  if (screen === 'checkout') {
    return <CheckoutPage onBack={() => setScreen('home')} />;
  }
  if (screen === 'tracking') {
    return <PriceTrackingPage onBack={() => setScreen('home')} />;
  }

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans text-slate-900">
      <TopBar />

      <main className="grow overflow-y-auto p-4">
        <section className="flex items-start justify-between">
          {/* He añadido 'w-full' y 'justify-between' aquí para que el título y el botón se separen */}
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold leading-tight">Dashboard Menu</h1>
              <p className="text-sm text-slate-500">Manage your products</p>
            </div>

            {/* Este es el botón nuevo */}
            <button 
              onClick={() => setScreen('checkout')}
              className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded hover:bg-slate-200"
            >
              test checkout
            </button>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
            <p className="mt-2 text-sm font-bold leading-tight">Active</p>
            <p className="text-sm text-slate-500">3 products</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
            <p className="mt-2 text-sm font-bold leading-tight">Tracking</p>
            <p className="text-sm text-slate-500">3 products</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
            <p className="mt-2 text-sm font-bold leading-tight">Total</p>
            <p className="text-sm text-slate-500">6 items</p>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold">Active Purchases</h2>
          </div>

          <div className="space-y-3">
            {activePurchases.map((purchase) => (
              <button
                key={purchase.name}
                type="button"
                onClick={() => setScreen('product')}
                className="w-full rounded-lg border border-blue-100 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold leading-tight">{purchase.name}</h3>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        Active
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-500">{purchase.paymentsLeft}</p>
                    <p className="mt-2 text-lg font-bold leading-tight text-[#0057ff]">{purchase.amount}</p>
                  </div>
                  <span className="shrink-0 text-3xl leading-none text-slate-400">›</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-7">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold">Price Tracking</h2>
          </div>

          <div className="space-y-3">
            {trackedProducts.map((product) => {
              const isDeal = product.trend === 'down';

              return (
                <button
                  key={product.name}
                  type="button"
                  onClick={() => setScreen('tracking')}
                  className={`rounded-lg border p-4 ${
                    isDeal
                      ? 'border-green-200 bg-green-50'
                      : 'border-pink-100 bg-pink-50'
                  } w-full text-left transition-colors hover:brightness-95 active:scale-[0.99]`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold leading-tight">{product.name}</h3>
                        {product.badge && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            {product.badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-lg font-bold leading-tight">{product.price}</p>
                        <p className={`text-sm font-bold ${isDeal ? 'text-green-600' : 'text-red-600'}`}>
                          {isDeal ? '⌁' : '↗'} {product.change}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-3xl leading-none text-slate-400">›</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

    </div>
  );
}

export default MenuPage;

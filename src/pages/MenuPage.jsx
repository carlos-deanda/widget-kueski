import { useEffect, useState } from 'react';
import ProductPage from './ProductPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import PriceTrackingPage from './PriceTrackingPage.jsx';
import CreditPage from './CreditPage.jsx';
import TopBar from '../components/TopBar.jsx';
import { getDashboard } from '../api.js';
import SuccessPage from './SuccessPage.jsx'; 
import ErrorPage from './ErrorPage.jsx'; 


function MenuPage({ user, onLogout }) {
  const [screen, setScreen] = useState('home');
  const [currentUser, setCurrentUser] = useState(user);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [capturedPrice, setCapturedPrice] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    getDashboard(user.id)
      .then((data) => {
        if (!isMounted) return;
        setDashboard(data);
        setCurrentUser(data.user);
        setError('');
      })
      .catch((apiError) => {
        if (!isMounted) return;
        setError(apiError.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const activePurchases = dashboard?.activePurchases || [];
  const trackedProducts = dashboard?.trackedProducts || [];
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  const handleGoToCheckout = () => {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'GET_PRODUCT_PRICE' },
        (response) => {

          const baseProduct =
            trackedProducts.find((p) => p.id === selectedTrackingId) ||
            trackedProducts[0] ||
            {};

          const productData = {
            ...baseProduct,
            name: response?.name || baseProduct.name || "Producto de Amazon",
            currentPrice: response?.price || baseProduct.price || "0",
          };

          console.log("CHECKOUT DATA:", productData);

          setCheckoutProduct(productData);
          setCapturedPrice(response?.price || '');
          setScreen('checkout');
        }
      );
    });
    return;
  }

  // fallback (sin chrome)
  const fallbackProduct =
    trackedProducts.find((p) => p.id === selectedTrackingId) ||
    trackedProducts[0] ||
    {};

  setCheckoutProduct(fallbackProduct);
  setCapturedPrice(fallbackProduct?.price || '$1,234.56');
  setScreen('checkout');
};

  if (screen === 'product') {
    return <ProductPage purchaseId={selectedPurchaseId} onBack={() => setScreen('home')} />;
  }

  if (screen === 'checkout') {
    return (
      <CheckoutPage
        user={currentUser}
        product={checkoutProduct}
        price={capturedPrice}
        onBack={() => setScreen('home')}
        onResult={(isSuccess) => setScreen(isSuccess ? 'success' : 'error')}      />
    );
  }

  if (screen === 'credit') {
    return (
      <CreditPage
        user={currentUser}
        onBack={() => setScreen('home')}
        onCreditApproved={(updatedUser) => {
          setCurrentUser(updatedUser);
          setDashboard((previous) => previous ? { ...previous, user: updatedUser } : previous);
        }}
      />
    );
  }

  if (screen === 'tracking') {
    return (
      <PriceTrackingPage
        trackingId={selectedTrackingId}
        onBack={() => setScreen('home')}
        onCheckout={handleGoToCheckout}
      />
    );
  }

  if (screen === 'success') {
    return <SuccessPage onBack={() => setScreen('home')} />;
  }

  if (screen === 'error') {
    const limitsByLevel = { 5: 10000, 4: 8000, 3: 6000, 2: 4000, 1: 2000 };
    const levelLimit = limitsByLevel[currentUser.creditRating] || 0;    
    return <ErrorPage onBack={() => setScreen('home')} limit={levelLimit} userLevel={currentUser.creditRating} />;
  }

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans text-slate-900">
      <TopBar />

      <main className="grow overflow-y-auto p-4 pb-20">
        <section className="flex items-start justify-between">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold leading-tight">Dashboard Menu</h1>
              <p className="text-sm text-slate-500">{currentUser.name} · nivel {currentUser.creditRating}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGoToCheckout}
                className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200"
              >
                checkout
              </button>
              <button
                onClick={onLogout}
                className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200"
              >
                salir
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Credito disponible</p>
              <p className="mt-1 text-2xl font-black text-[#0057ff]">
                ${Number(currentUser.creditRemaining || 0).toLocaleString('en-US')}
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
              Rating {currentUser.creditRating}/5
            </div>
          </div>
          <button
            onClick={() => setScreen('credit')}
            className="mt-3 w-full rounded-lg bg-[#0057ff] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 active:scale-[0.99]"
          >
            Solicitar mas credito
          </button>
        </section>

        {isLoading && (
          <p className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700">
            Cargando datos...
          </p>
        )}

        {error && (
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <section className="mt-7 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
            <p className="mt-2 text-sm font-bold leading-tight">Active</p>
            <p className="text-sm text-slate-500">{activePurchases.length} products</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
            <p className="mt-2 text-sm font-bold leading-tight">Tracking</p>
            <p className="text-sm text-slate-500">{trackedProducts.length} products</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
            <p className="mt-2 text-sm font-bold leading-tight">Total</p>
            <p className="text-sm text-slate-500">{activePurchases.length + trackedProducts.length} items</p>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-4 text-xl font-bold">Active Purchases</h2>
          <div className="space-y-3">
            {activePurchases.map((purchase) => (
              <button
                key={purchase.id}
                type="button"
                onClick={() => {
                  setSelectedPurchaseId(purchase.id);
                  setScreen('product');
                }}
                className="w-full rounded-lg border border-blue-100 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold leading-tight">{purchase.name}</h3>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Active</span>
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
          <h2 className="mb-4 text-xl font-bold">Price Tracking</h2>
          <div className="space-y-3">
            {trackedProducts.map((product) => {
              const isDeal = product.trend === 'down';
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => {
                    setSelectedTrackingId(product.id);
                    setScreen('tracking');
                  }}
                  className={`rounded-lg border p-4 ${
                    isDeal ? 'border-green-200 bg-green-50' : 'border-pink-100 bg-pink-50'
                  } w-full text-left transition-colors hover:brightness-95 active:scale-[0.99]`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold leading-tight">{product.name}</h3>
                        {product.badge && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{product.badge}</span>
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

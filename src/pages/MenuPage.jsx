import { useEffect, useRef, useState } from 'react';
import ProductPage from './ProductPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import PriceTrackingPage from './PriceTrackingPage.jsx';
import CreditPage from './CreditPage.jsx';
import IdentityVerificationPage from './IdentityVerificationPage.jsx';
import TopBar from '../components/TopBar.jsx';
import { getDashboard } from '../api.js';
import SuccessPage from './SuccessPage.jsx'; 
import ErrorPage from './ErrorPage.jsx'; 
import { useNotifications } from '../components/useNotifications.js';

// 1. Recibimos onClose desde las props
function MenuPage({ user, onLogout, onClose }) {
  const {
    error: notifyError,
    info: notifyInfo,
    success: notifySuccess,
    warning: notifyWarning,
    requestNativePermission,
  } = useNotifications();
  const [screen, setScreen] = useState('home');
  const [currentUser, setCurrentUser] = useState(user);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [selectedTrackingId, setSelectedTrackingId] = useState(null);
  const [capturedPrice, setCapturedPrice] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const hasShownDashboardToast = useRef(false);

  // Ya no necesitamos definir handleCloseWidget aquí adentro 
  // porque usaremos la prop 'onClose'

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    getDashboard(user.id)
      .then((data) => {
        if (!isMounted) return;
        setDashboard(data);
        setCurrentUser(data.user);
        setError('');

        if (!hasShownDashboardToast.current) {
          notifySuccess('Tus datos se actualizaron correctamente.', { title: 'Dashboard listo' });
          hasShownDashboardToast.current = true;
        }

        const discountedProducts = (data.trackedProducts || []).filter((product) => product.trend === 'down');
        if (discountedProducts.length > 0) {
          notifyInfo(
            `Hay ${discountedProducts.length} producto(s) con precio a la baja.`,
            { title: 'Alerta de precios', native: true, duration: 5000 },
          );
        }
      })
      .catch((apiError) => {
        if (!isMounted) return;
        setError(apiError.message);
        notifyError(apiError.message, { title: 'No se pudo cargar el dashboard' });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, [notifyError, notifyInfo, notifySuccess, user.id]);

  const activePurchases = dashboard?.activePurchases || [];
  const trackedProducts = dashboard?.trackedProducts || [];
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  const handleGoToCheckout = () => {
    if (!trackedProducts.length) {
      notifyWarning('No tienes productos en seguimiento para continuar al checkout.', { title: 'Sin productos' });
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.[0]?.id) {
          notifyWarning('No encontramos una pestaña activa para leer el precio actual.', { title: 'Pestaña no disponible' });
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'GET_PRODUCT_PRICE' },
          (response) => {
            const baseProduct = trackedProducts.find((p) => p.id === selectedTrackingId) || trackedProducts[0] || {};
            const productData = {
              ...baseProduct,
              name: response?.name || baseProduct.name || "Producto de Amazon",
              currentPrice: response?.price || baseProduct.price || "0",
            };
            setCheckoutProduct(productData);
            setCapturedPrice(response?.price || '');
            setScreen('checkout');
          }
        );
      });
      return;
    }
    const fallbackProduct = trackedProducts.find((p) => p.id === selectedTrackingId) || trackedProducts[0] || {};
    setCheckoutProduct(fallbackProduct);
    setCapturedPrice(fallbackProduct?.price || '$1,234.56');
    setScreen('checkout');
  };

  const handleLogout = () => {
    notifyInfo('Sesión cerrada.', { title: 'Hasta pronto' });
    onLogout();
  };

  const handleEnableNativeNotifications = async () => {
    const permission = await requestNativePermission();

    if (permission === 'granted') {
      notifySuccess('Las notificaciones del navegador quedaron activadas.', {
        title: 'Notificaciones activas',
        native: true,
      });
      return;
    }

    if (permission === 'denied') {
      notifyWarning('Tu navegador bloqueó las notificaciones. Puedes habilitarlas desde ajustes del sitio.', {
        title: 'Permiso denegado',
      });
      return;
    }

    if (permission === 'default') {
      notifyWarning('No confirmaste el permiso de notificaciones. Vuelve a intentarlo y acepta el permiso.', {
        title: 'Permiso pendiente',
      });
      return;
    }

    notifyWarning('Este entorno no soporta notificaciones nativas. Si ya actualizaste el manifest, recarga la extensión en chrome://extensions.', {
      title: 'No disponible',
    });
  };

  const handleRunPriceCheckNow = async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      notifyWarning('No estás en contexto de extensión. Abre el widget como extensión y vuelve a intentarlo.', { title: 'No disponible' });
      return;
    }

    chrome.runtime.sendMessage(
      { type: 'check_prices_now', forceNotifyDown: true },
      (response) => {
        if (chrome.runtime?.lastError) {
          notifyError(chrome.runtime.lastError.message || 'No se pudo ejecutar la revisión de precios.');
          return;
        }

        if (!response?.ok) {
          notifyError(response?.error || 'No se pudo ejecutar la revisión de precios.');
          return;
        }

        const sent = response.result?.notificationsSent || 0;
        notifySuccess(
          sent > 0
            ? `Revisión lista: se enviaron ${sent} notificación(es) de precio.`
            : 'Revisión lista: no hubo bajadas para notificar.',
          { title: 'Chequeo de precios' },
        );
      },
    );
  };

  // 2. En todos los retornos, usamos 'onClose' en lugar de la función local
  if (screen === 'product') {
    return <ProductPage purchaseId={selectedPurchaseId} onBack={() => setScreen('home')} onClose={onClose} />;
  }

  if (screen === 'identityVerification') {
    return (
      <IdentityVerificationPage
        user={currentUser}
        onClose={onClose}
        onVerified={(updatedUser) => {
          setCurrentUser(updatedUser);
          setDashboard((previous) => previous ? { ...previous, user: updatedUser } : previous);
          setScreen('checkout');
        }}
      />
    );
  }

  if (screen === 'checkout') {
    return (
      <CheckoutPage
        user={currentUser}
        product={checkoutProduct}
        price={capturedPrice}
        onBack={() => setScreen('home')}
        onResult={(isSuccess) => setScreen(isSuccess ? 'success' : 'error')} 
        onRequireIdentityVerification={() => setScreen('identityVerification')}
        onClose={onClose}
      />
    );
  }

  if (screen === 'credit') {
    return (
      <CreditPage
        user={currentUser}
        onBack={() => setScreen('home')}
        onClose={onClose}
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
        onClose={onClose}
      />
    );
  }

  if (screen === 'success') {
    return <SuccessPage onBack={() => setScreen('home')} onClose={onClose} />;
  }

  if (screen === 'error') {
    const limitsByLevel = { 5: 10000, 4: 8000, 3: 6000, 2: 4000, 1: 2000 };
    const levelLimit = limitsByLevel[currentUser.creditRating] || 0;    
    return <ErrorPage onBack={() => setScreen('home')} limit={levelLimit} userLevel={currentUser.creditRating} onClose={onClose} />;
  }

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans text-slate-900">
      {/* Usamos onClose aquí también */}
      <TopBar onClose={onClose} />

      <main className="grow overflow-y-auto p-4 pb-20">
        <section className="flex items-start justify-between">
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-2xl font-bold leading-tight">Menú Principal</h1>
              <p className="text-sm text-slate-500">{currentUser.name} · nivel {currentUser.creditRating}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleEnableNativeNotifications} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200">activar alertas</button>
              <button onClick={handleRunPriceCheckNow} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200">revisar precios ahora</button>
              <button
                onClick={async () => {
                  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    try {
                      await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ type: 'schedule_test', delaySeconds: 5 }, () => resolve());
                      });
                      notifyInfo('Notificación de prueba programada a 5s.', { title: 'Prueba programada' });
                    } catch (err) {
                      console.error(err);
                      notifyError('No se pudo programar la notificación de prueba.');
                    }
                    return;
                  }

                  notifyWarning('No estás en contexto de extensión. Abre la extensión y vuelve a intentarlo.', { title: 'No disponible' });
                }}
                className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200"
              >
                probar notificación (5s)
              </button>
              <button onClick={handleGoToCheckout} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200">pagar</button>
              <button onClick={handleLogout} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded hover:bg-slate-200">salir</button>
            </div>
          </div>
        </section>

        {/* ... Resto del código de secciones (Crédito, Compras, etc.) se mantiene igual ... */}
        {/* Solo asegúrate de que los botones que cambian la 'screen' sigan funcionando igual */}
        
        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Crédito disponible</p>
              <p className="mt-1 text-2xl font-black text-[#0057ff]">
                ${Number(currentUser.creditRemaining || 0).toLocaleString('es-MX')}
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
              Nivel {currentUser.creditRating}/5
            </div>
          </div>
          <button
            onClick={() => setScreen('credit')}
            className="mt-3 w-full rounded-lg bg-[#0057ff] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 active:scale-[0.99]"
          >
            Solicitar más crédito
          </button>
        </section>

        {isLoading && <p className="mt-6 p-3 text-sm text-blue-700 bg-blue-50">Cargando datos...</p>}
        {error && <p className="mt-6 p-3 text-sm text-red-700 bg-red-50">{error}</p>}

        <section className="mt-7">
          <h2 className="mb-4 text-xl font-bold">Compras Activas</h2>
          <div className="space-y-3">
            {activePurchases.map((purchase) => (
              <button
                key={purchase.id}
                onClick={() => { setSelectedPurchaseId(purchase.id); setScreen('product'); }}
                className="w-full rounded-lg border border-blue-100 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{purchase.name}</h3>
                    <p className="text-sm text-slate-500">{purchase.paymentsLeft}</p>
                    <p className="text-lg font-bold text-[#0057ff]">{purchase.amount}</p>
                  </div>
                  <span className="text-3xl text-slate-400">›</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-slate-200 pt-7">
          <h2 className="mb-4 text-xl font-bold">Seguimiento de Precios</h2>
          <div className="space-y-3">
            {trackedProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => { setSelectedTrackingId(product.id); setScreen('tracking'); }}
                className={`rounded-lg border p-4 ${product.trend === 'down' ? 'border-green-200 bg-green-50' : 'border-pink-100 bg-pink-50'} w-full text-left`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-lg font-bold">{product.price}</p>
                  </div>
                  <span className="text-3xl text-slate-400">›</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default MenuPage;

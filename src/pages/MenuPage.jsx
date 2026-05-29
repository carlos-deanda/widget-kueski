import { useEffect, useRef, useState } from 'react';
import ProductPage from './ProductPage.jsx';
import CheckoutPage from './CheckoutPage.jsx';
import PriceTrackingPage from './PriceTrackingPage.jsx';
import CreditPage from './CreditPage.jsx';
import IdentityVerificationPage from './IdentityVerificationPage.jsx';
import TopBar from '../components/TopBar.jsx';
import { getDashboard, sendTestPriceAlertEmail } from '../api.js';
import SuccessPage from './SuccessPage.jsx';
import ErrorPage from './ErrorPage.jsx';
import { useNotifications } from '../components/useNotifications.js';

// 1. Recibimos onClose desde las props
function MenuPage({ user, onLogout, onClose, onEditNotificationPreferences }) {
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
        const browserAlertsEnabled = data.user?.priceNotificationPreferences?.browser === true;
        if (discountedProducts.length > 0 && browserAlertsEnabled) {
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
  const notificationPreferences = currentUser?.priceNotificationPreferences || {};
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  const preferenceLabels = [
    notificationPreferences.browser ? 'Navegador' : null,
    notificationPreferences.email ? 'Correo' : null,
    notificationPreferences.googleCalendar ? 'Google Calendar' : null,
  ].filter(Boolean);

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

        const browserSent = response.result?.browserNotificationsSent || 0;
        const emailSent = response.result?.emailAlertsSent || 0;
        const calendarSent = response.result?.calendarAlertsSent || 0;
        const totalSent = response.result?.notificationsSent || 0;

        if (totalSent > 0) {
          const parts = [];
          if (browserSent > 0) parts.push(`${browserSent} en navegador`);
          if (emailSent > 0) parts.push(`${emailSent} por correo`);
          if (calendarSent > 0) parts.push(`${calendarSent} en calendario`);
          notifySuccess(`Revisión lista: ${parts.join(', ')}.`, { title: 'Chequeo de precios' });
          return;
        }

        notifyWarning(
          'No hubo bajadas para notificar. Usa "Probar correo" si solo quieres verificar Resend.',
          { title: 'Chequeo de precios' },
        );
      },
    );
  };

  const handleSendTestEmail = async () => {
    if (!notificationPreferences.email) {
      notifyWarning('Activa las alertas por correo en Editar preferencias.', { title: 'Correo no activo' });
      return;
    }

    try {
      const data = await sendTestPriceAlertEmail(currentUser.id);
      notifySuccess(data.message || `Correo enviado a ${data.sentTo}.`, { title: 'Correo de prueba' });
    } catch (apiError) {
      notifyError(apiError.message, { title: 'No se pudo enviar el correo' });
    }
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
    <div className="flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <TopBar onClose={onClose} />

      <main className="grow overflow-y-auto px-5 pb-6 pt-2">
        <section className="rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#6B7280]">Hola, {currentUser.name}</p>
              <h1 className="mt-1 text-3xl font-bold leading-tight text-[#20212A]">Menú principal</h1>
            </div>
            <div className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-bold text-[#4B73F8]">
              Nivel {currentUser.creditRating}/5
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={handleEnableNativeNotifications} className="rounded-full border border-[#D1D5DB] bg-gray-50 px-3 py-2 text-xs font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]">Activar alertas</button>
            <button onClick={handleRunPriceCheckNow} className="rounded-full border border-[#D1D5DB] bg-gray-50 px-3 py-2 text-xs font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]">Revisar precios</button>
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
              className="rounded-full border border-[#D1D5DB] bg-gray-50 px-3 py-2 text-xs font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
            >
              Probar notificación
            </button>
            <button onClick={handleLogout} className="rounded-full border border-[#D1D5DB] bg-gray-50 px-3 py-2 text-xs font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]">Salir</button>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_10px_26px_rgba(32,33,42,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#6B7280]">Alertas de precio</p>
              <p className="mt-2 text-sm font-medium text-[#20212A]">
                {preferenceLabels.length > 0
                  ? preferenceLabels.join(' · ')
                  : 'Sin preferencias configuradas'}
              </p>
              {notificationPreferences.googleCalendar && !currentUser.googleCalendarConnected && (
                <p className="mt-2 text-xs font-medium text-[#D97706]">
                  Google Calendar seleccionado, pero aún no está conectado.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onEditNotificationPreferences}
                className="rounded-full border border-[#D1D5DB] bg-gray-50 px-4 py-2 text-xs font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
              >
                Editar
              </button>
              {notificationPreferences.email && (
                <button
                  onClick={handleSendTestEmail}
                  className="rounded-full border border-[#4B73F8]/30 bg-[#EEF2FF] px-4 py-2 text-xs font-bold text-[#4B73F8] transition-all hover:bg-[#E0E7FF] active:scale-[0.98]"
                >
                  Probar correo
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_10px_26px_rgba(32,33,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[#6B7280]">Crédito disponible</p>
              <p className="mt-2 text-3xl font-black text-[#4B73F8]">
                ${Number(currentUser.creditRemaining || 0).toLocaleString('es-MX')}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4B73F8]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3Z" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => setScreen('credit')}
            className="mt-4 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white transition-all hover:bg-[#345ee8] active:scale-[0.98]"
          >
            Solicitar más crédito
          </button>
          <button
            onClick={handleGoToCheckout}
            className="mt-3 w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
          >
            Pagar con Kueski Pay
          </button>
        </section>

        {isLoading && <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-[#4B73F8]">Cargando datos...</p>}
        {error && <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#EF4444]">{error}</p>}

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-bold text-[#20212A]">Compras activas</h2>
          <div className="space-y-3">
            {activePurchases.map((purchase) => (
              <button
                key={purchase.id}
                onClick={() => { setSelectedPurchaseId(purchase.id); setScreen('product'); }}
                className="w-full rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 text-left shadow-[0_8px_22px_rgba(32,33,42,0.05)] transition-all hover:border-[#4B73F8]/60 hover:bg-[#F8FAFF] active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[#20212A]">{purchase.name}</h3>
                    <p className="mt-1 text-sm font-medium text-[#6B7280]">{purchase.paymentsLeft}</p>
                    <p className="mt-2 text-lg font-bold text-[#4B73F8]">{purchase.amount}</p>
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 5 7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7 border-t border-[#D1D5DB]/70 pt-6">
          <h2 className="mb-3 text-xl font-bold text-[#20212A]">Seguimiento de precios</h2>
          <div className="space-y-3">
            {trackedProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => { setSelectedTrackingId(product.id); setScreen('tracking'); }}
                className={`w-full rounded-3xl border bg-white p-4 text-left shadow-[0_8px_22px_rgba(32,33,42,0.05)] transition-all hover:bg-[#F8FAFF] active:scale-[0.99] ${product.trend === 'down' ? 'border-[#5FCB71]/70' : 'border-[#EF4444]/40'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${product.trend === 'down' ? 'bg-green-50 text-[#16A34A]' : 'bg-red-50 text-[#EF4444]'}`}>
                      {product.trend === 'down' ? 'Precio a la baja' : 'Precio al alza'}
                    </div>
                    <h3 className="font-bold text-[#20212A]">{product.name}</h3>
                    <p className="mt-2 text-lg font-bold text-[#20212A]">{product.price}</p>
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 5 7 7-7 7" />
                  </svg>
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

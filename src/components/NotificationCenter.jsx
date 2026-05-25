import { useCallback, useMemo, useState } from 'react';
import { NotificationContext } from './notificationContext.js';
let nextNotificationId = 1;

function canUseExtensionNotifications() {
  return typeof chrome !== 'undefined'
    && !!chrome.runtime?.id
    && !!chrome.notifications?.create;
}

function showExtensionNotification(title, message) {
  if (!canUseExtensionNotifications()) {
    return false;
  }

  chrome.notifications.create(`kueski-${Date.now()}-${Math.random()}`, {
    type: 'basic',
    iconUrl: 'images/tarjeta_de_credito.webp',
    title: title || 'Widget Kueski',
    message: message || 'Tienes una notificación nueva.',
    priority: 1,
  });

  return true;
}

function NotificationToast({ item, onDismiss }) {
  const toneClasses = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <article
      className={`w-full rounded-xl border px-4 py-3 shadow-sm ${toneClasses[item.type] || toneClasses.info}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.title && <p className="text-sm font-bold">{item.title}</p>}
          <p className="text-sm">{item.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-md px-2 py-1 text-xs font-bold opacity-70 hover:opacity-100"
          aria-label="Cerrar notificación"
        >
          Cerrar
        </button>
      </div>
    </article>
  );
}

function showNativeNotification(title, message) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const nativeTitle = title || 'Widget Kueski';
    const nativeOptions = message ? { body: message } : undefined;
    // Mostramos una notificación del navegador cuando el permiso ya existe.
    const notificationInstance = new Notification(nativeTitle, nativeOptions);
    window.setTimeout(() => notificationInstance.close(), 6000);
    return true;
  }

  return showExtensionNotification(title, message);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((payload) => {
    const normalizedPayload = typeof payload === 'string' ? { message: payload } : payload;
    const message = normalizedPayload?.message || '';

    if (!message) {
      return;
    }

    const id = nextNotificationId++;
    const duration = normalizedPayload?.duration ?? 3500;
    const type = normalizedPayload?.type || 'info';
    const title = normalizedPayload?.title || '';

    setNotifications((current) => [
      ...current,
      { id, message, title, type },
    ]);

    if (duration > 0) {
      window.setTimeout(() => {
        setNotifications((current) => current.filter((item) => item.id !== id));
      }, duration);
    }

    if (normalizedPayload?.native) {
      showNativeNotification(title, message);
    }
  }, []);

  const requestNativePermission = useCallback(async () => {
    if (canUseExtensionNotifications()) {
      return 'granted';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        return 'granted';
      }

      return Notification.requestPermission();
    }

    return 'unsupported';
  }, []);

  const value = useMemo(() => ({
    notify,
    info: (message, options = {}) => notify({ ...options, type: 'info', message }),
    success: (message, options = {}) => notify({ ...options, type: 'success', message }),
    warning: (message, options = {}) => notify({ ...options, type: 'warning', message }),
    error: (message, options = {}) => notify({ ...options, type: 'error', message }),
    requestNativePermission,
  }), [notify, requestNativePermission]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-2">
        <div className="w-full max-w-[340px] space-y-2">
          {notifications.map((item) => (
            <div key={item.id} className="pointer-events-auto">
              <NotificationToast item={item} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}

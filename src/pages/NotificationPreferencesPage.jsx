import { useState } from 'react';
import {
  getGoogleNotificationCalendarStartUrl,
  updateNotificationPreferences,
} from '../api.js';
import { useNotifications } from '../components/useNotifications.js';

const CHANNELS = [
  {
    key: 'browser',
    title: 'Mensajes en el navegador',
    description: 'Recibe alertas push en la extensión cuando baje el precio de un producto.',
  },
  {
    key: 'email',
    title: 'Correo electrónico',
    description: 'Te avisamos por email con Resend cuando detectemos una bajada de precio.',
  },
  {
    key: 'googleCalendar',
    title: 'Google Calendar',
    description: 'Crea un evento en tu calendario cada vez que haya una alerta de precio.',
  },
];

function NotificationPreferencesPage({ user, onComplete, onCancel, onClose, mode = 'setup' }) {
  const { error: notifyError, success: notifySuccess, requestNativePermission } = useNotifications();
  const initial = user?.priceNotificationPreferences || {};
  const [preferences, setPreferences] = useState({
    browser: initial.browser === true,
    email: initial.email === true,
    googleCalendar: initial.googleCalendar === true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const togglePreference = (key) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const openGoogleCalendarAuth = (userId) => {
    const url = getGoogleNotificationCalendarStartUrl(userId);

    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url }, () => {
        if (chrome.runtime?.lastError) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const selectedCount = Object.values(preferences).filter(Boolean).length;
    if (selectedCount === 0) {
      setError('Selecciona al menos un canal de notificación.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await updateNotificationPreferences(user.id, preferences);

      if (preferences.browser) {
        await requestNativePermission();
      }

      if (preferences.googleCalendar && !data.user.googleCalendarConnected) {
        openGoogleCalendarAuth(user.id);
      }

      notifySuccess(
        mode === 'setup'
          ? 'Tus preferencias de alertas de precio quedaron guardadas.'
          : 'Preferencias actualizadas correctamente.',
        { title: 'Preferencias guardadas' },
      );

      onComplete(data.user);
    } catch (apiError) {
      setError(apiError.message);
      notifyError(apiError.message, { title: 'No se pudieron guardar las preferencias' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <button
        onClick={onClose}
        type="button"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-xl font-medium leading-none text-[#20212A]/60 transition-colors hover:bg-gray-100 hover:text-[#20212A] active:scale-95"
        aria-label="Close"
      >
        x
      </button>

      <main className="flex grow flex-col overflow-y-auto px-8 pb-8 pt-14">
        <section className="text-center">
          <img
            src="/images/kueski-logo.webp"
            alt="Kueski"
            className="mx-auto h-12 w-auto object-contain"
          />
          <h1 className="mt-10 text-3xl font-bold leading-tight text-[#20212A]">
            {mode === 'setup' ? 'Configura tus alertas' : 'Preferencias de alertas'}
          </h1>
          <p className="mt-3 text-sm font-medium text-[#6B7280]">
            Elige cómo quieres recibir notificaciones cuando baje el precio de un producto.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {CHANNELS.map((channel) => {
            const isActive = preferences[channel.key];

            return (
              <button
                key={channel.key}
                type="button"
                onClick={() => togglePreference(channel.key)}
                className={`w-full rounded-3xl border p-4 text-left transition-all active:scale-[0.99] ${
                  isActive
                    ? 'border-[#4B73F8] bg-[#EEF2FF] shadow-[0_8px_22px_rgba(75,115,248,0.12)]'
                    : 'border-[#D1D5DB] bg-white hover:border-[#4B73F8]/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      isActive ? 'border-[#4B73F8] bg-[#4B73F8] text-white' : 'border-[#D1D5DB] bg-white'
                    }`}
                  >
                    {isActive ? '✓' : ''}
                  </span>
                  <span>
                    <span className="block text-base font-bold text-[#20212A]">{channel.title}</span>
                    <span className="mt-1 block text-sm font-medium text-[#6B7280]">{channel.description}</span>
                  </span>
                </div>
              </button>
            );
          })}

          {preferences.googleCalendar && !user.googleCalendarConnected && (
            <p className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-[#4B73F8]">
              Al guardar, se abrirá Google para conectar tu calendario si aún no lo has autorizado.
            </p>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white transition-colors hover:bg-[#345ee8] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? 'Guardando...' : mode === 'setup' ? 'Continuar al menú' : 'Guardar cambios'}
          </button>

          {mode === 'edit' && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
            >
              Volver al menú
            </button>
          )}
        </form>
      </main>
    </div>
  );
}

export default NotificationPreferencesPage;

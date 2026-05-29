import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage.jsx';
import { NotificationProvider } from './components/NotificationCenter.jsx';
import { getNotificationPreferences } from './api.js';

const SESSION_STORAGE_KEY = 'kueski_widget_session_v1';
const SESSION_DURATION_HOURS = 6;
const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;

function getStoredSession() {
  try {
    const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    const expiresAt = Number(parsed?.expiresAt || 0);

    if (!parsed?.user || !expiresAt || Date.now() > expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return parsed.user;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSession(user) {
  const payload = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function App() {
  const [user, setUser] = useState(null);
  const [needsPreferencesSetup, setNeedsPreferencesSetup] = useState(false);
  const [preferencesMode, setPreferencesMode] = useState('setup');
  const [isBootstrappingSession, setIsBootstrappingSession] = useState(true);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return;
    }

    if (user?.id) {
      chrome.runtime.sendMessage({ type: 'register_user_session', userId: user.id }, () => {});
      return;
    }

    chrome.runtime.sendMessage({ type: 'clear_user_session' }, () => {});
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const storedUser = getStoredSession();

    if (!storedUser) {
      setIsBootstrappingSession(false);
      return () => {
        isMounted = false;
      };
    }

    getNotificationPreferences(storedUser.id)
      .then(({ user: freshUser }) => {
        if (!isMounted) return;
        persistSession(freshUser);
        setUser(freshUser);
        setNeedsPreferencesSetup(!freshUser.priceNotificationPreferences?.configured);
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(storedUser);
        setNeedsPreferencesSetup(!storedUser.priceNotificationPreferences?.configured);
      })
      .finally(() => {
        if (isMounted) {
          setIsBootstrappingSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = (nextUser) => {
    persistSession(nextUser);
    setUser(nextUser);
    setPreferencesMode('setup');
    setNeedsPreferencesSetup(!nextUser.priceNotificationPreferences?.configured);
  };

  const handlePreferencesComplete = (updatedUser) => {
    persistSession(updatedUser);
    setUser(updatedUser);
    setNeedsPreferencesSetup(false);
    setPreferencesMode('setup');
  };

  const handleOpenPreferences = () => {
    setPreferencesMode('edit');
    setNeedsPreferencesSetup(true);
  };

  const handleCancelPreferences = () => {
    setNeedsPreferencesSetup(false);
    setPreferencesMode('setup');
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  // Definimos la función de cierre una sola vez aquí
  const handleCloseWidget = () => {
    window.close();
  };

  // Si no hay usuario, pasamos onClose al LoginPage
  return (
    <NotificationProvider>
      {isBootstrappingSession ? (
        <div className="flex h-full w-full items-center justify-center bg-white text-sm font-medium text-[#6B7280]">
          Cargando sesión...
        </div>
      ) : !user ? (
        <LoginPage
          onLogin={handleLogin}
          onClose={handleCloseWidget}
        />
      ) : needsPreferencesSetup ? (
        <NotificationPreferencesPage
          user={user}
          mode={preferencesMode}
          onComplete={handlePreferencesComplete}
          onCancel={handleCancelPreferences}
          onClose={handleCloseWidget}
        />
      ) : (
        <MenuPage
          user={user}
          onLogout={handleLogout}
          onClose={handleCloseWidget}
          onEditNotificationPreferences={handleOpenPreferences}
        />
      )}
    </NotificationProvider>
  );
}

export default App;
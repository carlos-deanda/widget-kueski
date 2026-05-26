import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import { NotificationProvider } from './components/NotificationCenter.jsx';
import { obtenerTiendaAfiliada } from './config/tiendasAfiliadas.js';

const SESSION_STORAGE_KEY = 'kueski_widget_session_v1';
const SESSION_DURATION_HOURS = 6;
const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;
const DEFAULT_STORE_DETECTION = {
  hostname: '',
  tiendaAfiliada: null,
  esTiendaAfiliada: false,
};

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

function getHostnameFromUrl(url) {
  try {
    return new URL(url).hostname || '';
  } catch {
    return '';
  }
}

function getWindowHostname() {
  try {
    return window.location.hostname || '';
  } catch {
    return '';
  }
}

function isExtensionPopupContext() {
  try {
    return window.location.protocol === 'chrome-extension:'
      || window.location.protocol === 'moz-extension:';
  } catch {
    return false;
  }
}

function getActiveTabHostname() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime?.lastError) {
        resolve('');
        return;
      }

      resolve(getHostnameFromUrl(tabs?.[0]?.url || ''));
    });
  });
}

function App() {
  const [user, setUser] = useState(null);
  const [storeDetection, setStoreDetection] = useState(DEFAULT_STORE_DETECTION);

  useEffect(() => {
    let isMounted = true;

    const detectStore = async () => {
      const windowHostname = getWindowHostname();
      const activeTabHostname = isExtensionPopupContext()
        ? await getActiveTabHostname()
        : '';
      const hostname = activeTabHostname || windowHostname;
      const tiendaAfiliada = obtenerTiendaAfiliada(hostname);

      if (!isMounted) {
        return;
      }

      setStoreDetection({
        hostname,
        tiendaAfiliada,
        esTiendaAfiliada: Boolean(tiendaAfiliada),
      });
    };

    detectStore();

    return () => {
      isMounted = false;
    };
  }, []);

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
    const storedUser = getStoredSession();

    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogin = (nextUser) => {
    persistSession(nextUser);
    setUser(nextUser);
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
      {!user ? (
        <LoginPage
          onLogin={handleLogin}
          onClose={handleCloseWidget}
        />
      ) : (
        <MenuPage
          user={user}
          onLogout={handleLogout}
          onClose={handleCloseWidget}
          storeDetection={storeDetection}
        />
      )}
    </NotificationProvider>
  );
}

export default App;

import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import MenuPage from './pages/MenuPage.jsx';
import { NotificationProvider } from './components/NotificationCenter.jsx';

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
        />
      )}
    </NotificationProvider>
  );
}

export default App;
import { useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import MenuPage from './pages/MenuPage.jsx';

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return <MenuPage user={user} onLogout={() => setUser(null)} />;
}

export default App;

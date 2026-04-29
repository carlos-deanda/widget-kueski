import { useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import MenuPage from './pages/MenuPage.jsx';

function App() {
  const [user, setUser] = useState(null);

  // Definimos la función de cierre una sola vez aquí
  const handleCloseWidget = () => {
    window.close();
  };

  // Si no hay usuario, pasamos onClose al LoginPage
  if (!user) {
    return (
      <LoginPage 
        onLogin={setUser} 
        onClose={handleCloseWidget} 
      />
    );
  }

  // Si hay usuario, pasamos onClose al MenuPage
  return (
    <MenuPage 
      user={user} 
      onLogout={() => setUser(null)} 
      onClose={handleCloseWidget} 
    />
  );
}

export default App;
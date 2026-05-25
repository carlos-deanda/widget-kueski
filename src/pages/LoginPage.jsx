import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { getUsers, login } from '../api.js';
import { useNotifications } from '../components/useNotifications.js';

// Se añade onClose a las props
function LoginPage({ onLogin, onClose }) {
  const { error: notifyError, success: notifySuccess } = useNotifications();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getUsers()
      .then(() => {
        if (!isMounted) return;
        setUsername('');
      })
      .catch((apiError) => {
        if (!isMounted) return;
        setError(apiError.message);
        notifyError(apiError.message, { title: 'Error de conexión' });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [notifyError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login(username.trim(), password);
      notifySuccess(`Bienvenido ${data.user.name}.`, { title: 'Inicio de sesión exitoso' });
      onLogin(data.user);
    } catch (apiError) {
      setError(apiError.message);
      notifyError(apiError.message, { title: 'No fue posible entrar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col font-sans text-slate-900">
      {/* Se pasa la prop onClose al TopBar */}
      <TopBar onClose={onClose} />

      <main className="grow overflow-y-auto p-4">
        <section>
          <h1 className="text-2xl font-bold leading-tight">Iniciar sesion</h1>
          <p className="mt-1 text-sm text-slate-500">Entra con un usuario local para cargar su widget.</p>
        </section>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Username"
              autoComplete="username"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0057ff]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0057ff]"
            />
          </label>

          { /*
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-slate-900">Usuarios demo</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
              {users.map((user) => (
                <React.Fragment key={user.id}>
                  <span>{user.username}</span>
                  <span>{user.username}123</span>
                </React.Fragment>
              ))}
            </div>
          </div>
*/}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || isSubmitting || !username || !password}
            className="w-full rounded-xl bg-[#0057ff] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <button
            type="button"
            disabled
            className="w-full rounded-xl border border-slate-300 bg-slate-100 py-3 text-sm font-bold text-slate-400"
          >
            Registrar
          </button>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;
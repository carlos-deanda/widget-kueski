import { useEffect, useState } from 'react';
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
          <h1 className="mt-10 text-3xl font-bold leading-tight text-[#20212A]">Inicia sesión</h1>
        </section>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <label className="block">
            <span className="sr-only">Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Usuario"
              autoComplete="username"
              className="w-full rounded-2xl border border-[#D1D5DB] bg-white px-5 py-4 text-base font-medium text-[#20212A] outline-none transition-colors placeholder:text-gray-400 focus:border-[#4B73F8] focus:ring-2 focus:ring-[#4B73F8]/15 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>

          <label className="block">
            <span className="sr-only">Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[#D1D5DB] bg-white px-5 py-4 text-base font-medium text-[#20212A] outline-none transition-colors placeholder:text-gray-400 focus:border-[#4B73F8] focus:ring-2 focus:ring-[#4B73F8]/15 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </label>

          <div className="flex justify-end">
            <span className="text-sm font-semibold text-[#4B73F8]">¿Olvidaste tu contraseña?</span>
          </div>

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
            className="mt-2 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white transition-colors hover:bg-[#345ee8] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          <div className="pt-4 text-center text-sm font-medium text-[#20212A]">
            <span>¿Aún no tienes cuenta?</span>{' '}
            <button
              type="button"
              disabled
              className="font-bold text-[#4B73F8] disabled:cursor-default disabled:opacity-100"
            >
              Crear una cuenta
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;

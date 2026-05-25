import { useEffect, useState } from 'react';
import { getUsers, login } from '../api.js';

// Se añade onClose a las props
function LoginPage({ onLogin, onClose }) {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getUsers()
      .then((data) => {
        if (!isMounted) return;
        setUsers(data.users);
        setUsername('');
      })
      .catch((apiError) => {
        if (!isMounted) return;
        setError(apiError.message);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const data = await login(username.trim(), password);
      onLogin(data.user);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <button
        onClick={onClose}
        type="button"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95"
        aria-label="Close"
      >
        ×
      </button>

      <main className="flex grow flex-col overflow-y-auto px-7 pb-6 pt-12">
        <section className="flex flex-col items-center text-center">
          <img
            src="/images/kueski-logo.webp"
            alt="Kueski"
            className="h-10 w-auto object-contain"
          />
          <h1 className="mt-11 text-4xl font-bold leading-none tracking-normal text-[#20212A]">
            Inicia sesión
          </h1>
        </section>

        <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-4">
          <span className="sr-only">{users.length} usuarios disponibles</span>

          <label className="block">
            <span className="sr-only">Usuario</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Correo electrónico *"
              autoComplete="username"
              className="h-[66px] w-full rounded-[18px] border border-[#D1D5DB] bg-white px-5 text-xl font-normal text-[#20212A] outline-none transition-colors placeholder:text-slate-500 focus:border-[#4B73F8] disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>

          <label className="block">
            <span className="sr-only">Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoading || isSubmitting}
              placeholder="Contraseña *"
              autoComplete="current-password"
              className="h-[66px] w-full rounded-[18px] border border-[#D1D5DB] bg-white px-5 text-xl font-normal text-[#20212A] outline-none transition-colors placeholder:text-slate-500 focus:border-[#4B73F8] disabled:bg-slate-50 disabled:text-slate-400"
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
            <p className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled
            className="-mt-1 self-start text-base font-bold text-[#4B73F8] disabled:cursor-default disabled:opacity-100"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <button
            type="submit"
            disabled={isLoading || isSubmitting || !username || !password}
            className="mt-4 h-[62px] w-full rounded-full bg-[#4B73F8] text-xl font-medium text-white transition-colors hover:bg-[#3f64df] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          <p className="mt-2 text-center text-base text-[#20212A]">
            ¿Aún no tienes cuenta?{' '}
            <button
              type="button"
              disabled
              className="font-bold text-[#4B73F8] disabled:cursor-default disabled:opacity-100"
            >
              Crear una cuenta
            </button>
          </p>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;

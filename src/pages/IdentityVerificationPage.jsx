import { useEffect, useRef, useState } from 'react';
import TopBar from '../components/TopBar.jsx';
import { verifyUserIdentity } from '../api.js';

const STEP_DURATION_MS = 2000;
const INITIAL_STEP_STATUS = {
  document: 'idle',
  selfie: 'idle',
  address: 'idle',
};

function IdentityVerificationPage({ user, onVerified, onClose }) {
  const [stepStatus, setStepStatus] = useState(INITIAL_STEP_STATUS);
  const [postalCode, setPostalCode] = useState('');
  const [message, setMessage] = useState({
    type: 'info',
    text: 'Este flujo es una simulación local. Tus imágenes no se procesan ni se envían a servidores.',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState(null);
  const timeouts = useRef([]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const runSimulatedCheck = (callback) => {
    const timeoutId = window.setTimeout(() => {
      timeouts.current = timeouts.current.filter((currentId) => currentId !== timeoutId);
      callback();
    }, STEP_DURATION_MS);

    timeouts.current.push(timeoutId);
  };

  const handleDocumentUpload = (event) => {
    if (!event.target.files?.length || stepStatus.document !== 'idle') {
      return;
    }

    setStepStatus((currentStatus) => ({ ...currentStatus, document: 'loading' }));
    setMessage({
      type: 'info',
      text: 'Estamos verificando tu documento de forma simulada y segura.',
    });

    runSimulatedCheck(() => {
      setStepStatus((currentStatus) => ({ ...currentStatus, document: 'done' }));
      setMessage({
        type: 'info',
        text: 'Documento verificado. Ahora sube una selfie para continuar.',
      });
    });
  };

  const handleSelfieUpload = (event) => {
    if (!event.target.files?.length || stepStatus.selfie !== 'idle') {
      return;
    }

    setStepStatus((currentStatus) => ({ ...currentStatus, selfie: 'loading' }));
    setMessage({
      type: 'info',
      text: 'Estamos verificando tu rostro de forma simulada.',
    });

    runSimulatedCheck(() => {
      setStepStatus((currentStatus) => ({ ...currentStatus, selfie: 'done' }));
      setMessage({
        type: 'info',
        text: 'Rostro verificado. Solo falta validar tu domicilio.',
      });
    });
  };

  const completeIdentityVerification = async () => {
    setStepStatus((currentStatus) => ({ ...currentStatus, address: 'done' }));
    setIsUpdatingProfile(true);
    setMessage({
      type: 'info',
      text: 'Domicilio verificado. Guardando la verificación en tu perfil...',
    });

    try {
      const data = await verifyUserIdentity(user.id);
      setVerifiedUser(data.user);
      setMessage({
        type: 'info',
        text: 'Tu perfil quedó actualizado correctamente.',
      });
    } catch (apiError) {
      setStepStatus((currentStatus) => ({ ...currentStatus, address: 'idle' }));
      setMessage({
        type: 'error',
        text: apiError.message || 'No se pudo actualizar tu verificación. Intenta de nuevo.',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAddressVerification = (event) => {
    event.preventDefault();

    if (!postalCode.trim()) {
      setMessage({
        type: 'error',
        text: 'Ingresa tu código postal para verificar el domicilio.',
      });
      return;
    }

    if (stepStatus.address !== 'idle') {
      return;
    }

    setStepStatus((currentStatus) => ({ ...currentStatus, address: 'loading' }));
    setMessage({
      type: 'info',
      text: 'Estamos verificando tu domicilio de forma simulada.',
    });

    runSimulatedCheck(completeIdentityVerification);
  };

  const renderMessage = () => {
    const messageClass = message.type === 'error'
      ? 'mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#EF4444]'
      : 'mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-[#4B73F8]';

    return <p className={messageClass}>{message.text}</p>;
  };

  const renderStepStatus = (status, loadingText, doneText) => {
    if (status === 'loading') {
      return (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-[#4B73F8]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-100 border-t-[#4B73F8]" />
          {loadingText}
        </p>
      );
    }

    if (status === 'done') {
      return (
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-[#16A34A]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m5 13 4 4L19 7" />
          </svg>
          {doneText}
        </p>
      );
    }

    return null;
  };

  const canUploadSelfie = stepStatus.document === 'done';
  const canVerifyAddress = stepStatus.selfie === 'done';

  if (verifiedUser) {
    return (
      <div className="flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
        <TopBar onClose={onClose} />

        <main className="flex grow flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center">
          <div className="w-full rounded-3xl border border-[#D1D5DB]/80 bg-white p-8 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-green-50 text-[#5FCB71]">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m5 13 4 4L19 7" />
              </svg>
            </div>

            <h1 className="mt-7 text-3xl font-bold leading-tight text-[#20212A]">
              ¡Identidad verificada!
            </h1>

            <p className="mt-3 text-base font-medium leading-relaxed text-[#6B7280]">
              Ya puedes continuar con el widget.
            </p>

            <button
              type="button"
              onClick={() => onVerified(verifiedUser)}
              className="mt-8 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98]"
            >
              Continuar
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <TopBar onClose={onClose} />

      <main className="grow overflow-y-auto px-5 pb-6 pt-2">
        <div className="rounded-3xl border border-[#D1D5DB]/80 bg-white p-5 shadow-[0_12px_30px_rgba(32,33,42,0.08)]">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#6B7280]">
                {user?.name} · validación simulada
              </p>
              <h2 className="mt-1 text-3xl font-bold leading-tight text-[#20212A]">
                Verificación de identidad
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4B73F8]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016Z" />
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
              <span className="text-sm font-bold text-[#20212A]">
                Sube una foto de tu INE
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleDocumentUpload}
                disabled={stepStatus.document !== 'idle' || isUpdatingProfile}
                className="mt-3 w-full text-sm font-medium text-[#6B7280] file:mr-3 file:rounded-full file:border-0 file:bg-[#4B73F8] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white disabled:cursor-not-allowed disabled:text-gray-400"
              />
              {renderStepStatus(
                stepStatus.document,
                'Verificando documento...',
                'Documento verificado',
              )}
            </label>

            <label className="block rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
              <span className="text-sm font-bold text-[#20212A]">
                Sube una foto de tu rostro
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleSelfieUpload}
                disabled={!canUploadSelfie || stepStatus.selfie !== 'idle' || isUpdatingProfile}
                className="mt-3 w-full text-sm font-medium text-[#6B7280] file:mr-3 file:rounded-full file:border-0 file:bg-[#4B73F8] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white disabled:cursor-not-allowed disabled:text-gray-400"
              />
              {!canUploadSelfie && (
                <p className="mt-2 text-xs font-medium text-[#6B7280]">
                  Primero verifica el documento.
                </p>
              )}
              {renderStepStatus(
                stepStatus.selfie,
                'Verificando rostro...',
                'Rostro verificado',
              )}
            </label>

            <form onSubmit={handleAddressVerification} className="rounded-3xl border border-[#D1D5DB]/80 bg-white p-4 shadow-sm">
              <label className="block">
                <span className="text-sm font-bold text-[#20212A]">
                  Código postal
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
                  disabled={!canVerifyAddress || stepStatus.address !== 'idle' || isUpdatingProfile}
                  placeholder="Ingresa tu código postal"
                  className="mt-3 w-full rounded-2xl border border-[#D1D5DB] bg-white px-5 py-4 text-base font-medium text-[#20212A] outline-none transition-colors placeholder:text-gray-400 focus:border-[#4B73F8] focus:ring-2 focus:ring-[#4B73F8]/15 disabled:bg-gray-50 disabled:text-gray-400"
                />
              </label>

              {!canVerifyAddress && (
                <p className="mt-2 text-xs font-medium text-[#6B7280]">
                  Primero verifica tu rostro.
                </p>
              )}

              {renderStepStatus(
                stepStatus.address,
                'Verificando domicilio...',
                'Domicilio verificado',
              )}

              {isUpdatingProfile && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-[#4B73F8]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-100 border-t-[#4B73F8]" />
                  Actualizando perfil...
                </p>
              )}

              <button
                type="submit"
                disabled={!canVerifyAddress || !postalCode || stepStatus.address !== 'idle' || isUpdatingProfile}
                className="mt-4 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
              >
                Verificar domicilio
              </button>
            </form>
          </div>

          {renderMessage()}
        </div>
      </main>
    </div>
  );
}

export default IdentityVerificationPage;

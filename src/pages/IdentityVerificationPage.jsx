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
      ? 'mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700'
      : 'mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700';

    return <p className={messageClass}>{message.text}</p>;
  };

  const renderStepStatus = (status, loadingText, doneText) => {
    if (status === 'loading') {
      return (
        <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-700">
          <span className="h-4 w-4 rounded-full border-2 border-blue-100 border-t-[#0057ff] animate-spin" />
          {loadingText}
        </p>
      );
    }

    if (status === 'done') {
      return <p className="mt-3 text-sm font-bold text-[#16a34a]">{doneText}</p>;
    }

    return null;
  };

  const canUploadSelfie = stepStatus.document === 'done';
  const canVerifyAddress = stepStatus.selfie === 'done';

  if (verifiedUser) {
    return (
      <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
        <TopBar onClose={onClose} />

        <div className="grow overflow-y-auto flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200 w-full">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto shadow-sm">
              ✓
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              ¡Identidad verificada!
            </h1>

            <p className="text-slate-500 mt-3 text-base font-medium leading-relaxed">
              Ya puedes continuar con el widget.
            </p>

            <button
              type="button"
              onClick={() => onVerified(verifiedUser)}
              className="mt-8 w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-blue-200 shadow-lg transition-all active:scale-95 text-base"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col">
      <TopBar onClose={onClose} />

      <div className="grow rounded-b-2xl border-x border-b border-slate-200 bg-[#f5f5f5] p-4 overflow-y-auto">
        <div className="rounded-2xl border border-slate-200 bg-[#f8f8f8] p-4 shadow-sm">
          <div className="mb-6">
            <h2 className="text-[24px] font-semibold leading-tight text-slate-900">
              Verificación de identidad
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {user?.name} · validación simulada
            </p>
          </div>

          <div className="space-y-4">
            <label className="block rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-sm font-bold text-slate-700">
                Sube una foto de tu INE
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleDocumentUpload}
                disabled={stepStatus.document !== 'idle' || isUpdatingProfile}
                className="mt-3 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0057ff] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white disabled:cursor-not-allowed disabled:text-slate-400"
              />
              {renderStepStatus(
                stepStatus.document,
                'Verificando documento...',
                'Documento verificado ✓',
              )}
            </label>

            <label className="block rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-sm font-bold text-slate-700">
                Sube una foto de tu rostro
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleSelfieUpload}
                disabled={!canUploadSelfie || stepStatus.selfie !== 'idle' || isUpdatingProfile}
                className="mt-3 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0057ff] file:px-3 file:py-2 file:text-sm file:font-bold file:text-white disabled:cursor-not-allowed disabled:text-slate-400"
              />
              {!canUploadSelfie && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Primero verifica el documento.
                </p>
              )}
              {renderStepStatus(
                stepStatus.selfie,
                'Verificando rostro...',
                'Rostro verificado ✓',
              )}
            </label>

            <form onSubmit={handleAddressVerification} className="rounded-xl border border-slate-200 bg-white p-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">
                  Código postal
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))}
                  disabled={!canVerifyAddress || stepStatus.address !== 'idle' || isUpdatingProfile}
                  placeholder="Ingresa tu código postal"
                  className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none focus:border-[#0057ff] disabled:bg-slate-100"
                />
              </label>

              {!canVerifyAddress && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Primero verifica tu rostro.
                </p>
              )}

              {renderStepStatus(
                stepStatus.address,
                'Verificando domicilio...',
                'Domicilio verificado ✓',
              )}

              {isUpdatingProfile && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-700">
                  <span className="h-4 w-4 rounded-full border-2 border-blue-100 border-t-[#0057ff] animate-spin" />
                  Actualizando perfil...
                </p>
              )}

              <button
                type="submit"
                disabled={!canVerifyAddress || !postalCode || stepStatus.address !== 'idle' || isUpdatingProfile}
                className="mt-3 w-full rounded-xl bg-[#0057ff] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Verificar domicilio
              </button>
            </form>
          </div>

          {renderMessage()}
        </div>
      </div>
    </div>
  );
}

export default IdentityVerificationPage;

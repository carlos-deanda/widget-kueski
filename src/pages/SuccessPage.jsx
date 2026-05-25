import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar.jsx';

const DIGITAL_CARD_STORAGE_KEY = 'kueskiDigitalCard';
const VERIFICATION_STORAGE_KEY = 'kueskiDigitalCardVerification';
const VERIFICATION_CODE = '123456';
const CARD_DURATION_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 3;

function readStorage(key, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function getStoredVerification() {
  const verification = readStorage(VERIFICATION_STORAGE_KEY, { attempts: 0, lockUntil: 0 });
  const lockUntil = Number(verification.lockUntil || 0);

  if (lockUntil && lockUntil <= Date.now()) {
    removeStorage(VERIFICATION_STORAGE_KEY);
    return { attempts: 0, lockUntil: 0 };
  }

  return {
    attempts: Number(verification.attempts || 0),
    lockUntil,
  };
}

function getStoredCard() {
  const card = readStorage(DIGITAL_CARD_STORAGE_KEY, null);

  if (!card) {
    return null;
  }

  if (card.estado === 'activa' && Number(card.expiracion) <= Date.now()) {
    const expiredCard = { ...card, estado: 'expirada' };
    writeStorage(DIGITAL_CARD_STORAGE_KEY, expiredCard);
    return expiredCard;
  }

  return card;
}

function getRandomDigit() {
  return Math.floor(Math.random() * 10);
}

function getLuhnCheckDigit(partialNumber) {
  const digits = `${partialNumber}0`.split('').map(Number);
  let sum = 0;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits[index];
    const positionFromRight = digits.length - 1 - index;

    if (positionFromRight % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  return (10 - (sum % 10)) % 10;
}

function generateCardNumber() {
  let partialNumber = '4152';

  while (partialNumber.length < 15) {
    partialNumber += getRandomDigit();
  }

  return `${partialNumber}${getLuhnCheckDigit(partialNumber)}`;
}

function generateCvv() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function generateDigitalCard() {
  return {
    numero: generateCardNumber(),
    cvv: generateCvv(),
    expiracion: String(Date.now() + CARD_DURATION_MS),
    estado: 'activa',
  };
}

function formatCardNumber(cardNumber) {
  return cardNumber.replace(/(.{4})/g, '$1 ').trim();
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function formatExpiration(timestamp) {
  return new Date(Number(timestamp)).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SuccessPage({ onBack, onClose }) {
  const [card, setCard] = useState(() => getStoredCard());
  const [verification, setVerification] = useState(() => getStoredVerification());
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [now, setNow] = useState(() => Date.now());

  const lockUntil = Number(verification.lockUntil || 0);
  const isLocked = lockUntil > now;
  const lockRemaining = Math.max(0, lockUntil - now);
  const remaining = card?.estado === 'activa'
    ? Math.max(0, Number(card.expiracion) - now)
    : 0;
  const isDigitalCardFlow = isVerifying || Boolean(card);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!card || card.estado !== 'activa' || Number(card.expiracion) > now) {
      return;
    }

    setCard((currentCard) => {
      if (!currentCard || currentCard.estado !== 'activa') {
        return currentCard;
      }

      const expiredCard = { ...currentCard, estado: 'expirada' };
      writeStorage(DIGITAL_CARD_STORAGE_KEY, expiredCard);
      return expiredCard;
    });
  }, [card, now]);

  useEffect(() => {
    if (!lockUntil || lockUntil > now) {
      return;
    }

    setVerification({ attempts: 0, lockUntil: 0 });
    removeStorage(VERIFICATION_STORAGE_KEY);
  }, [lockUntil, now]);

  const persistVerification = (nextVerification) => {
    setVerification(nextVerification);
    writeStorage(VERIFICATION_STORAGE_KEY, nextVerification);
  };

  const clearVerification = () => {
    setVerification({ attempts: 0, lockUntil: 0 });
    removeStorage(VERIFICATION_STORAGE_KEY);
  };

  const startVerification = () => {
    setIsVerifying(true);
    setCode('');

    if (isLocked) {
      setMessage({
        type: 'error',
        text: `Intento bloqueado. Prueba otra vez en ${formatCountdown(lockRemaining)}.`,
      });
      return;
    }

    console.info(`Código de verificación simulado: ${VERIFICATION_CODE}`);
    setMessage({
      type: 'info',
      text: 'Ingresa el código de verificación de 6 dígitos.',
    });
  };

  const handleCodeChange = (event) => {
    setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
  };

  const handleVerifyCode = (event) => {
    event.preventDefault();

    if (isLocked) {
      setMessage({
        type: 'error',
        text: `Intento bloqueado. Prueba otra vez en ${formatCountdown(lockRemaining)}.`,
      });
      return;
    }

    if (code !== VERIFICATION_CODE) {
      const attempts = verification.attempts + 1;

      if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
        const nextVerification = {
          attempts,
          lockUntil: Date.now() + LOCK_DURATION_MS,
        };

        persistVerification(nextVerification);
        setCode('');
        setMessage({
          type: 'error',
          text: 'Código incorrecto. El intento quedó bloqueado por 5 minutos.',
        });
        return;
      }

      persistVerification({ attempts, lockUntil: 0 });
      setMessage({
        type: 'error',
        text: `Código incorrecto. Te quedan ${MAX_VERIFICATION_ATTEMPTS - attempts} intentos.`,
      });
      return;
    }

    const nextCard = generateDigitalCard();
    writeStorage(DIGITAL_CARD_STORAGE_KEY, nextCard);
    clearVerification();
    setCard(nextCard);
    setCode('');
    setIsVerifying(false);
    setMessage({
      type: 'info',
      text: 'Tarjeta generada correctamente.',
    });
  };

  const handleCopy = async (value, label) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setMessage({ type: 'info', text: `${label} copiado.` });
    } catch {
      setMessage({ type: 'error', text: `No se pudo copiar ${label.toLowerCase()}.` });
    }
  };

  const markAsUsed = () => {
    setCard((currentCard) => {
      if (!currentCard) {
        return currentCard;
      }

      const usedCard = { ...currentCard, estado: 'usada' };
      writeStorage(DIGITAL_CARD_STORAGE_KEY, usedCard);
      return usedCard;
    });
    setMessage({
      type: 'error',
      text: 'La tarjeta fue marcada como usada y ya no es válida.',
    });
  };

  const renderMessage = () => {
    if (!message.text) {
      return null;
    }

    const messageClass = message.type === 'error'
      ? 'mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-[#EF4444]'
      : 'mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-medium text-[#4B73F8]';

    return <p className={messageClass}>{message.text}</p>;
  };

  const renderBackButton = () => (
    <button
      onClick={onBack}
      className="mt-3 w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
    >
      Volver al menú principal
    </button>
  );

  const renderVerification = () => (
    <>
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EEF2FF] text-[#4B73F8]">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" />
        </svg>
      </div>

      <h1 className="mt-5 text-3xl font-bold leading-tight text-[#20212A]">
        Verifica tu código
      </h1>

      <p className="mt-3 text-base font-medium leading-relaxed text-[#6B7280]">
        Ingresa el código de 6 dígitos para generar tu tarjeta digital.
      </p>

      <form onSubmit={handleVerifyCode} className="mt-6 space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength="6"
          value={code}
          onChange={handleCodeChange}
          disabled={isLocked}
          placeholder="000000"
          className="w-full rounded-2xl border border-[#D1D5DB] bg-white px-5 py-4 text-center text-2xl font-bold text-[#20212A] outline-none transition-colors placeholder:text-gray-400 focus:border-[#4B73F8] focus:ring-2 focus:ring-[#4B73F8]/15 disabled:bg-gray-50 disabled:text-gray-400"
        />

        <button
          type="submit"
          disabled={isLocked || code.length !== 6}
          className="w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {isLocked ? `Bloqueado ${formatCountdown(lockRemaining)}` : 'Verificar código'}
        </button>
      </form>

      {renderMessage()}
      {renderBackButton()}
    </>
  );

  const renderActiveCard = () => (
    <>
      <h1 className="text-3xl font-bold leading-tight text-[#20212A]">
        Tarjeta digital
      </h1>

      <p className="mt-2 text-base font-medium leading-relaxed text-[#6B7280]">
        Úsala una sola vez antes de que expire.
      </p>

      <div className="mt-5 flex aspect-[856/540] w-full flex-col justify-between overflow-hidden rounded-3xl border border-white/20 bg-[linear-gradient(135deg,#20212A_0%,#26305F_48%,#4B73F8_100%)] p-5 text-left text-white shadow-[0_16px_34px_rgba(32,33,42,0.20)]">
        <div className="flex items-start justify-between">
          <p className="text-2xl font-black">Kueski</p>
          <div className="h-8 w-12 rounded-full border border-white/40 opacity-70" />
        </div>

        <div className="h-9 w-12 overflow-hidden rounded-md border border-yellow-200/70 bg-[#D4AF37] shadow-inner">
          <div className="grid h-full w-full grid-cols-3 grid-rows-3">
            <span className="border-b border-r border-yellow-800/40" />
            <span className="border-b border-r border-yellow-800/40" />
            <span className="border-b border-yellow-800/40" />
            <span className="border-b border-r border-yellow-800/40" />
            <span className="border-b border-r border-yellow-800/40" />
            <span className="border-b border-yellow-800/40" />
            <span className="border-r border-yellow-800/40" />
            <span className="border-r border-yellow-800/40" />
            <span />
          </div>
        </div>

        <p className="whitespace-nowrap font-mono text-[15px] font-semibold text-white">
          {formatCardNumber(card.numero)}
        </p>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase text-white/65">
              Válida hasta
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {formatExpiration(card.expiracion)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-bold uppercase text-white/65">CVV</p>
            <p className="mt-1 text-sm font-bold text-white">{card.cvv}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-[#16A34A]">
        Válida por <span className="font-bold">{formatCountdown(remaining)}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleCopy(card.numero, 'Número')}
          className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
        >
          Copiar número
        </button>

        <button
          type="button"
          onClick={() => handleCopy(card.cvv, 'CVV')}
          className="w-full rounded-full border border-[#D1D5DB] bg-gray-50 py-3 text-sm font-bold text-[#20212A] transition-all hover:bg-gray-100 active:scale-[0.98]"
        >
          Copiar CVV
        </button>
      </div>

      {renderMessage()}

      <button
        type="button"
        onClick={markAsUsed}
        className="mt-4 w-full rounded-full bg-[#20212A] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(32,33,42,0.16)] transition-all hover:bg-black active:scale-[0.98]"
      >
        Marcar como usada
      </button>

      {renderBackButton()}
    </>
  );

  const renderInvalidCard = () => {
    const invalidMessage = card?.estado === 'expirada'
      ? 'La tarjeta expiró y ya no es válida.'
      : 'La tarjeta ya fue usada y no es válida.';

    return (
      <>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-[#EF4444]">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-bold leading-tight text-[#20212A]">
          Tarjeta no válida
        </h1>

        <p className="mt-3 text-base font-medium leading-relaxed text-[#6B7280]">
          {invalidMessage}
        </p>

        {renderMessage()}

        <button
          type="button"
          onClick={startVerification}
          className="mt-8 w-full rounded-full bg-[#4B73F8] py-4 text-base font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98]"
        >
          Generar nueva tarjeta
        </button>

        {renderBackButton()}
      </>
    );
  };

  const renderSuccess = () => (
    <>
      <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-green-50 text-[#5FCB71]">
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m5 13 4 4L19 7" />
        </svg>
      </div>

      <h1 className="mt-7 text-3xl font-bold leading-tight text-[#20212A]">
        ¡Felicidades!
      </h1>

      <p className="mt-3 text-lg font-medium leading-relaxed text-[#6B7280]">
        Tu compra se ha logrado <br /> con éxito.
      </p>

      <button
        onClick={startVerification}
        className="mt-8 w-full rounded-full bg-[#4B73F8] py-5 text-lg font-bold text-white shadow-[0_10px_22px_rgba(75,115,248,0.25)] transition-all hover:bg-[#345ee8] active:scale-[0.98]"
      >
        Generar tarjeta
      </button>

      {renderMessage()}
      {renderBackButton()}
    </>
  );

  const renderContent = () => {
    if (isVerifying) {
      return renderVerification();
    }

    if (card?.estado === 'activa') {
      return renderActiveCard();
    }

    if (card?.estado === 'expirada' || card?.estado === 'usada') {
      return renderInvalidCard();
    }

    return renderSuccess();
  };

  return (
    <div className="absolute inset-0 flex h-full w-full flex-col bg-white font-sans text-[#20212A]">
      <TopBar onClose={onClose} />

      <main className={isDigitalCardFlow ? 'flex grow flex-col items-center overflow-y-auto px-5 pb-6 pt-2 text-center' : 'flex grow flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center'}>
        <div className={isDigitalCardFlow ? 'mb-4 w-full rounded-3xl border border-[#D1D5DB]/80 bg-white p-6 shadow-[0_12px_30px_rgba(32,33,42,0.08)]' : 'mb-4 w-full rounded-3xl border border-[#D1D5DB]/80 bg-white p-8 shadow-[0_12px_30px_rgba(32,33,42,0.08)]'}>
          {renderContent()}
        </div>

        <p className="mt-auto pb-4 text-xs font-bold uppercase text-[#6B7280]">
          Sistema de pago seguro
        </p>
      </main>
    </div>
  );
}

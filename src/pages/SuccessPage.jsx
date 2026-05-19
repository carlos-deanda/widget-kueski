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
      ? 'mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700'
      : 'mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-medium text-blue-700';

    return <p className={messageClass}>{message.text}</p>;
  };

  const renderBackButton = () => (
    <button
      onClick={onBack}
      className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-100 py-3 text-sm font-bold text-slate-500 transition-all active:scale-95"
    >
      Volver al Menú Principal
    </button>
  );

  const renderVerification = () => (
    <>
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">
        Verifica tu código
      </h1>

      <p className="text-slate-500 mt-3 text-base font-medium leading-relaxed">
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
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-2xl font-bold tracking-widest text-slate-900 outline-none focus:border-[#0057ff] disabled:bg-slate-100"
        />

        <button
          type="submit"
          disabled={isLocked || code.length !== 6}
          className="w-full rounded-xl bg-[#0057ff] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">
        Tarjeta digital
      </h1>

      <p className="text-slate-500 mt-2 text-base font-medium leading-relaxed">
        Úsala una sola vez antes de que expire.
      </p>

      <div className="mt-5 w-full aspect-[856/540] rounded-2xl bg-[linear-gradient(135deg,#00512D_0%,#00512D_36%,#00A651_74%,#0033A0_100%)] p-5 text-left text-white shadow-xl shadow-slate-300/60 border border-white/20 flex flex-col justify-between overflow-hidden">
        <div className="flex items-start justify-between">
          <p className="text-2xl font-black tracking-normal">Kueski</p>
          <div className="h-8 w-12 rounded-full border border-white/40 opacity-70" />
        </div>

        <div className="w-12 h-9 rounded-md bg-[#D4AF37] border border-yellow-200/70 shadow-inner overflow-hidden">
          <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
            <span className="border-r border-b border-yellow-800/40" />
            <span className="border-r border-b border-yellow-800/40" />
            <span className="border-b border-yellow-800/40" />
            <span className="border-r border-b border-yellow-800/40" />
            <span className="border-r border-b border-yellow-800/40" />
            <span className="border-b border-yellow-800/40" />
            <span className="border-r border-yellow-800/40" />
            <span className="border-r border-yellow-800/40" />
            <span />
          </div>
        </div>

        <p className="text-[16px] font-mono font-semibold tracking-wider text-white whitespace-nowrap">
          {formatCardNumber(card.numero)}
        </p>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/65">
              VÁLIDA HASTA
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {formatExpiration(card.expiracion)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/65">CVV</p>
            <p className="mt-1 text-sm font-bold text-white">{card.cvv}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-green-100 bg-green-50 p-3 text-sm font-medium text-[#00512D]">
        Válida por <span className="font-bold">{formatCountdown(remaining)}</span>
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleCopy(card.numero, 'Número')}
          className="w-full rounded-xl border border-slate-300 bg-[#f5f5f5] py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
        >
          Copiar número
        </button>

        <button
          type="button"
          onClick={() => handleCopy(card.cvv, 'CVV')}
          className="w-full rounded-xl border border-slate-300 bg-[#f5f5f5] py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition-all"
        >
          Copiar CVV
        </button>
      </div>

      {renderMessage()}

      <button
        type="button"
        onClick={markAsUsed}
        className="mt-4 w-full bg-[#1e293b] hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 text-base"
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
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto shadow-sm">
          ✕
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Tarjeta no válida
        </h1>

        <p className="text-slate-500 mt-3 text-base font-medium leading-relaxed">
          {invalidMessage}
        </p>

        {renderMessage()}

        <button
          type="button"
          onClick={startVerification}
          className="mt-8 w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-blue-200 shadow-lg transition-all active:scale-95 text-base"
        >
          Generar nueva tarjeta
        </button>

        {renderBackButton()}
      </>
    );
  };

  const renderSuccess = () => (
    <>
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-5xl mb-8 mx-auto shadow-sm animate-bounce">
        ✓
      </div>

      <h1 className="text-3xl font-black text-slate-900 tracking-tight">
        ¡Felicidades!
      </h1>

      <p className="text-slate-500 mt-3 text-lg font-medium leading-relaxed">
        Tu compra se ha logrado <br /> con éxito.
      </p>

      <button
        onClick={startVerification}
        className="mt-8 w-full bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-5 rounded-2xl shadow-blue-200 shadow-lg transition-all active:scale-95 text-lg"
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
    <div className="w-full h-full bg-[#f3f4f6] font-sans text-slate-800 flex flex-col absolute inset-0">
      <TopBar onClose={onClose} />

      <div className={isDigitalCardFlow ? 'grow overflow-y-auto flex flex-col items-center p-6 text-center' : 'grow flex flex-col items-center justify-center p-6 text-center'}>
        <div className={isDigitalCardFlow ? 'bg-white p-8 rounded-3xl shadow-lg border border-slate-200 w-full mb-4' : 'bg-white p-10 rounded-3xl shadow-lg border border-slate-200 w-full mb-4'}>
          {renderContent()}
        </div>
        
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-auto pb-4">
          Sistema de Pago Seguro
        </p>
      </div>
    </div>
  );
}

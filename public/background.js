const API_BASE_URL = 'http://127.0.0.1:3001';
const PRICE_CHECK_ALARM = 'price-check';
const PRICE_SNAPSHOT_KEY = 'priceSnapshotsByUser';
const ACTIVE_USER_KEY = 'activeUserId';
const DEFAULT_PERIOD_MINUTES = 1;

console.log('Kueski background service worker started');

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function canUseExtensionNotifications() {
  return typeof chrome !== 'undefined' && !!chrome.notifications?.create;
}

function notify(title, message, id = undefined) {
  if (!canUseExtensionNotifications()) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const notifId = id || `kueski-${Date.now()}-${Math.random()}`;
    const icon = chrome.runtime.getURL('images/Kueski-Pay-Logo-Small.png');
    chrome.notifications.create(notifId, {
      type: 'basic',
      iconUrl: icon,
      title,
      message,
      priority: 2,
    }, () => {
      if (chrome.runtime?.lastError) {
        console.warn('Notification create failed', chrome.runtime.lastError.message);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function fetchDashboard(userId) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo leer el dashboard');
  }

  return data;
}

function getAlarmSchedule() {
  try {
    chrome.alarms.create(PRICE_CHECK_ALARM, { periodInMinutes: DEFAULT_PERIOD_MINUTES });
  } catch (error) {
    console.warn('Could not create price-check alarm', error);
  }
}

async function getStoredValue(key, fallback) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? fallback;
}

async function setStoredValue(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function updateUserSnapshot(userId, trackedProducts) {
  const snapshotsByUser = await getStoredValue(PRICE_SNAPSHOT_KEY, {});
  const currentSnapshot = snapshotsByUser[userId] || {};
  const nextSnapshot = { ...currentSnapshot };

  for (const product of trackedProducts) {
    nextSnapshot[product.id] = product.currentPrice;
  }

  snapshotsByUser[userId] = nextSnapshot;
  await setStoredValue(PRICE_SNAPSHOT_KEY, snapshotsByUser);
}

async function getUserSnapshot(userId) {
  const snapshotsByUser = await getStoredValue(PRICE_SNAPSHOT_KEY, {});
  return snapshotsByUser[userId] || {};
}

async function sendRemotePriceAlert(userId, product, previousPrice, currentPrice) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/price-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName: product.name,
        previousPrice,
        currentPrice,
        productId: product.productId || product.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo enviar la alerta remota');
    }

    return data;
  } catch (error) {
    console.warn('Remote price alert failed', error);
    return null;
  }
}

async function handlePriceCheck({ forceNotifyDown = false } = {}) {
  const userId = await getStoredValue(ACTIVE_USER_KEY, null);
  if (!userId) {
    return { ok: false, reason: 'No active user' };
  }

  const data = await fetchDashboard(userId);
  const trackedProducts = Array.isArray(data?.trackedProducts) ? data.trackedProducts : [];
  const preferences = data?.user?.priceNotificationPreferences || {};
  const previousSnapshot = await getUserSnapshot(userId);
  const notifications = [];
  const remoteAlerts = [];
  let emailAlertsSent = 0;
  let calendarAlertsSent = 0;

  for (const product of trackedProducts) {
    const currentPrice = Number(product.currentPrice || 0);
    const previousPrice = Number(previousSnapshot[product.id] ?? currentPrice);

    const priceDropped = currentPrice < previousPrice;
    const shouldNotify = forceNotifyDown ? product.trend === 'down' : priceDropped;

    if (shouldNotify) {
      const alertPreviousPrice = forceNotifyDown && previousPrice >= currentPrice
        ? currentPrice * 1.1
        : previousPrice;
      const previousLabel = formatCurrency(alertPreviousPrice);
      const currentLabel = formatCurrency(currentPrice);
      const title = forceNotifyDown ? 'Oferta detectada' : 'Bajada de precio detectada';
      const message = `${product.name} bajó de ${previousLabel} a ${currentLabel}.`;

      if (preferences.browser) {
        notifications.push({ title, message });
        await notify(title, message, `price-${userId}-${product.id}`);
      }

      if (preferences.email || preferences.googleCalendar) {
        remoteAlerts.push(
          sendRemotePriceAlert(userId, product, alertPreviousPrice, currentPrice),
        );
      }
    }
  }

  if (remoteAlerts.length > 0) {
    const remoteResults = await Promise.all(remoteAlerts);
    for (const result of remoteResults) {
      if (result?.emailSent) {
        emailAlertsSent += 1;
      }
      if (result?.calendarEventCreated) {
        calendarAlertsSent += 1;
      }
    }
  }

  await updateUserSnapshot(userId, trackedProducts);

  const alertsSent = notifications.length + emailAlertsSent + calendarAlertsSent;

  return {
    ok: true,
    userId,
    trackedProducts: trackedProducts.length,
    notificationsSent: alertsSent,
    browserNotificationsSent: notifications.length,
    emailAlertsSent,
    calendarAlertsSent,
    notifications,
  };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Kueski background installed');
  getAlarmSchedule();
});

chrome.runtime.onStartup.addListener(() => {
  getAlarmSchedule();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === 'register_user_session') {
    (async () => {
      await setStoredValue(ACTIVE_USER_KEY, message.userId || null);

      if (message.userId) {
        try {
          const data = await fetchDashboard(message.userId);
          await updateUserSnapshot(message.userId, data.trackedProducts || []);
        } catch (error) {
          console.warn('Could not initialize price snapshot', error);
        }
      }

      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'clear_user_session') {
    (async () => {
      await setStoredValue(ACTIVE_USER_KEY, null);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'schedule_test') {
    console.log('Received schedule_test message', message, 'from', sender);
    const delaySeconds = Number(message.delaySeconds) || 5;
    const when = Date.now() + delaySeconds * 1000;
    const name = `test-${Date.now()}`;

    // Create alarm for delayed test notification
    try {
      chrome.alarms.create(name, { when });
      console.log('Created test alarm', name, 'for', when);
    } catch (err) {
      console.warn('Failed to create test alarm', err);
    }

    // Send immediate confirmation notification so the user knows the
    // background received the message (helps debugging when alarms don't fire).
    try {
      notify('Prueba programada', `Se programó notificación en ${delaySeconds}s.`, `scheduled-${Date.now()}`);
    } catch (err) {
      console.warn('Could not send scheduled confirmation notification', err);
    }

    sendResponse({ ok: true, scheduledAt: when, name });
    return true;
  }

  if (message.type === 'check_prices_now') {
    (async () => {
      try {
        const result = await handlePriceCheck({ forceNotifyDown: !!message.forceNotifyDown });
        sendResponse({ ok: true, result });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.type === 'ping') {
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm || !alarm.name) return;

  console.log('Alarm fired:', alarm.name);

  if (alarm.name.startsWith('test-')) {
    notify('Notificación de prueba', 'Esta es una notificación programada (10s).');
    return;
  }

  if (alarm.name === PRICE_CHECK_ALARM) {
    handlePriceCheck().catch((error) => {
      console.warn('Price check failed', error);
    });
  }
});
export function openExternalUrl(url) {
  if (!url) {
    return false;
  }

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    chrome.tabs.create({ url });
    return true;
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  return Boolean(popup);
}

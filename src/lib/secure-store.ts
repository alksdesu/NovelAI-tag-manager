/**
 * API key storage via GM_setValue — isolated from page scripts, unlike
 * localStorage which any same-origin script on novelai.net can read.
 * Falls back to localStorage only when GM APIs are unavailable.
 */

const API_KEY_PREFIX = 'novelai-tag-maestro::apiKey::';

function hasGmApis(): boolean {
  return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
}

export function saveApiKey(provider: string, key: string): void {
  const storeKey = `${API_KEY_PREFIX}${provider}`;
  if (hasGmApis()) {
    try {
      GM_setValue(storeKey, key);
      // Clear localStorage copy if migrating
      try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
      return;
    } catch { /* fallthrough */ }
  }
  try {
    localStorage.setItem(storeKey, key);
  } catch { /* ignore */ }
}

export function loadApiKey(provider: string): string {
  const storeKey = `${API_KEY_PREFIX}${provider}`;
  if (hasGmApis()) {
    try {
      const val = GM_getValue<string>(storeKey, '');
      if (val) return val;
    } catch { /* fallthrough */ }
  }
  try {
    return localStorage.getItem(storeKey) || '';
  } catch {
    return '';
  }
}

export function clearApiKey(provider: string): void {
  const storeKey = `${API_KEY_PREFIX}${provider}`;
  if (hasGmApis()) {
    try { GM_deleteValue(storeKey); } catch { /* ignore */ }
  }
  try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
}

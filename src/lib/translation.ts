import { createSignal } from 'solid-js';
import { gmRequest } from './gm';
import {
  TRANSLATION_DICT_URL,
  TRANSLATION_DICT_KEY,
  TRANSLATION_DICT_AT_KEY,
  TRANSLATION_DICT_TTL_MS,
  TRANSLATION_CACHE_KEY,
} from '../constants';
import { loadTranslations, saveTranslations } from '../stores/persistence';
import type { TranslationCache } from '../types';

// ─── Translation dictionary (Danbooru Chinese) ──────────────────

const [dictionary, setDictionary] = createSignal<Record<string, string> | null>(loadCachedDictionary());
const [dictLoading, setDictLoading] = createSignal(false);
const [dictError, setDictError] = createSignal('');
let dictPromise: Promise<void> | null = null;

export { dictionary, dictLoading, dictError };

function loadCachedDictionary(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(TRANSLATION_DICT_KEY);
    if (!raw) return null;
    if (!isDictionaryFresh()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isDictionaryFresh(): boolean {
  try {
    const ts = localStorage.getItem(TRANSLATION_DICT_AT_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < TRANSLATION_DICT_TTL_MS;
  } catch {
    return false;
  }
}

function saveDictionary(dict: Record<string, string>) {
  try {
    localStorage.setItem(TRANSLATION_DICT_KEY, JSON.stringify(dict));
    localStorage.setItem(TRANSLATION_DICT_AT_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export async function ensureTranslationDictionary(force = false): Promise<Record<string, string> | null> {
  if (!force && dictionary()) return dictionary();
  if (!force && dictPromise) return dictPromise.then(() => dictionary());

  setDictLoading(true);
  setDictError('');

  dictPromise = (async () => {
    try {
      const { promise } = gmRequest({
        method: 'GET',
        url: TRANSLATION_DICT_URL,
        timeout: 15000,
      });
      const resp = await promise;
      if (resp.status < 200 || resp.status >= 300) {
        throw new Error(`Dictionary fetch failed: HTTP ${resp.status}`);
      }
      const dict = JSON.parse(resp.text) as Record<string, string>;
      setDictionary(dict);
      saveDictionary(dict);
    } catch (err) {
      setDictError(String(err));
    } finally {
      setDictLoading(false);
      dictPromise = null;
    }
  })();

  await dictPromise;
  return dictionary();
}

export function lookupTagTranslation(tag: string): string | null {
  const dict = dictionary();
  if (!dict) return null;
  const normalized = tag.trim().toLowerCase().replace(/\s+/g, '_');
  if (dict[normalized]) return dict[normalized];
  // Try first part before comma
  const firstPart = normalized.split(',')[0]?.trim();
  if (firstPart && dict[firstPart]) return dict[firstPart];
  return null;
}

// ─── Google Translate API ───────────────────────────────────────

let translationCache: TranslationCache = loadTranslations();

export function getCachedTranslation(text: string, targetLang: string): string | null {
  return translationCache[text]?.[targetLang] ?? null;
}

export async function translateText(text: string, targetLang = 'zh'): Promise<string> {
  // Check cache first
  const cached = getCachedTranslation(text, targetLang);
  if (cached) return cached;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const { promise } = gmRequest({ method: 'GET', url, timeout: 10000 });
  const resp = await promise;
  // Rate limiting (429) returns an HTML page — surface a real error, not a SyntaxError
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`Translation failed: HTTP ${resp.status}`);
  }
  const body = JSON.parse(resp.text);

  let result = '';
  if (Array.isArray(body[0])) {
    result = body[0].map((chunk: unknown[]) => chunk[0]).join('');
  }

  // Cache the result (with size limit to prevent localStorage overflow)
  if (result) {
    if (!translationCache[text]) translationCache[text] = {};
    translationCache[text][targetLang] = result;

    // Evict oldest entries if cache exceeds limit
    const keys = Object.keys(translationCache);
    const MAX_CACHE_ENTRIES = 5000;
    if (keys.length > MAX_CACHE_ENTRIES) {
      for (const key of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) {
        delete translationCache[key];
      }
    }

    saveTranslations(translationCache);
  }

  return result;
}

export async function batchTranslate(
  texts: string[],
  targetLang = 'zh',
): Promise<{ translations: string[]; failures: number }> {
  const results: string[] = [];
  let failures = 0;

  for (const text of texts) {
    try {
      const translated = await translateText(text, targetLang);
      results.push(translated || text);
    } catch {
      results.push(text);
      failures++;
    }
  }

  return { translations: results, failures };
}

/**
 * Get the translation for a tag fragment.
 * Tries dictionary first, then translation cache.
 */
export function getFragmentTranslation(fragment: string, targetLang = 'zh'): string | null {
  // Dictionary lookup
  const dictResult = lookupTagTranslation(fragment);
  if (dictResult) return dictResult;

  // Cache lookup
  const key = fragment.trim().toLowerCase();
  return getCachedTranslation(key, targetLang) ?? getCachedTranslation(fragment.trim(), targetLang);
}

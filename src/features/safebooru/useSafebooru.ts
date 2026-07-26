import { createSignal } from 'solid-js';
import { gmRequest } from '../../lib/gm';
import { addToast } from '../../stores/ui';
import { SAFEBOORU_RESULT_LIMIT } from '../../constants';
import { ensureTranslationDictionary, lookupTagTranslation } from '../../lib/translation';

export interface SafebooruEntry {
  name: string;
  value: string;
  categoryId: number;
  postCount: number;
  translation?: string;
}

const CATEGORY_MAP: Record<number, string> = {
  0: 'general',
  1: 'artist',
  3: 'copyright',
  4: 'character',
  5: 'meta',
};

const [term, setTerm] = createSignal('');
const [results, setResults] = createSignal<SafebooruEntry[]>([]);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal('');
const [hasSearched, setHasSearched] = createSignal(false);
// Target category for the per-chip save button; null falls back to the first category
const [saveCategoryId, setSaveCategoryId] = createSignal<string | null>(null);

let requestId = 0;

export { term, setTerm, results, loading, error, hasSearched, saveCategoryId, setSaveCategoryId };

export function getCategoryName(id: number): string {
  return CATEGORY_MAP[id] ?? 'other';
}

export async function searchSafebooru(query?: string) {
  const q = (query ?? term()).trim();
  if (!q) return;

  const thisRequest = ++requestId;
  setLoading(true);
  setError('');
  setHasSearched(true);

  try {
    const url = `https://safebooru.donmai.us/autocomplete.json?search[query]=${encodeURIComponent(q)}&search[type]=tag_query&limit=${SAFEBOORU_RESULT_LIMIT}`;
    const { promise } = gmRequest({ method: 'GET', url, timeout: 10000 });
    const resp = await promise;

    if (thisRequest !== requestId) return; // stale

    if (resp.status >= 400 || resp.status === 0) {
      throw new Error(`Safebooru API error: HTTP ${resp.status}`);
    }

    const raw = JSON.parse(resp.text || '[]') as Array<{
      label?: string;
      value?: string;
      category?: number;
      post_count?: number;
    }>;

    const seen = new Set<string>();
    const entries: SafebooruEntry[] = [];

    for (const item of raw) {
      const value = (item.value || item.label || '').trim();
      const lower = value.toLowerCase();
      if (!value || seen.has(lower)) continue;
      seen.add(lower);
      entries.push({
        name: item.label || value,
        value,
        categoryId: item.category ?? 0,
        postCount: item.post_count ?? 0,
      });
    }

    entries.sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));
    setResults(entries.slice(0, SAFEBOORU_RESULT_LIMIT));

    // Hydrate translations in background
    hydrateTranslations(thisRequest);
  } catch (err) {
    if (thisRequest !== requestId) return;
    setError(String(err));
  } finally {
    if (thisRequest === requestId) setLoading(false);
  }
}

async function hydrateTranslations(reqId: number) {
  await ensureTranslationDictionary();
  if (reqId !== requestId) return;

  setResults((prev) =>
    prev.map((entry) => ({
      ...entry,
      translation: lookupTagTranslation(entry.value) ?? entry.translation,
    })),
  );
}

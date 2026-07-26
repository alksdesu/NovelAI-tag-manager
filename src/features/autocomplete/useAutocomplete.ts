import { createSignal, createEffect, onCleanup } from 'solid-js';
import { data } from '../../stores/data';
import { gmRequest } from '../../lib/gm';
import { splitTagFragments } from '../../lib/escape';
import { lookupTagTranslation, getFragmentTranslation } from '../../lib/translation';
import { findPromptTextarea, clearPromptTextareaCache } from '../../lib/prompt-detect';
import {
  AUTOCOMPLETE_MAX_RESULTS,
  AUTOCOMPLETE_REMOTE_LIMIT,
  AUTOCOMPLETE_PREFIX_LENGTH,
  AUTOCOMPLETE_MIN_REMOTE_CHARS,
} from '../../constants';

// ─── Types ──────────────────────────────────────────────────────

export interface AutocompleteEntry {
  value: string;
  lower: string;
  src: 'local' | 'cloud' | 'danbooru';
  weight: number;
  translation?: string;
}

type AutocompleteContext = 'prompt' | 'fragment' | 'safebooru';

// ─── State ──────────────────────────────────────────────────────

const [suggestions, setSuggestions] = createSignal<AutocompleteEntry[]>([]);
const [highlighted, setHighlighted] = createSignal(-1);
const [visible, setVisible] = createSignal(false);
const [position, setPosition] = createSignal({ top: 0, left: 0, width: 0 });

export { suggestions, highlighted, setHighlighted, visible, position };

// ─── Internal state ─────────────────────────────────────────────

let inputRef: HTMLTextAreaElement | HTMLInputElement | null = null;
let context: AutocompleteContext = 'prompt';
let localEntries: AutocompleteEntry[] = [];
let prefixMap = new Map<string, Set<number>>();
let remoteHits: AutocompleteEntry[] = [];
let remoteQuery = '';
let fetchToken = 0;
let lastFragment = '';
let suppressNextInput = false;
let observer: MutationObserver | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let bindingRafPending = false;
let manuallyBound = false; // true when bound to an internal input (TagForm/Safebooru/Danbooru)

// ─── Local index ────────────────────────────────────────────────

function buildLocalIndex() {
  localEntries = [];
  prefixMap = new Map();

  for (const cat of data.categories) {
    for (const tag of cat.tags) {
      const fragments = splitTagFragments(tag.tag);
      for (const frag of fragments) {
        const lower = frag.toLowerCase().replace(/\s+/g, '_');
        localEntries.push({
          value: frag,
          lower,
          src: 'local',
          weight: 1000,
          translation: getFragmentTranslation(frag) ?? lookupTagTranslation(frag) ?? undefined,
        });
        // Build prefix index
        for (let len = 1; len <= Math.min(AUTOCOMPLETE_PREFIX_LENGTH, lower.length); len++) {
          const prefix = lower.slice(0, len);
          if (!prefixMap.has(prefix)) prefixMap.set(prefix, new Set());
          prefixMap.get(prefix)!.add(localEntries.length - 1);
        }
      }
    }
  }
}

// ─── Suggestion collection ──────────────────────────────────────

function collectCandidates(query: string): AutocompleteEntry[] {
  const q = query.toLowerCase().replace(/\s+/g, '_');
  if (!q) return [];

  const results: AutocompleteEntry[] = [];
  const seen = new Set<string>();

  // Prefix lookup
  const prefix = q.slice(0, AUTOCOMPLETE_PREFIX_LENGTH);
  const indices = prefixMap.get(prefix);
  if (indices) {
    for (const idx of indices) {
      const entry = localEntries[idx];
      if (entry.lower.includes(q) && !seen.has(entry.lower)) {
        seen.add(entry.lower);
        results.push(entry);
      }
    }
  }

  // Full scan only when prefix hits can't fill the dropdown: mid-string
  // matches are a fallback, not worth O(N) per keystroke on a full page
  if (results.length < AUTOCOMPLETE_MAX_RESULTS) {
    for (const entry of localEntries) {
      if (!seen.has(entry.lower) && entry.lower.includes(q)) {
        seen.add(entry.lower);
        results.push(entry);
        if (results.length >= AUTOCOMPLETE_MAX_RESULTS) break;
      }
    }
  }

  // Add remote hits
  for (const hit of remoteHits) {
    if (!seen.has(hit.lower) && hit.lower.includes(q)) {
      seen.add(hit.lower);
      results.push(hit);
    }
  }

  results.sort((a, b) => b.weight - a.weight);
  return results.slice(0, AUTOCOMPLETE_MAX_RESULTS);
}

// ─── Remote fetch ───────────────────────────────────────────────

let remoteBackoffUntil = 0;
const REMOTE_BACKOFF_MS = 10_000;

async function fetchRemote(query: string) {
  if (query.length < AUTOCOMPLETE_MIN_REMOTE_CHARS) return;
  if (query === remoteQuery) return;
  if (Date.now() < remoteBackoffUntil) return;

  const token = ++fetchToken;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const url = `https://safebooru.donmai.us/autocomplete.json?search[query]=${encodeURIComponent(query)}&search[type]=tag_query&limit=${AUTOCOMPLETE_REMOTE_LIMIT}`;
      const { promise } = gmRequest({ method: 'GET', url, timeout: 8000 });
      const resp = await promise;

      if (token !== fetchToken) return;

      if (resp.status < 200 || resp.status >= 300) {
        // Error pages are HTML — back off instead of re-firing on every keystroke
        remoteBackoffUntil = Date.now() + REMOTE_BACKOFF_MS;
        return;
      }

      const raw = JSON.parse(resp.text) as Array<{ label?: string; value?: string; post_count?: number }>;
      remoteBackoffUntil = 0;
      remoteQuery = query;
      remoteHits = raw
        .map((item) => {
          const val = (item.value || item.label || '').trim();
          return {
            value: val,
            lower: val.toLowerCase(),
            src: 'danbooru' as const,
            weight: 500 + (item.post_count || 0) / 50,
            translation: lookupTagTranslation(val) ?? undefined,
          };
        })
        .filter((e) => e.value)
        .slice(0, AUTOCOMPLETE_REMOTE_LIMIT);

      // Re-render suggestions with remote results
      if (lastFragment) {
        const candidates = collectCandidates(lastFragment);
        if (candidates.length > 0) {
          setSuggestions(candidates);
          setVisible(true);
        }
      }
    } catch {
      remoteBackoffUntil = Date.now() + REMOTE_BACKOFF_MS;
    }
  }, 180);
}

// ─── Fragment parsing ───────────────────────────────────────────

function getCurrentFragment(input: HTMLTextAreaElement | HTMLInputElement): string {
  const value = input.value;
  const cursor = input.selectionStart ?? value.length;

  if (context !== 'prompt') {
    return value.trim();
  }

  // Find the fragment at cursor position
  let start = value.lastIndexOf(',', cursor - 1);
  start = start < 0 ? 0 : start + 1;
  return value.slice(start, cursor).trim();
}

// ─── Completion application ─────────────────────────────────────

export function applyCompletion(text: string) {
  if (!inputRef) return;
  suppressNextInput = true;

  if (context !== 'prompt') {
    inputRef.value = text;
    inputRef.dispatchEvent(new Event('input', { bubbles: true }));
    hide();
    return;
  }

  const value = inputRef.value;
  const cursor = inputRef.selectionStart ?? value.length;

  // Find fragment boundaries: from previous comma to next comma
  let start = value.lastIndexOf(',', cursor - 1);
  start = start < 0 ? 0 : start + 1;
  // Preserve leading space after comma
  while (start < value.length && value[start] === ' ') start++;

  // End of fragment: next comma or end of string
  let end = value.indexOf(',', cursor);
  if (end < 0) end = value.length;

  const before = value.slice(0, start);
  const after = value.slice(end);
  // `after` is either empty or starts with a comma (end is indexOf(',') or length)
  const suffix = after.startsWith(',') ? '' : ', ';
  const newValue = `${before}${text}${suffix}${after}`;

  inputRef.value = newValue;
  const newCursor = before.length + text.length + suffix.length;
  inputRef.setSelectionRange(newCursor, newCursor);
  inputRef.dispatchEvent(new Event('input', { bubbles: true }));
  hide();
}

// ─── Event handlers ─────────────────────────────────────────────

function handleInput() {
  if (suppressNextInput) {
    suppressNextInput = false;
    return;
  }
  if (!inputRef) return;

  const fragment = getCurrentFragment(inputRef);
  lastFragment = fragment;

  if (fragment.length < 1) {
    hide();
    return;
  }

  const candidates = collectCandidates(fragment);
  if (candidates.length > 0) {
    setSuggestions(candidates);
    setHighlighted(-1);
    updatePosition();
    setVisible(true);
  } else {
    hide();
  }

  fetchRemote(fragment);
}

function handleKeyDown(evt: Event) {
  if (!(evt instanceof KeyboardEvent)) return;
  const e = evt;
  if (!visible()) return;

  const items = suggestions();
  if (items.length === 0) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setHighlighted((i) => (i + 1) % items.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlighted((i) => (i <= 0 ? items.length - 1 : i - 1));
      break;
    case 'Enter':
    case 'Tab':
      if (highlighted() >= 0) {
        e.preventDefault();
        applyCompletion(items[highlighted()].value);
      }
      break;
    case 'Escape':
      e.preventDefault();
      hide();
      break;
  }
}

function handleBlur() {
  // Delay to allow click on dropdown items
  setTimeout(() => hide(), 150);
}

// ─── Positioning ────────────────────────────────────────────────

function updatePosition() {
  if (!inputRef) return;
  const rect = inputRef.getBoundingClientRect();
  setPosition({
    top: rect.bottom + window.scrollY + 4,
    left: rect.left + window.scrollX,
    width: rect.width,
  });
}

// ─── Show / Hide ────────────────────────────────────────────────

function hide() {
  setVisible(false);
  setSuggestions([]);
  setHighlighted(-1);
}

// ─── Binding ────────────────────────────────────────────────────

function bindToInput(el: HTMLTextAreaElement | HTMLInputElement, ctx: AutocompleteContext) {
  if (inputRef === el) return;
  unbind();

  inputRef = el;
  context = ctx;

  el.addEventListener('input', handleInput);
  el.addEventListener('keydown', handleKeyDown);
  el.addEventListener('blur', handleBlur);
}

function unbind() {
  if (!inputRef) return;
  inputRef.removeEventListener('input', handleInput);
  inputRef.removeEventListener('keydown', handleKeyDown);
  inputRef.removeEventListener('blur', handleBlur);
  inputRef = null;
  hide();
}

function attemptBinding() {
  // Don't override a manual binding (internal input focus)
  if (manuallyBound) return;
  const prompt = findPromptTextarea();
  if (prompt) {
    bindToInput(prompt, 'prompt');
  }
}

// ─── Initialize ─────────────────────────────────────────────────

export function initAutocomplete() {
  // Build initial local index
  buildLocalIndex();

  // Watch for DOM changes to find NovelAI's prompt textarea (deduplicated rAF)
  observer = new MutationObserver(() => {
    if (bindingRafPending) return;
    bindingRafPending = true;
    requestAnimationFrame(() => {
      bindingRafPending = false;
      attemptBinding();
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Fallback polling
  pollTimer = setInterval(attemptBinding, 1200);

  // Initial attempt
  attemptBinding();
}

export function destroyAutocomplete() {
  observer?.disconnect();
  observer = null;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  bindingRafPending = false;
  unbind();
  clearPromptTextareaCache();
}

/**
 * Reactive effect to rebuild local index when categories change.
 * Must be called inside a SolidJS reactive context.
 */
export function useAutocompleteEffect() {
  // Rebuild index when categories or tag contents change
  createEffect(() => {
    // Track categories, tag count, AND tag content reactively
    const _cats = data.categories;
    for (const cat of _cats) {
      for (const tag of cat.tags) {
        // Reading .tag establishes SolidJS tracking on each tag's content
        void tag.tag;
      }
    }
    buildLocalIndex();
  });

  // Lifecycle
  createEffect(() => {
    initAutocomplete();
    onCleanup(destroyAutocomplete);
  });
}

/**
 * Bind autocomplete to a specific input (for fragment/safebooru contexts).
 */
export function bindAutocompleteToInput(
  el: HTMLTextAreaElement | HTMLInputElement,
  ctx: AutocompleteContext,
) {
  manuallyBound = true;
  bindToInput(el, ctx);
}

export function unbindAutocomplete() {
  manuallyBound = false;
  unbind();
  // Re-bind to external prompt if available
  attemptBinding();
}

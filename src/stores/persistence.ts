import { createEffect } from 'solid-js';
import type { AppData, PanelSize, DanbooruCredentials, TranslationCache } from '../types';
import {
  STORAGE_KEY,
  STORAGE_SAVE_DEBOUNCE_MS,
  TRANSLATION_CACHE_KEY,
  POSITION_KEY,
  PANEL_SIZE_KEY,
  TAG_FORM_SIZE_KEY,
  PANEL_MIN_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MARGIN_X,
  PANEL_MARGIN_Y,
  TAG_FORM_MIN_WIDTH,
  TAG_FORM_MAX_WIDTH,
  TAG_FORM_MIN_HEIGHT,
  TAG_FORM_MAX_HEIGHT,
  DANBOORU_CREDENTIAL_KEY,
  ASSISTANT_DEFAULT_OPENAI_BASE,
} from '../constants';
import { uid } from '../lib/uid';
import { normalizeAssistantData } from '../features/assistant/normalizers';

// ─── Default data factory ───────────────────────────────────────

function defaultAssistantData() {
  return {
    provider: 'openai' as const,
    openai: {
      baseUrl: ASSISTANT_DEFAULT_OPENAI_BASE,
      apiKey: '',
      model: '',
      models: [],
      modelsFetchedAt: 0,
    },
    google: {
      apiKey: '',
      model: '',
      models: [],
      modelsFetchedAt: 0,
    },
    conversations: [],
    activeConversationId: null,
  };
}

export function defaultData(): AppData {
  return {
    settings: {
      language: 'en',
      minimized: false,
      searchMode: 'label',
      lastActivePage: 'library',
    },
    assistant: defaultAssistantData(),
    categories: [
      {
        id: uid('cat'),
        accent: '#D4956B',
        name: { en: 'OC Tags', zh: '\u539F\u521B\u89D2\u8272\u6807\u7B7E' },
        tags: [
          {
            id: uid('tag'),
            tag: 'original character, creator-owned',
            label: { en: 'Signature OC', zh: '\u62DB\u724C\u539F\u521B\u89D2\u8272' },
            notes: 'Use for consistent character rendering.',
          },
          {
            id: uid('tag'),
            tag: 'distinctive features, personal symbol, lore friendly',
            label: { en: 'OC Flavor Pack', zh: '\u539F\u521B\u89D2\u8272\u98CE\u5473\u5305' },
            notes: 'Adds lore-friendly descriptors.',
          },
        ],
      },
      {
        id: uid('cat'),
        accent: '#86A87A',
        name: { en: 'Artist Strings', zh: '\u753B\u5E08\u4E32\u6807\u7B7E' },
        tags: [
          {
            id: uid('tag'),
            tag: 'by makoto shinkai, by greg rutkowski, trending on artstation',
            label: { en: 'Cinematic Blend', zh: '\u7535\u5F71\u7EA7\u753B\u98CE\u7EC4\u5408' },
            notes: 'Layered high-quality look.',
          },
          {
            id: uid('tag'),
            tag: 'by ross tran, by loish, digital painting, painterly',
            label: { en: 'Vibrant Painterly', zh: '\u9C9C\u8273\u624B\u7ED8\u98CE' },
            notes: 'Color rich painterly fusion.',
          },
        ],
      },
      {
        id: uid('cat'),
        accent: '#C27264',
        name: { en: 'Scene Tags', zh: '\u573A\u666F\u6807\u7B7E' },
        tags: [
          {
            id: uid('tag'),
            tag: 'golden hour lighting, dramatic clouds, sweeping vistas',
            label: { en: 'Epic Vista', zh: '\u53F2\u8BD7\u8FDC\u666F' },
            notes: 'Broad scenic compositions.',
          },
          {
            id: uid('tag'),
            tag: 'cyberpunk metropolis, neon rain, reflective surfaces',
            label: { en: 'Neon District', zh: '\u9713\u8679\u90FD\u5E02' },
            notes: 'Moody futuristic cityscapes.',
          },
        ],
      },
      {
        id: uid('cat'),
        accent: '#A8A29E',
        name: { en: 'Wardrobe Tags', zh: '\u670D\u88C5\u6807\u7B7E' },
        tags: [
          {
            id: uid('tag'),
            tag: 'ornate kimono, intricate embroidery, flowing sleeves',
            label: { en: 'Imperial Kimono', zh: '\u534E\u4E3D\u548C\u670D' },
            notes: 'Elegant traditional attire.',
          },
          {
            id: uid('tag'),
            tag: 'tactical bodysuit, high-tech armor plating, glowing accents',
            label: { en: 'Neo Tactical Suit', zh: '\u672A\u6765\u6218\u672F\u88C5' },
            notes: 'Sci-fi combat ready outfit.',
          },
        ],
      },
    ],
  };
}

// ─── Data integrity ─────────────────────────────────────────────

function ensureDataIntegrity(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as AppData).categories)) {
    return defaultData();
  }
  const d = raw as AppData;

  // Settings
  if (!d.settings || typeof d.settings !== 'object') {
    d.settings = defaultData().settings;
  }
  if (!['en', 'zh'].includes(d.settings.language)) d.settings.language = 'en';
  if (typeof d.settings.minimized !== 'boolean') d.settings.minimized = false;
  if (!['label', 'tag'].includes(d.settings.searchMode)) d.settings.searchMode = 'label';
  if (!['library', 'safebooru', 'danbooru', 'assistant'].includes(d.settings.lastActivePage)) {
    d.settings.lastActivePage = 'library';
  }

  // Assistant — full deep normalization via normalizers.ts
  d.assistant = normalizeAssistantData(d.assistant);

  // Categories normalization
  d.categories = d.categories.filter(
    (c) => c && typeof c === 'object' && typeof c.id === 'string',
  );
  for (const cat of d.categories) {
    if (!cat.name || typeof cat.name !== 'object') cat.name = { en: '', zh: '' };
    if (typeof cat.name.en !== 'string') cat.name.en = '';
    if (typeof cat.name.zh !== 'string') cat.name.zh = '';
    if (typeof cat.accent !== 'string') cat.accent = '#D4956B';
    if (!Array.isArray(cat.tags)) cat.tags = [];
    cat.tags = cat.tags.filter(
      (t) => t && typeof t === 'object' && typeof t.id === 'string',
    );
    for (const tag of cat.tags) {
      if (typeof tag.tag !== 'string') tag.tag = '';
      if (!tag.label || typeof tag.label !== 'object') tag.label = { en: '', zh: '' };
      if (typeof tag.label.en !== 'string') tag.label.en = '';
      if (typeof tag.label.zh !== 'string') tag.label.zh = '';
      if (typeof tag.notes !== 'string') tag.notes = '';
    }
  }

  return d;
}

// ─── Load / Save: main data ─────────────────────────────────────

export function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    return ensureDataIntegrity(parsed);
  } catch {
    return defaultData();
  }
}

let saveHandle: number | null = null;
let lastSavedSignature = '';
let pendingSerialized = '';

function flushSave(serialized: string) {
  if (serialized === lastSavedSignature) return;
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    lastSavedSignature = serialized;
  } catch {
    // localStorage full or unavailable
  }
}

function scheduleSave(serialized: string) {
  // Always keep the latest data, even if a save is already scheduled
  pendingSerialized = serialized;
  if (saveHandle !== null) return;
  const cb = () => {
    saveHandle = null;
    flushSave(pendingSerialized);
  };
  if (typeof requestIdleCallback === 'function') {
    saveHandle = requestIdleCallback(cb, { timeout: STORAGE_SAVE_DEBOUNCE_MS * 4 }) as unknown as number;
  } else {
    saveHandle = window.setTimeout(cb, STORAGE_SAVE_DEBOUNCE_MS);
  }
}

/**
 * Initialize the persistence effect.
 * Must be called inside a SolidJS reactive context (e.g., in App component).
 */
export function initPersistence(getData: () => AppData) {
  // Initialize signature
  try {
    lastSavedSignature = JSON.stringify(getData());
  } catch {
    lastSavedSignature = '';
  }

  // Auto-save effect: tracks all reactive properties in data
  createEffect(() => {
    const serialized = JSON.stringify(getData());
    scheduleSave(serialized);
  });

  // Flush on page unload
  const flush = () => {
    const serialized = JSON.stringify(getData());
    flushSave(serialized);
  };
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
  });
}

// ─── Load / Save: panel position ────────────────────────────────

export interface Position {
  left: number;
  top: number;
}

export function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

export function savePosition(pos: Position) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
  } catch { /* ignore */ }
}

// ─── Load / Save: panel size ────────────────────────────────────

function clampPanelWidth(w: number): number {
  return Math.max(PANEL_MIN_WIDTH, Math.min(w, window.innerWidth - PANEL_MARGIN_X * 2));
}

function clampPanelHeight(h: number): number {
  return Math.max(PANEL_MIN_HEIGHT, Math.min(h, window.innerHeight - PANEL_MARGIN_Y * 2));
}

export function loadPanelSize(): PanelSize {
  try {
    const raw = localStorage.getItem(PANEL_SIZE_KEY);
    if (!raw) return { width: null, height: null };
    const parsed = JSON.parse(raw);
    return {
      width: typeof parsed.width === 'number' ? clampPanelWidth(parsed.width) : null,
      height: typeof parsed.height === 'number' ? clampPanelHeight(parsed.height) : null,
    };
  } catch {
    return { width: null, height: null };
  }
}

export function savePanelSize(size: PanelSize) {
  try {
    localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(size));
  } catch { /* ignore */ }
}

// ─── Load / Save: tag form size ─────────────────────────────────

function clampTagFormWidth(w: number): number {
  return Math.max(TAG_FORM_MIN_WIDTH, Math.min(w, TAG_FORM_MAX_WIDTH));
}

function clampTagFormHeight(h: number): number {
  return Math.max(TAG_FORM_MIN_HEIGHT, Math.min(h, TAG_FORM_MAX_HEIGHT));
}

export function loadTagFormSize(): PanelSize {
  try {
    const raw = localStorage.getItem(TAG_FORM_SIZE_KEY);
    if (!raw) return { width: null, height: null };
    const parsed = JSON.parse(raw);
    return {
      width: typeof parsed.width === 'number' ? clampTagFormWidth(parsed.width) : null,
      height: typeof parsed.height === 'number' ? clampTagFormHeight(parsed.height) : null,
    };
  } catch {
    return { width: null, height: null };
  }
}

export function saveTagFormSize(size: PanelSize) {
  try {
    localStorage.setItem(TAG_FORM_SIZE_KEY, JSON.stringify(size));
  } catch { /* ignore */ }
}

// ─── Load / Save: Danbooru credentials ──────────────────────────

export function loadDanbooruCredentials(): DanbooruCredentials {
  try {
    // Try GM storage first
    if (typeof GM_getValue === 'function') {
      const gm = GM_getValue(DANBOORU_CREDENTIAL_KEY);
      if (gm && typeof gm === 'object') {
        const parsed = typeof gm === 'string' ? JSON.parse(gm) : gm;
        if (parsed.username || parsed.apiKey) {
          return {
            username: String(parsed.username || ''),
            apiKey: String(parsed.apiKey || ''),
          };
        }
      }
    }
  } catch { /* ignore */ }

  try {
    const raw = localStorage.getItem(DANBOORU_CREDENTIAL_KEY);
    if (!raw) return { username: '', apiKey: '' };
    const parsed = JSON.parse(raw);
    return {
      username: String(parsed.username || ''),
      apiKey: String(parsed.apiKey || ''),
    };
  } catch {
    return { username: '', apiKey: '' };
  }
}

export function saveDanbooruCredentials(creds: DanbooruCredentials) {
  try {
    const serialized = JSON.stringify(creds);
    localStorage.setItem(DANBOORU_CREDENTIAL_KEY, serialized);
    if (typeof GM_setValue === 'function') {
      GM_setValue(DANBOORU_CREDENTIAL_KEY, serialized);
    }
  } catch { /* ignore */ }
}

// ─── Load / Save: translations ──────────────────────────────────

export function loadTranslations(): TranslationCache {
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TranslationCache;
  } catch {
    return {};
  }
}

export function saveTranslations(cache: TranslationCache) {
  try {
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

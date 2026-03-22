import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import { LOCALE } from '../i18n/locale';
import type { Page, Toast, ContextMenuState, Language } from '../types';

// Active page
export const [activePage, setActivePage] = createSignal<Page>('library');

// Toast notifications
export const [toastQueue, setToastQueue] = createSignal<Toast[]>([]);

// Context menu
export const [contextMenu, setContextMenu] = createStore<ContextMenuState>({
  visible: false,
  x: 0,
  y: 0,
  items: [],
});

// Panel visibility
export const [isMinimized, setIsMinimized] = createSignal(false);
export const [isHidden, setIsHidden] = createSignal(false);

// Settings panel
export const [showSettings, setShowSettings] = createSignal(false);

/**
 * Add a toast notification.
 */
export function addToast(
  message: string,
  type: Toast['type'] = 'info',
  duration = 3000,
  action?: Toast['action'],
) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  setToastQueue((prev) => {
    const next = [...prev, { id, message, type, duration, action }];
    // Keep at most 5 visible toasts; discard oldest
    return next.length > 5 ? next.slice(next.length - 5) : next;
  });
  setTimeout(() => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  }, duration);
}

export function dismissToast(id: string) {
  setToastQueue((prev) => prev.filter((t) => t.id !== id));
}

/**
 * Get current locale strings for use in non-component code.
 * Reads the language from the data store reactively.
 */
let _langGetter: (() => Language) | null = null;

export function setLangGetter(getter: () => Language) {
  _langGetter = getter;
}

export function t() {
  const lang = _langGetter ? _langGetter() : 'en';
  return LOCALE[lang] || LOCALE.en;
}

/**
 * Close the context menu.
 */
export function closeContextMenu() {
  setContextMenu({ visible: false, x: 0, y: 0, items: [] });
}

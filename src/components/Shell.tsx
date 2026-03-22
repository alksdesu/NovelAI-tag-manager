import { createSignal, createEffect, onCleanup, Switch, Match, Show } from 'solid-js';
import { Header } from './Header';
import { Nav } from './Nav';
import { Toast } from './Toast';
import { LibraryPage } from '../features/library/LibraryPage';
import { SafebooruPage } from '../features/safebooru/SafebooruPage';
import { DanbooruPage } from '../features/danbooru/DanbooruPage';
import { AssistantPage } from '../features/assistant/AssistantPage';
import { activePage, isMinimized, setIsMinimized } from '../stores/ui';
import { data, setData } from '../stores/data';
import { loadPosition, savePosition, loadPanelSize, savePanelSize } from '../stores/persistence';
import { shouldReduceMotion } from '../lib/reduced-motion';
import {
  PANEL_MIN_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MARGIN_X,
  PANEL_MARGIN_Y,
  PANEL_RESPONSIVE_COMPACT,
  PANEL_RESPONSIVE_NARROW,
  PANEL_RESPONSIVE_TINY,
} from '../constants';
import { useLocale } from '../i18n/useLocale';

export function Shell() {
  const t = useLocale();

  // Get the root container (created in index.tsx)
  const rootEl = () => document.getElementById('nai-tag-maestro-root');

  // Responsive classes
  const [isCompact, setIsCompact] = createSignal(false);
  const [isNarrow, setIsNarrow] = createSignal(false);
  const [isTiny, setIsTiny] = createSignal(false);

  // Panel position
  const [pos, setPos] = createSignal(loadPosition() ?? { left: 0, top: 0 });
  const [positioned, setPositioned] = createSignal(!!loadPosition());

  // Panel size
  const [size, setSize] = createSignal(loadPanelSize());

  // Sync minimized from persisted settings once on mount
  createEffect(() => {
    setIsMinimized(data.settings.minimized);
  });

  // Sync minimize state back to persisted store
  createEffect(() => {
    setData('settings', 'minimized', isMinimized());
  });

  // Apply position and size to root element (must live on #nai-tag-maestro-root since it has position:fixed)
  createEffect(() => {
    const el = rootEl();
    if (!el) return;

    if (positioned()) {
      el.style.left = `${pos().left}px`;
      el.style.top = `${pos().top}px`;
      el.style.right = 'auto';
      el.style.bottom = 'auto';
    } else {
      el.style.left = '';
      el.style.top = '';
      el.style.right = '';
      el.style.bottom = '';
    }

    const s = size();
    if (s.width) {
      el.style.setProperty('--ntm-panel-width', `${s.width}px`);
    } else {
      el.style.removeProperty('--ntm-panel-width');
    }
    if (s.height) {
      el.style.setProperty('--ntm-panel-height', `${s.height}px`);
    } else {
      el.style.removeProperty('--ntm-panel-height');
    }
  });

  // Apply responsive classes to root element
  createEffect(() => {
    const el = rootEl();
    if (!el) return;
    el.classList.toggle('ntm-shell--compact', isCompact());
    el.classList.toggle('ntm-shell--narrow', isNarrow());
    el.classList.toggle('ntm-shell--tiny', isTiny());
    el.classList.toggle('ntm-shell--reduced-motion', shouldReduceMotion());
  });

  // ResizeObserver for responsive classes
  createEffect(() => {
    const el = rootEl();
    const visible = !isMinimized();
    if (!visible || !el) return;

    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setIsCompact(w <= PANEL_RESPONSIVE_COMPACT);
      setIsNarrow(w <= PANEL_RESPONSIVE_NARROW);
      setIsTiny(w <= PANEL_RESPONSIVE_TINY);
    });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  // ─── Dragging ───
  const [dragging, setDragging] = createSignal(false);
  let dragOffset = { x: 0, y: 0 };

  function handleDragStart(e: PointerEvent) {
    // Don't drag from action buttons
    const target = e.target as HTMLElement;
    if (target.closest('.ntm-header-actions')) return;

    const el = rootEl();
    if (!el) return;

    setDragging(true);
    const rect = el.getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleDragMove(e: PointerEvent) {
    if (!dragging()) return;
    const el = rootEl();
    const panelW = el?.offsetWidth ?? PANEL_MIN_WIDTH;
    const panelH = el?.offsetHeight ?? PANEL_MIN_HEIGHT;
    const newLeft = Math.max(16, Math.min(e.clientX - dragOffset.x, window.innerWidth - panelW - 16));
    const newTop = Math.max(16, Math.min(e.clientY - dragOffset.y, window.innerHeight - panelH - 16));
    setPos({ left: newLeft, top: newTop });
    setPositioned(true);
  }

  function handleDragEnd() {
    if (!dragging()) return;
    setDragging(false);
    savePosition(pos());
  }

  // ─── Resizing ───
  const [resizing, setResizing] = createSignal(false);
  let resizeStart = { x: 0, y: 0, w: 0, h: 0 };

  function handleResizeStart(e: PointerEvent) {
    const el = rootEl();
    if (!el) return;

    setResizing(true);
    const rect = el.getBoundingClientRect();
    resizeStart = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleResizeMove(e: PointerEvent) {
    if (!resizing()) return;
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    const newW = Math.max(PANEL_MIN_WIDTH, Math.min(resizeStart.w + dx, window.innerWidth - PANEL_MARGIN_X * 2));
    const newH = Math.max(PANEL_MIN_HEIGHT, Math.min(resizeStart.h + dy, window.innerHeight - PANEL_MARGIN_Y * 2));
    setSize({ width: newW, height: newH });
  }

  function handleResizeEnd() {
    if (!resizing()) return;
    setResizing(false);
    savePanelSize(size());
  }

  // ─── Minimized toggle drag ───
  const [miniDragging, setMiniDragging] = createSignal(false);
  let miniDragOffset = { x: 0, y: 0 };
  let miniStartPos = { x: 0, y: 0 };
  let miniMoved = false;
  const DRAG_THRESHOLD = 5; // px — ignore movement below this

  function handleMiniDragStart(e: PointerEvent) {
    setMiniDragging(true);
    miniMoved = false;
    miniStartPos = { x: e.clientX, y: e.clientY };
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    miniDragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function handleMiniDragMove(e: PointerEvent) {
    if (!miniDragging()) return;
    const dx = e.clientX - miniStartPos.x;
    const dy = e.clientY - miniStartPos.y;
    if (!miniMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    miniMoved = true;
    const newLeft = Math.max(8, Math.min(e.clientX - miniDragOffset.x, window.innerWidth - 160));
    const newTop = Math.max(8, Math.min(e.clientY - miniDragOffset.y, window.innerHeight - 40));
    setPos({ left: newLeft, top: newTop });
    setPositioned(true);
  }

  function handleMiniDragEnd() {
    if (!miniDragging()) return;
    setMiniDragging(false);
    if (miniMoved) {
      savePosition(pos());
    } else {
      setIsMinimized(false);
    }
  }

  return (
    <>
      {/* Minimized toggle — draggable */}
      <Show when={isMinimized()}>
        <button
          class="ntm-minimized-toggle"
          style={positioned() ? { left: `${pos().left}px`, top: `${pos().top}px`, right: 'auto' } : { top: '24px', right: '24px' }}
          onPointerDown={handleMiniDragStart}
          onPointerMove={handleMiniDragMove}
          onPointerUp={handleMiniDragEnd}
        >
          {t().minimizedToggle}
        </button>
      </Show>

      {/* Main panel */}
      <Show when={!isMinimized()}>
        <div class="ntm-panel">
          <div class="ntm-glow" />
          <Header
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          />
          <Nav />
          <div class="ntm-page-container">
            <Switch fallback={<PlaceholderPage name={activePage()} />}>
              <Match when={activePage() === 'library'}>
                <LibraryPage />
              </Match>
              <Match when={activePage() === 'safebooru'}>
                <SafebooruPage />
              </Match>
              <Match when={activePage() === 'danbooru'}>
                <DanbooruPage />
              </Match>
              <Match when={activePage() === 'assistant'}>
                <AssistantPage />
              </Match>
            </Switch>
          </div>
          <div
            class="ntm-resize-handle"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
          />
        </div>
      </Show>

      <Toast />
    </>
  );
}

/**
 * Temporary placeholder for pages not yet implemented.
 */
function PlaceholderPage(props: { name: string }) {
  return (
    <div style={{
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'center',
      'justify-content': 'center',
      height: '100%',
      gap: '8px',
      color: 'var(--ntm-text-muted)',
    }}>
      <span style={{ 'font-size': '24px', opacity: '0.4' }}>
        {props.name === 'library' ? '\u{1F3F7}' : props.name === 'safebooru' ? '\u{1F50D}' : props.name === 'danbooru' ? '\u{1F5BC}' : '\u{1F916}'}
      </span>
      <span style={{ 'font-size': '12px' }}>
        {props.name} — coming in next phase
      </span>
    </div>
  );
}

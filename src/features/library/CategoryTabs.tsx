import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { data } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import { activeCategory, switchCategory, openCategoryForm, deleteCategory, copyCategory, moveCategory } from './useLibrary';

export function CategoryTabs() {
  const t = useLocale();
  const lang = () => data.settings.language;
  const [ctxMenu, setCtxMenu] = createSignal<{ x: number; y: number; catId: string } | null>(null);
  const [dragIdx, setDragIdx] = createSignal<number | null>(null);

  function handleContextMenu(e: MouseEvent, catId: string) {
    e.preventDefault();
    const menuW = 160, menuH = 120;
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8);
    setCtxMenu({ x, y, catId });
  }

  function closeMenu() {
    setCtxMenu(null);
  }

  function handleDragStart(e: DragEvent, index: number) {
    if (!e.dataTransfer) return;
    setDragIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: DragEvent, toIndex: number) {
    e.preventDefault();
    const from = dragIdx();
    if (from !== null && from !== toIndex) {
      moveCategory(from, toIndex);
    }
    setDragIdx(null);
  }

  return (
    <div class="ntm-tabs">
      <For each={data.categories}>
        {(cat, index) => {
          const isActive = () => activeCategory()?.id === cat.id;
          const label = () => (lang() === 'zh' && cat.name.zh ? cat.name.zh : cat.name.en) || 'Untitled';
          return (
            <button
              class={`ntm-tab ${isActive() ? 'active' : ''}`}
              style={{ '--accent': cat.accent }}
              onClick={() => switchCategory(cat.id)}
              onContextMenu={(e) => handleContextMenu(e, cat.id)}
              title={label()}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index())}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index())}
            >
              <span class="ntm-tab-label">{label()}</span>
              <span class="ntm-tab-count">{cat.tags.length}</span>
            </button>
          );
        }}
      </For>

      {/* Context menu */}
      <Show when={ctxMenu()}>
        {(menu) => (
          <Portal>
            <div style={{ position: 'fixed', inset: '0', 'z-index': 'var(--ntm-z-context)' }} onClick={closeMenu} />
            <div
              id="ntm-context-menu"
              class="visible"
              style={{ top: `${menu().y}px`, left: `${menu().x}px`, 'font-family': 'var(--ntm-font-body)', 'font-size': '14px', color: 'var(--ntm-text)' }}
            >
              <button class="ntm-context-menu__item" onClick={() => { switchCategory(menu().catId); openCategoryForm(menu().catId); closeMenu(); }}>
                {t().library.editCategory}
              </button>
              <button class="ntm-context-menu__item" onClick={() => { switchCategory(menu().catId); copyCategory(); closeMenu(); }}>
                {t().library.copyCategory}
              </button>
              <button class="ntm-context-menu__item is-danger" onClick={() => { switchCategory(menu().catId); deleteCategory(); closeMenu(); }}>
                {t().categoryForm.delete}
              </button>
            </div>
          </Portal>
        )}
      </Show>
    </div>
  );
}

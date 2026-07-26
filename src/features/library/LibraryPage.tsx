import { Show } from 'solid-js';
import { data } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import { CategoryTabs } from './CategoryTabs';
import { SearchBar } from './SearchBar';
import { TagCard } from './TagCard';
import { Pagination } from './Pagination';
import { CategoryForm } from './CategoryForm';
import { TagForm } from './TagForm';
import {
  activeCategory,
  paginatedTags,
  filteredTags,
  showCategoryForm,
  showTagForm,
  openCategoryForm,
  openTagForm,
  copyCategory,
  deleteCategory,
  moveTagById,
  exportLibrary,
  importLibrary,
  batchMode,
  toggleBatchMode,
  toggleTagSelection,
  isTagSelected,
  selectedTagIds,
  batchCopy,
  batchDelete,
  batchMoveToCategory,
  selectAllTags,
} from './useLibrary';
import { For, createSignal } from 'solid-js';
import { IconCheck } from '../../components/Icons';

export function LibraryPage() {
  const t = useLocale();
  const [dragTagId, setDragTagId] = createSignal<string | null>(null);

  function handleDragStart(e: DragEvent, tagId: string) {
    if (!e.dataTransfer) return;
    setDragTagId(tagId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tagId);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: DragEvent, targetTagId: string) {
    e.preventDefault();
    const sourceTagId = dragTagId();
    if (!sourceTagId) return;
    moveTagById(sourceTagId, targetTagId);
    setDragTagId(null);
  }

  function handleDragEnd() {
    setDragTagId(null);
  }

  return (
    <section class="ntm-library">
      <CategoryTabs />

      <div class="ntm-controls">
        <SearchBar />
        <div class="ntm-quick-actions">
          <button class="ntm-btn" onClick={() => openTagForm()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span class="ntm-btn__label">{t().library.addTag}</span>
          </button>
          <button class="ntm-btn ntm-btn--ghost" onClick={() => openCategoryForm()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
            <span class="ntm-btn__label">{t().library.addCategory}</span>
          </button>
          <button
            class={`ntm-btn ${batchMode() ? '' : 'ntm-btn--ghost'}`}
            onClick={toggleBatchMode}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            <span class="ntm-btn__label">{batchMode() ? t().library.batchCancel : t().library.batchMode}</span>
          </button>
          <div class="ntm-quick-actions--secondary">
            <Show when={activeCategory()}>
              <button class="ntm-btn ntm-btn--ghost" title={t().library.editCategory} onClick={() => openCategoryForm(activeCategory()!.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span class="ntm-btn__label">{t().library.editCategory}</span>
              </button>
              <button class="ntm-btn ntm-btn--danger" title={t().library.deleteCurrentCategory} onClick={deleteCategory}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span class="ntm-btn__label">{t().library.deleteCurrentCategory}</span>
              </button>
              <button class="ntm-btn ntm-btn--ghost" title={t().library.copyCategory} onClick={copyCategory}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span class="ntm-btn__label">{t().library.copyCategory}</span>
              </button>
            </Show>
            <button class="ntm-btn ntm-btn--ghost" title={t().library.exportData} onClick={exportLibrary}>
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span class="ntm-btn__label">{t().library.exportData}</span>
            </button>
            <button class="ntm-btn ntm-btn--ghost" title={t().library.importData} onClick={importLibrary}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span class="ntm-btn__label">{t().library.importData}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="ntm-tag-list">
        <Show
          when={paginatedTags().length > 0}
          fallback={
            <div class="ntm-empty">
              <Show
                when={data.categories.length > 0}
                fallback={
                  <>
                    <p>{t().library.emptyNoCategory}</p>
                    <button class="ntm-btn" onClick={() => openCategoryForm()}>
                      {t().library.emptyNoCategoryAction}
                    </button>
                  </>
                }
              >
                {t().library.empty}
              </Show>
            </div>
          }
        >
          <For each={paginatedTags()}>
            {(tag) => (
              <div
                draggable={!batchMode()}
                onDragStart={(e) => !batchMode() && handleDragStart(e, tag.id)}
                onDragOver={!batchMode() ? handleDragOver : undefined}
                onDrop={(e) => !batchMode() && handleDrop(e, tag.id)}
                onDragEnd={handleDragEnd}
                class={`ntm-tag-card-drag-wrap ${dragTagId() === tag.id ? 'ntm-tag-card-drag-wrap--dragging' : ''} ${batchMode() && isTagSelected(tag.id) ? 'ntm-tag-card-drag-wrap--selected' : ''}`}
                onClick={() => batchMode() && toggleTagSelection(tag.id)}
              >
                <Show when={batchMode()}>
                  <button
                    class={`ntm-tag-card__checkbox ${isTagSelected(tag.id) ? 'ntm-tag-card__checkbox--checked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleTagSelection(tag.id); }}
                    aria-checked={isTagSelected(tag.id)}
                    role="checkbox"
                  >
                    <Show when={isTagSelected(tag.id)}>
                      <IconCheck />
                    </Show>
                  </button>
                </Show>
                <TagCard tag={tag} category={activeCategory()!} />
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Batch toolbar */}
      <Show when={batchMode()}>
        <div class="ntm-library__batch-bar">
          <button class="ntm-pill" onClick={selectAllTags}>
            {t().library.batchSelectAll}
          </button>
          <span class="ntm-library__batch-count">{t().library.batchSelected(selectedTagIds().size)}</span>
          <button class="ntm-btn ntm-btn--ghost" onClick={batchCopy} disabled={selectedTagIds().size === 0}>
            {t().library.batchCopy}
          </button>
          <button class="ntm-btn ntm-btn--danger" onClick={batchDelete} disabled={selectedTagIds().size === 0}>
            {t().library.batchDelete}
          </button>
          <Show when={data.categories.length > 1}>
            <select
              class="ntm-input ntm-input--select"
              onChange={(e) => {
                const val = e.currentTarget.value;
                if (val) batchMoveToCategory(val);
                e.currentTarget.value = '';
              }}
            >
              <option value="">{t().library.batchMove}</option>
              <For each={data.categories.filter((c) => c.id !== activeCategory()?.id)}>
                {(cat) => (
                  <option value={cat.id}>
                    {data.settings.language === 'zh' && cat.name.zh ? cat.name.zh : cat.name.en}
                  </option>
                )}
              </For>
            </select>
          </Show>
        </div>
      </Show>

      <Show when={filteredTags().length > 0}>
        <Pagination />
      </Show>

      <Show when={showCategoryForm()}>
        <CategoryForm />
      </Show>

      <Show when={showTagForm()}>
        <TagForm />
      </Show>
    </section>
  );
}

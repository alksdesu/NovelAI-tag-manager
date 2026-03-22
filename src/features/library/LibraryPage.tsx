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
  moveTag,
  clampedPage,
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
import { TAGS_PER_PAGE } from '../../constants';
import { For, createSignal } from 'solid-js';
import { IconCheck } from '../../components/Icons';

export function LibraryPage() {
  const t = useLocale();
  const [dragIdx, setDragIdx] = createSignal<number | null>(null);

  function handleDragStart(e: DragEvent, pageIndex: number) {
    if (!e.dataTransfer) return;
    setDragIdx(pageIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(pageIndex));
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: DragEvent, targetPageIndex: number) {
    e.preventDefault();
    const fromPageIdx = dragIdx();
    if (fromPageIdx === null || fromPageIdx === targetPageIndex) return;
    const offset = (clampedPage() - 1) * TAGS_PER_PAGE;
    moveTag(offset + fromPageIdx, offset + targetPageIndex);
    setDragIdx(null);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  return (
    <section class="ntm-library">
      <CategoryTabs />

      <div class="ntm-controls">
        <SearchBar />
        <div class="ntm-quick-actions">
          <button class="ntm-btn" onClick={() => openTagForm()}>
            {t().library.addTag}
          </button>
          <button class="ntm-btn ntm-btn--ghost" onClick={() => openCategoryForm()}>
            {t().library.addCategory}
          </button>
          <Show when={activeCategory()}>
            <button class="ntm-btn ntm-btn--ghost" onClick={() => openCategoryForm(activeCategory()!.id)}>
              {t().library.editCategory}
            </button>
            <button class="ntm-btn ntm-btn--danger" onClick={deleteCategory}>
              {t().library.deleteCurrentCategory}
            </button>
            <button class="ntm-btn ntm-btn--ghost" onClick={copyCategory}>
              {t().library.copyCategory}
            </button>
            <button class="ntm-btn ntm-btn--ghost" onClick={exportLibrary}>
              {t().library.exportData}
            </button>
            <button class="ntm-btn ntm-btn--ghost" onClick={importLibrary}>
              {t().library.importData}
            </button>
          </Show>
          <button
            class={`ntm-btn ${batchMode() ? '' : 'ntm-btn--ghost'}`}
            onClick={toggleBatchMode}
          >
            {batchMode() ? t().library.batchCancel : t().library.batchMode}
          </button>
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
            {(tag, idx) => (
              <div
                draggable={!batchMode()}
                onDragStart={(e) => !batchMode() && handleDragStart(e, idx())}
                onDragOver={!batchMode() ? handleDragOver : undefined}
                onDrop={(e) => !batchMode() && handleDrop(e, idx())}
                onDragEnd={handleDragEnd}
                class={`ntm-tag-card-drag-wrap ${dragIdx() === idx() ? 'ntm-tag-card-drag-wrap--dragging' : ''} ${batchMode() && isTagSelected(tag.id) ? 'ntm-tag-card-drag-wrap--selected' : ''}`}
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

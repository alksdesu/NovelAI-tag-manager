import { createMemo, createSignal, Show, For, onCleanup } from 'solid-js';
import { data } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import { openTagForm, deleteTag, copyTag, isTagTranslated, toggleTagTranslation, moveTagToCategory, activeCategory, togglePinTag } from './useLibrary';
import { TagFragments } from './TagFragments';
import { IconPin, IconCopy, IconEdit, IconMore, IconTranslate, IconMove, IconTrash } from '../../components/Icons';
import type { Tag, Category } from '../../types';

interface TagCardProps {
  tag: Tag;
  category: Category;
}

export function TagCard(props: TagCardProps) {
  const t = useLocale();
  const lang = () => data.settings.language;
  const [confirmDelete, setConfirmDelete] = createSignal(false);
  const [showMore, setShowMore] = createSignal(false);
  const [showMove, setShowMove] = createSignal(false);
  let deleteTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => { if (deleteTimer) clearTimeout(deleteTimer); });

  const displayLabel = createMemo(() => {
    const tag = props.tag;
    const translated = isTagTranslated(tag.id);
    if (translated && tag.label.zh) return tag.label.zh;
    if (lang() === 'zh' && tag.label.zh) return tag.label.zh;
    return tag.label.en || tag.tag.slice(0, 30);
  });

  const otherCategories = createMemo(() =>
    data.categories.filter((c) => c.id !== activeCategory()?.id),
  );

  function handleDelete(e: MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete()) {
      setConfirmDelete(true);
      deleteTimer = setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteTag(props.tag.id);
    setConfirmDelete(false);
  }

  function handleMove(e: Event) {
    const catId = (e.target as HTMLSelectElement).value;
    if (catId) {
      moveTagToCategory(props.tag.id, catId);
      setShowMove(false);
      setShowMore(false);
    }
  }

  return (
    <article class="ntm-tag-card" data-tag-id={props.tag.id} data-category-id={props.category.id}>
      <header class="ntm-tag-card__header">
        <h3 class="ntm-tag-card__title">{displayLabel()}</h3>
        <div class="ntm-tag-card__actions">
          {/* Pin */}
          <button
            class={`ntm-icon-btn ${props.tag.pinned ? 'is-active' : ''}`}
            title={props.tag.pinned ? t().library.unpinTag : t().library.pinTag}
            aria-label={props.tag.pinned ? t().library.unpinTag : t().library.pinTag}
            onClick={(e) => { e.stopPropagation(); togglePinTag(props.tag.id); }}
          >
            <IconPin />
          </button>
          {/* Copy */}
          <button
            class="ntm-icon-btn"
            title={t().assistant.messageActions.copy}
            aria-label={t().assistant.messageActions.copy}
            onClick={(e) => { e.stopPropagation(); copyTag(props.tag.id); }}
          >
            <IconCopy />
          </button>
          {/* Edit */}
          <button
            class="ntm-icon-btn"
            title={t().library.edit}
            aria-label={t().library.edit}
            onClick={(e) => { e.stopPropagation(); openTagForm(props.tag.id); }}
          >
            <IconEdit />
          </button>
          {/* More menu toggle */}
          <button
            class={`ntm-icon-btn ${showMore() ? 'is-active' : ''}`}
            aria-label="More actions"
            onClick={(e) => { e.stopPropagation(); setShowMore(!showMore()); }}
          >
            <IconMore />
          </button>
        </div>
      </header>

      {/* More actions dropdown */}
      <Show when={showMore()}>
        <div class="ntm-tag-card__more" onClick={(e) => e.stopPropagation()}>
          <button class="ntm-tag-card__more-item" onClick={() => { toggleTagTranslation(props.tag.id); setShowMore(false); }}>
            <IconTranslate /> {t().library.translate}
          </button>
          <Show when={otherCategories().length > 0}>
            <button class="ntm-tag-card__more-item" onClick={() => { setShowMove(!showMove()); }}>
              <IconMove /> {t().library.moveTagTo}
            </button>
          </Show>
          {/* Delete with confirmation */}
          <button
            class={`ntm-tag-card__more-item ${confirmDelete() ? 'ntm-tag-card__more-item--danger' : ''}`}
            onClick={handleDelete}
          >
            <IconTrash /> {confirmDelete() ? t().library.deleteTagConfirm : t().library.delete}
          </button>
        </div>
      </Show>

      {/* Move dropdown */}
      <Show when={showMove()}>
        <div onClick={(e) => e.stopPropagation()}>
          <select class="ntm-input ntm-input--select" onChange={handleMove}>
            <option value="">{t().library.moveTagTo}</option>
            <For each={otherCategories()}>
              {(cat) => (
                <option value={cat.id}>
                  {lang() === 'zh' && cat.name.zh ? cat.name.zh : cat.name.en}
                </option>
              )}
            </For>
          </select>
        </div>
      </Show>

      <div>
        <Show when={props.tag.tag} fallback={<p class="ntm-tag-card__tagline">{t().tagForm.fragmentsEmpty}</p>}>
          <TagFragments tag={props.tag} />
        </Show>
        <Show when={props.tag.notes}>
          <p class="ntm-tag-card__notes">{props.tag.notes}</p>
        </Show>
      </div>
    </article>
  );
}

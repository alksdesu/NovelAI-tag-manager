import { createSignal, createEffect, createMemo, onMount, onCleanup, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { data } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import { splitTagFragments } from '../../lib/escape';
import { bindAutocompleteToInput, unbindAutocomplete } from '../autocomplete/useAutocomplete';
import { lookupTagTranslation } from '../../lib/translation';
import { IconEdit, IconTrash } from '../../components/Icons';
import {
  editingTagId,
  activeCategory,
  closeTagForm,
  submitTag,
} from './useLibrary';

export function TagForm() {
  const t = useLocale();
  const isEditing = () => !!editingTagId();

  // Escape to close
  const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTagForm(); };
  onMount(() => document.addEventListener('keydown', handleEsc));
  onCleanup(() => document.removeEventListener('keydown', handleEsc));

  const [labelEn, setLabelEn] = createSignal('');
  const [labelZh, setLabelZh] = createSignal('');
  const [tagString, setTagString] = createSignal('');
  const [notes, setNotes] = createSignal('');

  // Populate form when editing
  createEffect(() => {
    const id = editingTagId();
    if (id) {
      const cat = activeCategory();
      const tag = cat?.tags.find((t) => t.id === id);
      if (tag) {
        setLabelEn(tag.label.en);
        setLabelZh(tag.label.zh);
        setTagString(tag.tag);
        setNotes(tag.notes);
      }
    } else {
      setLabelEn('');
      setLabelZh('');
      setTagString('');
      setNotes('');
    }
  });

  const fragments = createMemo(() => splitTagFragments(tagString()));

  const isDuplicate = createMemo(() => {
    const cat = activeCategory();
    if (!cat) return false;
    const trimmed = tagString().trim().toLowerCase();
    if (!trimmed) return false;
    return cat.tags.some((tag) =>
      tag.id !== editingTagId() && tag.tag.trim().toLowerCase() === trimmed,
    );
  });

  // ─── Fragment editing ───
  const [editingIdx, setEditingIdx] = createSignal<number | null>(null);
  const [editValue, setEditValue] = createSignal('');

  function rebuildTagString(frags: string[]) {
    setTagString(frags.filter(Boolean).join(', '));
  }

  function startEditFragment(idx: number) {
    setEditingIdx(idx);
    setEditValue(fragments()[idx] || '');
  }

  function commitEditFragment() {
    const idx = editingIdx();
    if (idx === null) return;
    const frags = [...fragments()];
    const val = editValue().trim();
    if (val) {
      frags[idx] = val;
    } else {
      frags.splice(idx, 1);
    }
    rebuildTagString(frags);
    setEditingIdx(null);
  }

  function deleteFragment(idx: number) {
    const frags = [...fragments()];
    frags.splice(idx, 1);
    rebuildTagString(frags);
  }

  function handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); commitEditFragment(); }
    if (e.key === 'Escape') { e.preventDefault(); setEditingIdx(null); }
  }

  // ─── Fragment drag reorder ───
  const [dragFragIdx, setDragFragIdx] = createSignal<number | null>(null);

  function handleFragDragStart(e: DragEvent, idx: number) {
    if (!e.dataTransfer) return;
    setDragFragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleFragDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function handleFragDrop(e: DragEvent, toIdx: number) {
    e.preventDefault();
    const fromIdx = dragFragIdx();
    if (fromIdx === null || fromIdx === toIdx) { setDragFragIdx(null); return; }
    const frags = [...fragments()];
    const [moved] = frags.splice(fromIdx, 1);
    frags.splice(toIdx, 0, moved);
    rebuildTagString(frags);
    setDragFragIdx(null);
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!labelEn().trim() || !tagString().trim()) return;
    submitTag({
      labelEn: labelEn().trim(),
      labelZh: labelZh().trim(),
      tag: tagString().trim(),
      notes: notes().trim(),
    });
  }

  return (
    <Portal>
    <div class="ntm-modal">
      <div class="ntm-modal__backdrop" onClick={closeTagForm} />
      <form class="ntm-modal__panel ntm-modal__panel--tag" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <h2>{isEditing() ? t().tagForm.editTitle : t().tagForm.createTitle}</h2>
        </header>

        <div class="ntm-modal__body">
          <label>
            <span>{t().tagForm.displayEn}</span>
            <input
              class="ntm-input"
              type="text"
              value={labelEn()}
              onInput={(e) => setLabelEn(e.currentTarget.value)}
              required
              autofocus
            />
          </label>

          <label>
            <span>{t().tagForm.displayZh}</span>
            <input
              class="ntm-input"
              type="text"
              value={labelZh()}
              onInput={(e) => setLabelZh(e.currentTarget.value)}
            />
          </label>

          <label>
            <span>{t().tagForm.tagString}</span>
            <textarea
              class="ntm-input ntm-input--textarea"
              rows={3}
              value={tagString()}
              onInput={(e) => setTagString(e.currentTarget.value)}
              onFocus={(e) => bindAutocompleteToInput(e.currentTarget, 'prompt')}
              onBlur={() => { setTimeout(() => unbindAutocomplete(), 200); }}
              required
              placeholder="1girl, blue_eyes, white_hair, ..."
            />
          </label>

          <Show when={isDuplicate()}>
            <p class="ntm-error">{t().tagForm.duplicateWarning}</p>
          </Show>

          {/* Interactive fragments */}
          <div class="ntm-tag-fragments">
            <div class="ntm-tag-fragments__header">
              <span>{t().tagForm.fragmentsTitle}</span>
              <p class="ntm-tag-fragments__subtitle">{t().tagForm.fragmentCount(fragments().length)}</p>
            </div>
            <div class="ntm-tag-fragments__content">
              <Show
                when={fragments().length > 0}
                fallback={<span class="ntm-tag-fragments__empty">{t().tagForm.fragmentsEmpty}</span>}
              >
                <div class="ntm-tag-chip-list">
                  <For each={fragments()}>
                    {(frag, idx) => {
                      const zh = () => lookupTagTranslation(frag);
                      const isEditingThis = () => editingIdx() === idx();
                      return (
                        <div
                          class={`ntm-tag-chip ntm-tag-chip--editable ${dragFragIdx() === idx() ? 'ntm-tag-chip--dragging' : ''}`}
                          draggable={!isEditingThis()}
                          onDragStart={(e) => handleFragDragStart(e, idx())}
                          onDragOver={handleFragDragOver}
                          onDrop={(e) => handleFragDrop(e, idx())}
                        >
                          <Show
                            when={!isEditingThis()}
                            fallback={
                              <input
                                class="ntm-tag-chip__edit-input"
                                type="text"
                                value={editValue()}
                                onInput={(e) => setEditValue(e.currentTarget.value)}
                                onBlur={commitEditFragment}
                                onKeyDown={handleEditKeyDown}
                                ref={(el) => setTimeout(() => el.focus(), 0)}
                              />
                            }
                          >
                            <div class="ntm-tag-chip__text" onClick={() => startEditFragment(idx())}>
                              <span class="ntm-tag-chip__english">{frag}</span>
                              <Show when={zh()}>
                                <span class="ntm-tag-chip__translation">{zh()}</span>
                              </Show>
                            </div>
                            <button
                              type="button"
                              class="ntm-tag-chip__delete"
                              onClick={(e) => { e.stopPropagation(); deleteFragment(idx()); }}
                            >
                              <IconTrash />
                            </button>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </div>

          <label>
            <span>{t().tagForm.notes}</span>
            <textarea
              class="ntm-input ntm-input--textarea"
              rows={2}
              value={notes()}
              onInput={(e) => setNotes(e.currentTarget.value)}
              placeholder="Optional notes..."
            />
          </label>
        </div>

        <footer>
          <button type="button" class="ntm-btn ntm-btn--ghost" onClick={closeTagForm}>
            {t().tagForm.cancel}
          </button>
          <button type="submit" class="ntm-btn">
            {isEditing() ? t().tagForm.saveEdit : t().tagForm.saveCreate}
          </button>
        </footer>

      </form>
    </div>
    </Portal>
  );
}

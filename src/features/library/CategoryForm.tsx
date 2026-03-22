import { createSignal, createEffect, Show, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { data } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import {
  editingCategoryId,
  closeCategoryForm,
  submitCategory,
  deleteCategory,
} from './useLibrary';

export function CategoryForm() {
  const t = useLocale();
  const isEditing = () => !!editingCategoryId();

  const [nameEn, setNameEn] = createSignal('');
  const [nameZh, setNameZh] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [accent, setAccent] = createSignal('#6490FF');

  // Escape to close
  const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCategoryForm(); };
  onMount(() => document.addEventListener('keydown', handleEsc));
  onCleanup(() => document.removeEventListener('keydown', handleEsc));

  // Populate form when editing
  createEffect(() => {
    const id = editingCategoryId();
    if (id) {
      const cat = data.categories.find((c) => c.id === id);
      if (cat) {
        setNameEn(cat.name.en);
        setNameZh(cat.name.zh);
        setDescription(cat.description || '');
        setAccent(cat.accent);
      }
    } else {
      setNameEn('');
      setNameZh('');
      setDescription('');
      setAccent('#D4956B');
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!nameEn().trim()) return;
    submitCategory({
      nameEn: nameEn().trim(),
      nameZh: nameZh().trim(),
      description: description().trim(),
      accent: accent(),
    });
  }

  return (
    <Portal>
    <div class="ntm-modal">
      <div class="ntm-modal__backdrop" onClick={closeCategoryForm} />
      <form class="ntm-modal__panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <h2>{isEditing() ? t().categoryForm.editTitle : t().categoryForm.createTitle}</h2>
        </header>

        <div class="ntm-modal__body">
          <label>
            <span>{t().categoryForm.nameEn}</span>
            <input
              class="ntm-input"
              type="text"
              value={nameEn()}
              onInput={(e) => setNameEn(e.currentTarget.value)}
              required
              autofocus
            />
          </label>

          <label>
            <span>{t().categoryForm.nameZh}</span>
            <input
              class="ntm-input"
              type="text"
              value={nameZh()}
              onInput={(e) => setNameZh(e.currentTarget.value)}
            />
          </label>

          <label>
            <span>{t().categoryForm.description}</span>
            <input
              class="ntm-input"
              type="text"
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
            />
          </label>

          <label>
            <span>{t().categoryForm.accent}</span>
            <div class="ntm-input-row">
              <input
                type="color"
                value={accent()}
                onInput={(e) => setAccent(e.currentTarget.value)}
              />
              <span style={{ 'font-size': '0.8rem', color: 'var(--ntm-muted)' }}>{accent()}</span>
            </div>
          </label>
        </div>

        <footer style={{ display: 'flex', 'justify-content': 'space-between', gap: '0.6rem' }}>
          <Show when={isEditing()}>
            <button type="button" class="ntm-btn ntm-btn--danger" onClick={deleteCategory}>
              {t().categoryForm.delete}
            </button>
          </Show>
          <div style={{ display: 'flex', gap: '0.6rem', 'margin-left': 'auto' }}>
            <button type="button" class="ntm-btn ntm-btn--ghost" onClick={closeCategoryForm}>
              {t().categoryForm.cancel}
            </button>
            <button type="submit" class="ntm-btn">
              {isEditing() ? t().categoryForm.saveEdit : t().categoryForm.saveCreate}
            </button>
          </div>
        </footer>
      </form>
    </div>
    </Portal>
  );
}

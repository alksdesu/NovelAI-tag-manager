import { Show } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { copyToClipboard } from '../../lib/clipboard';
import { injectToPrompt } from '../../lib/inject-prompt';
import { addToast } from '../../stores/ui';
import { data, setData } from '../../stores/data';
import { uid } from '../../lib/uid';
import { getCategoryName, type SafebooruEntry } from './useSafebooru';
import { IconSave } from '../../components/Icons';
import type { Tag } from '../../types';

interface SafebooruResultProps {
  entry: SafebooruEntry;
}

export function SafebooruResult(props: SafebooruResultProps) {
  const t = useLocale();
  const catName = () => getCategoryName(props.entry.categoryId);

  function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  async function handleClick(e: MouseEvent) {
    // Shift+Click = inject, normal click = copy
    if (e.shiftKey) {
      const ok = injectToPrompt(props.entry.value);
      addToast(ok ? t().common.injected : t().common.injectedFail, ok ? 'success' : 'error');
    } else {
      const ok = await copyToClipboard(props.entry.value);
      if (ok) addToast(t().common.copied, 'success', 1500);
    }
  }

  function handleSave(e: MouseEvent) {
    e.stopPropagation();
    if (data.categories.length === 0) {
      addToast(t().common.createCategoryFirst, 'error');
      return;
    }
    const cat = data.categories[0];
    const catIdx = 0;
    const newTag: Tag = {
      id: uid('tag'),
      tag: props.entry.value,
      label: {
        en: props.entry.name,
        zh: props.entry.translation || '',
      },
      notes: '',
    };
    setData('categories', catIdx, 'tags', (tags) => [...tags, newTag]);
    addToast(t().safebooru.savedToLibrary, 'success');
  }

  return (
    <div class="ntm-safebooru-chip-wrap">
      <button
        class="ntm-safebooru-chip"
        onClick={handleClick}
        title={`${t().safebooru.copyHint} (Shift+Click: inject)`}
      >
        <span>{props.entry.name}</span>
        <Show
          when={props.entry.translation}
          fallback={
            <small class="ntm-safebooru-chip__translation--missing">
              {'\u2014'}
            </small>
          }
        >
          <small class="ntm-safebooru-chip__translation">{props.entry.translation}</small>
        </Show>
        <small class="ntm-safebooru-chip__meta">
          {catName()} · {formatCount(props.entry.postCount)}
        </small>
      </button>
      <button
        class="ntm-icon-btn ntm-safebooru-chip__save"
        onClick={handleSave}
        title={t().safebooru.saveToLibrary}
      >
        <IconSave />
      </button>
    </div>
  );
}

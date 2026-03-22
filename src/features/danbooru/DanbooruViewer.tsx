import { Show, For, onMount, onCleanup, createSignal, createMemo } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useLocale } from '../../i18n/useLocale';
import { data, setData } from '../../stores/data';
import { addToast } from '../../stores/ui';
import { copyToClipboard } from '../../lib/clipboard';
import { uid } from '../../lib/uid';
import {
  viewer,
  setViewer,
  closeViewer,
  navigateViewer,
  collectTags,
  copyAllTags,
  getTagTranslation,
} from './useDanbooru';
import { DANBOORU_API_BASE } from '../../constants';

export function DanbooruViewer() {
  const t = useLocale();

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeViewer();
    else if (e.key === 'ArrowLeft') navigateViewer(-1);
    else if (e.key === 'ArrowRight') navigateViewer(1);
  };
  onMount(() => document.addEventListener('keydown', handleKeyDown));
  onCleanup(() => document.removeEventListener('keydown', handleKeyDown));

  const post = () => viewer.post!;
  const [showAllTags, setShowAllTags] = createSignal(false);
  const allTags = createMemo(() => collectTags(post(), 200));
  const tags = createMemo(() => showAllTags() ? allTags() : allTags().slice(0, 25));
  const hasMore = () => allTags().length > 25;

  async function copyChip(tag: string) {
    const ok = await copyToClipboard(tag);
    if (ok) addToast(t().common.copiedTag, 'success', 1500);
  }

  function transferTags() {
    const catId = viewer.transferCategoryId;
    if (!catId) return;
    const catIdx = data.categories.findIndex((c) => c.id === catId);
    if (catIdx < 0) return;

    const tagString = tags().join(', ');
    const newTag = {
      id: uid('tag'),
      tag: tagString,
      label: { en: `Post #${post().id}`, zh: '' },
      notes: `Transferred from Danbooru post #${post().id}`,
    };
    setData('categories', catIdx, 'tags', (t) => [...t, newTag]);
    addToast(t().common.tagsSavedToLibrary, 'success');
  }

  return (
    <Portal>
    <div class="ntm-modal">
      <div class="ntm-modal__backdrop" onClick={closeViewer} />
      <div class="ntm-modal__panel ntm-modal__panel--wide ntm-danbooru-viewer__panel" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{t().danbooru.viewer.title(post().id)}</h2>
        </header>

        {/* Two-column body */}
        <div class="ntm-danbooru-viewer__body">
          {/* Image */}
          <div class="ntm-danbooru-viewer__image">
            <Show when={viewer.imageLoading}>
              <div class="ntm-loader" />
            </Show>
            <Show when={viewer.imageError}>
              <div class="ntm-danbooru-viewer__placeholder">{viewer.imageError}</div>
            </Show>
            <Show when={viewer.imageObjectUrl}>
              <img src={viewer.imageObjectUrl} alt={`Post #${post().id}`} />
            </Show>
          </div>

          {/* Aside: Tags + Transfer */}
          <div class="ntm-danbooru-viewer__aside">
            <h3>{t().danbooru.viewer.topTags}</h3>
            <div class="ntm-danbooru-tags--wrap">
              <For each={tags()}>
                {(tag) => {
                  const zh = () => getTagTranslation(tag);
                  return (
                    <div
                      class="ntm-danbooru-tag ntm-danbooru-tag--interactive"
                      onClick={() => copyChip(tag)}
                      title={zh() || t().danbooru.viewer.tagCopyHint}
                    >
                      <strong>{tag}</strong>
                      <Show when={zh()}>
                        <small>{zh()}</small>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
            <Show when={hasMore() && !showAllTags()}>
              <button class="ntm-mini-btn" onClick={() => setShowAllTags(true)}>
                {t().common.showAll(allTags().length)}
              </button>
            </Show>

            {/* Transfer */}
            <Show when={data.categories.length > 0}>
              <div class="ntm-danbooru-transfer">
                <span class="ntm-danbooru-transfer__label">{t().danbooru.viewer.targetCategory}</span>
                <select
                  class="ntm-danbooru-transfer__select"
                  value={viewer.transferCategoryId || ''}
                  onChange={(e) => setViewer('transferCategoryId', e.currentTarget.value || null)}
                >
                  <option value="">—</option>
                  <For each={data.categories}>
                    {(cat) => (
                      <option value={cat.id}>
                        {data.settings.language === 'zh' && cat.name.zh ? cat.name.zh : cat.name.en}
                      </option>
                    )}
                  </For>
                </select>
                <button
                  class="ntm-mini-btn"
                  disabled={!viewer.transferCategoryId}
                  onClick={transferTags}
                >
                  {t().danbooru.viewer.transferTags}
                </button>
              </div>
            </Show>
          </div>
        </div>

        {/* Footer */}
        <div class="ntm-danbooru-viewer__footer">
          <button class="ntm-btn ntm-btn--ghost" onClick={() => copyAllTags(post())}>
            {t().danbooru.viewer.copyTags}
          </button>
          <a
            class="ntm-mini-btn"
            href={`${DANBOORU_API_BASE}/posts/${post().id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t().danbooru.viewer.open}
          </a>
          <button class="ntm-btn ntm-btn--ghost" onClick={closeViewer}>
            {t().danbooru.viewer.close}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

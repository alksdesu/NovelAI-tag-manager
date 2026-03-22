import { Show, For, onMount } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { DanbooruCard } from './DanbooruCard';
import { DanbooruViewer } from './DanbooruViewer';
import { bindAutocompleteToInput, unbindAutocomplete } from '../autocomplete/useAutocomplete';
import {
  gallery,
  setGallery,
  viewer,
  credentials,
  searchGallery,
  fetchPosts,
  nextPage,
  prevPage,
} from './useDanbooru';

export function DanbooruPage() {
  const t = useLocale();

  onMount(() => {
    if (gallery.posts.length === 0 && !gallery.loading) {
      fetchPosts();
    }
  });

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchGallery();
    }
  }

  return (
    <section class={`ntm-danbooru ${gallery.loading ? 'is-loading' : ''}`}>
      <header class="ntm-danbooru__header">
        <div>
          <h2>{t().danbooru.title}</h2>
          <p>
            {credentials().username
              ? t().danbooru.subtitleSigned(credentials().username)
              : t().danbooru.subtitleUnsigned}
          </p>
        </div>
        <button class="ntm-mini-btn" onClick={fetchPosts}>
          {t().danbooru.refresh}
        </button>
      </header>

      {/* Controls */}
      <div class="ntm-danbooru__controls">
        <div class="ntm-danbooru__search-row">
          <input
            class="ntm-input"
            type="search"
            placeholder={t().danbooru.searchPlaceholder}
            value={gallery.tags}
            onInput={(e) => setGallery('tags', e.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={(e) => bindAutocompleteToInput(e.currentTarget, 'safebooru')}
            onBlur={() => { setTimeout(() => unbindAutocomplete(), 200); }}
          />
          <button class="ntm-btn" onClick={searchGallery}>
            {t().danbooru.search}
          </button>
        </div>
        <div class="ntm-danbooru__filter-row">
          <select
            class="ntm-input ntm-input--select"
            value={gallery.rating}
            onChange={(e) => { setGallery('rating', e.currentTarget.value); searchGallery(); }}
          >
            <For each={t().danbooru.ratingOptions}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
          <select
            class="ntm-input ntm-input--select"
            value={gallery.order}
            onChange={(e) => { setGallery('order', e.currentTarget.value); searchGallery(); }}
          >
            <For each={t().danbooru.orderOptions}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
          <Show when={credentials().username}>
            <button
              class={`ntm-mini-btn ${gallery.favoritesOnly ? 'is-active' : ''}`}
              onClick={() => { setGallery('favoritesOnly', (v) => !v); searchGallery(); }}
            >
              {t().danbooru.favorites}
            </button>
          </Show>
        </div>
      </div>

      {/* Gallery grid */}
      <Show when={gallery.error}>
        <p class="ntm-error">{gallery.error}</p>
      </Show>

      <Show when={gallery.loading}>
        <div class="ntm-danbooru__grid">
          <div class="ntm-loader" />
        </div>
      </Show>

      <Show when={!gallery.loading && gallery.posts.length > 0}>
        <div class="ntm-danbooru__grid">
          <For each={gallery.posts}>
            {(post) => <DanbooruCard post={post} />}
          </For>
        </div>
      </Show>

      <Show when={!gallery.loading && gallery.posts.length === 0 && !gallery.error}>
        <p class="ntm-empty">{t().danbooru.noPosts}</p>
      </Show>

      {/* Pagination */}
      <Show when={gallery.posts.length > 0}>
        <div class="ntm-danbooru-pagination">
          <button
            class="ntm-btn ntm-btn--ghost"
            disabled={gallery.page <= 1}
            onClick={prevPage}
          >
            {t().danbooru.paginationPrev}
          </button>
          <span>
            {t().danbooru.paginationInfo(gallery.page, gallery.posts.length)}
          </span>
          <button
            class="ntm-btn ntm-btn--ghost"
            disabled={!gallery.hasNext}
            onClick={nextPage}
          >
            {t().danbooru.paginationNext}
          </button>
        </div>
      </Show>

      {/* Viewer modal */}
      <Show when={viewer.active && viewer.post}>
        <DanbooruViewer />
      </Show>
    </section>
  );
}

import { Show, For } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { data } from '../../stores/data';
import { SafebooruResult } from './SafebooruResult';
import { bindAutocompleteToInput, unbindAutocomplete } from '../autocomplete/useAutocomplete';
import {
  term,
  setTerm,
  results,
  loading,
  error,
  hasSearched,
  searchSafebooru,
  saveCategoryId,
  setSaveCategoryId,
} from './useSafebooru';

export function SafebooruPage() {
  const t = useLocale();

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchSafebooru();
    }
  }

  return (
    <section class="ntm-safebooru">
      <header>
        <h2>{t().safebooru.title}</h2>
        <a class="ntm-link" href="https://safebooru.donmai.us" target="_blank" rel="noopener noreferrer">
          {t().safebooru.openLink}
        </a>
      </header>

      <div class="ntm-safebooru__search">
        <input
          class="ntm-input"
          type="search"
          placeholder={t().safebooru.searchPlaceholder}
          value={term()}
          onInput={(e) => setTerm(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => bindAutocompleteToInput(e.currentTarget, 'safebooru')}
          onBlur={() => { setTimeout(() => unbindAutocomplete(), 200); }}
        />
        <button class="ntm-btn" onClick={() => searchSafebooru()}>
          {t().safebooru.searchButton}
        </button>
      </div>

      <Show when={data.categories.length > 1}>
        <label class="ntm-safebooru__save-target">
          <span>{t().safebooru.saveTarget}</span>
          <select
            class="ntm-input ntm-input--select"
            value={saveCategoryId() ?? data.categories[0]?.id ?? ''}
            onChange={(e) => setSaveCategoryId(e.currentTarget.value || null)}
          >
            <For each={data.categories}>
              {(cat) => (
                <option value={cat.id}>
                  {data.settings.language === 'zh' && cat.name.zh ? cat.name.zh : cat.name.en}
                </option>
              )}
            </For>
          </select>
        </label>
      </Show>

      <div class="ntm-safebooru__results">
        <Show when={loading()}>
          <div class="ntm-loader" />
        </Show>

        <Show when={error()}>
          <p class="ntm-error">{error()}</p>
        </Show>

        <Show when={!loading() && !error() && results().length > 0}>
          <For each={results()}>
            {(entry) => <SafebooruResult entry={entry} />}
          </For>
        </Show>

        <Show when={!loading() && !error() && results().length === 0 && hasSearched()}>
          <p class="ntm-empty">{t().safebooru.noResults}</p>
        </Show>

        <Show when={!loading() && !hasSearched()}>
          <p class="ntm-empty">{t().safebooru.startTyping}</p>
        </Show>
      </div>
    </section>
  );
}

import { createSignal, Show } from 'solid-js';
import { IconClose } from '../../components/Icons';
import { data, setData } from '../../stores/data';
import { useLocale } from '../../i18n/useLocale';
import { searchTerm, setSearchTerm, setLibraryPage, searchAll, setSearchAll } from './useLibrary';
import type { SearchMode } from '../../types';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function SearchBar() {
  const t = useLocale();
  const [localValue, setLocalValue] = createSignal(searchTerm());

  function handleInput(value: string) {
    setLocalValue(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      setSearchTerm(value);
      setLibraryPage(1);
    }, 250);
  }

  function handleClear() {
    setLocalValue('');
    setSearchTerm('');
    setLibraryPage(1);
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  }

  function handleModeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as SearchMode;
    setData('settings', 'searchMode', value);
  }

  return (
    <>
      <div class="ntm-search__group">
        <div class="ntm-search__input-wrap">
          <input
            class="ntm-input"
            type="search"
            placeholder={t().library.searchPlaceholder}
            value={localValue()}
            onInput={(e) => handleInput(e.currentTarget.value)}
          />
          <Show when={localValue()}>
            <button class="ntm-search__clear" onClick={handleClear} type="button"><IconClose /></button>
          </Show>
        </div>
        <select
          class="ntm-input ntm-input--select ntm-search__mode"
          value={data.settings.searchMode}
          onChange={handleModeChange}
          aria-label={t().library.searchModeAria}
        >
          <option value="label">{t().library.searchModeName}</option>
          <option value="tag">{t().library.searchModeTag}</option>
        </select>
        <button
          class={`ntm-pill ${searchAll() ? 'active' : ''}`}
          onClick={() => { setSearchAll(!searchAll()); setLibraryPage(1); }}
          title={t().library.searchAll}
        >
          {t().library.searchAll}
        </button>
      </div>
    </>
  );
}

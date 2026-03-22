import { onMount, onCleanup } from 'solid-js';
import { Shell } from './components/Shell';
import { AutocompleteDropdown } from './features/autocomplete/AutocompleteDropdown';
import { useAutocompleteEffect } from './features/autocomplete/useAutocomplete';
import { data } from './stores/data';
import { initPersistence } from './stores/persistence';
import { setActivePage, isMinimized, setIsMinimized, setLangGetter } from './stores/ui';
import type { Page } from './types';

// Styles
import './styles/typography.css';
import './styles/tokens.css';
import './styles/reset.css';
import './styles/shell.css';
import './styles/animations.css';
import './features/library/library.css';
import './features/safebooru/safebooru.css';
import './features/danbooru/danbooru.css';
import './features/assistant/assistant.css';
import './features/autocomplete/autocomplete.css';
import './styles/responsive.css';

export default function App() {
  const pages: Page[] = ['library', 'safebooru', 'danbooru', 'assistant'];

  function handleGlobalKeyDown(e: KeyboardEvent) {
    // Alt+1/2/3/4 switch pages
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < pages.length) {
        e.preventDefault();
        setActivePage(pages[idx]);
        if (isMinimized()) setIsMinimized(false);
        return;
      }
    }
    // Alt+T toggle panel visibility
    if (e.altKey && e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (isMinimized()) { setIsMinimized(false); }
      else { setIsMinimized(true); }
    }
  }

  onMount(() => {
    // Set up global locale getter for non-component code
    setLangGetter(() => data.settings.language);

    // Initialize auto-persistence (tracks data store changes → localStorage)
    initPersistence(() => data);

    // Restore last active page
    if (data.settings.lastActivePage) {
      setActivePage(data.settings.lastActivePage);
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleGlobalKeyDown);
  });

  // Initialize autocomplete (MutationObserver + reactive local index)
  useAutocompleteEffect();

  return (
    <>
      <Shell />
      <AutocompleteDropdown />
    </>
  );
}

import { For, type JSX } from 'solid-js';
import { activePage, setActivePage } from '../stores/ui';
import { useLocale } from '../i18n/useLocale';
import { IconLibrary, IconSearch, IconImage, IconSparkles } from './Icons';
import type { Page } from '../types';

const PAGES: { key: Page; localeKey: keyof ReturnType<ReturnType<typeof useLocale>>['nav']; icon: () => JSX.Element }[] = [
  { key: 'library', localeKey: 'library', icon: IconLibrary },
  { key: 'safebooru', localeKey: 'safebooru', icon: IconSearch },
  { key: 'danbooru', localeKey: 'danbooru', icon: IconImage },
  { key: 'assistant', localeKey: 'assistant', icon: IconSparkles },
];

export function Nav() {
  const t = useLocale();

  return (
    <nav class="ntm-dock-nav" role="tablist">
      <For each={PAGES}>
        {(page) => (
          <button
            class={`ntm-dock-tab ${activePage() === page.key ? 'active' : ''}`}
            role="tab"
            aria-selected={activePage() === page.key}
            onClick={() => setActivePage(page.key)}
            title={t().nav[page.localeKey]}
            aria-label={t().nav[page.localeKey]}
          >
            <span class="ntm-dock-tab__icon">{page.icon()}</span>
            <span class="ntm-dock-tab__label">{t().nav[page.localeKey]}</span>
          </button>
        )}
      </For>
    </nav>
  );
}

import { For, createMemo } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { clampedPage, totalPages, filteredTags, setLibraryPage } from './useLibrary';

export function Pagination() {
  const t = useLocale();

  const pageNumbers = createMemo(() => {
    const total = totalPages();
    const current = clampedPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | null)[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) pages.push(null);
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push(null);
    pages.push(total);

    return pages;
  });

  return (
    <div class="ntm-library__pagination">
      <div class="ntm-pagination">
        <button
          class="ntm-pill"
          disabled={clampedPage() <= 1}
          onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
        >
          {t().library.pagination.prev}
        </button>
        <For each={pageNumbers()}>
          {(page) =>
            page === null ? (
              <span class="ntm-pagination__ellipsis">{'\u2026'}</span>
            ) : (
              <button
                class={`ntm-pill ${page === clampedPage() ? 'active' : ''}`}
                onClick={() => setLibraryPage(page)}
              >
                {page}
              </button>
            )
          }
        </For>
        <button
          class="ntm-pill"
          disabled={clampedPage() >= totalPages()}
          onClick={() => setLibraryPage((p) => Math.min(totalPages(), p + 1))}
        >
          {t().library.pagination.next}
        </button>
      </div>
      <span class="ntm-pagination__info">
        {t().library.pagination.info(clampedPage(), totalPages(), filteredTags().length)}
      </span>
    </div>
  );
}

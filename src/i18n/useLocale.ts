import { createMemo } from 'solid-js';
import { data } from '../stores/data';
import { LOCALE, type LocaleStrings } from './locale';

/**
 * Reactive locale accessor.
 * Returns the current locale strings based on data.settings.language.
 * Re-evaluates only when the language setting changes.
 */
export function useLocale(): () => LocaleStrings {
  return createMemo(() => LOCALE[data.settings.language] ?? LOCALE.en);
}

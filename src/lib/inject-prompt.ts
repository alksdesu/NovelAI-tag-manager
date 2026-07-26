/**
 * Inject tags into NovelAI's positive prompt textarea.
 */

import { findPromptTextarea } from './prompt-detect';

/**
 * Append tag text to NovelAI's prompt textarea.
 * Returns true on success, false if textarea not found.
 */
export function injectToPrompt(tagText: string): boolean {
  const ta = findPromptTextarea();
  if (!ta) return false;

  const current = ta.value.trim();
  const separator = current && !current.endsWith(',') ? ', ' : current ? ' ' : '';
  const newValue = current + separator + tagText;

  // Use native setter to bypass React/framework controlled-input guards
  const nativeSet = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeSet) {
    nativeSet.call(ta, newValue);
  } else {
    ta.value = newValue;
  }

  // Dispatch events so NovelAI's framework picks up the change
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.dispatchEvent(new Event('change', { bubbles: true }));

  // Move cursor to end
  ta.setSelectionRange(newValue.length, newValue.length);
  ta.focus();

  return true;
}

/**
 * Inject tags into NovelAI's positive prompt textarea.
 * Reuses the prompt-detection logic from the autocomplete module.
 */

// ─── Prompt detection (same selectors as useAutocomplete) ─────

const PROMPT_SELECTORS = [
  '[data-testid="positive-prompt"] textarea',
  'textarea[data-testid="positive-prompt"]',
  '[data-testid*="positive"] textarea',
  'textarea[name="positive"]',
  'textarea[name="prompt"]',
  'textarea[aria-label*="Positive"]',
  'textarea[placeholder*="Describe"]',
  'textarea[placeholder*="提示词"]',
  'textarea[placeholder*="prompt"]',
];

function isPromptTarget(el: Element | null): el is HTMLTextAreaElement {
  if (!el) return false;
  if (!(el instanceof HTMLTextAreaElement)) return false;
  const testId = el.getAttribute('data-testid') || '';
  const name = el.getAttribute('name') || '';
  const label = el.getAttribute('aria-label') || '';
  if (/negative/i.test(testId) || /negative/i.test(name) || /negative/i.test(label)) return false;
  if (el.disabled) return false;
  return true;
}

function scoreCandidate(el: Element): number {
  let score = 0;
  const all = `${el.getAttribute('data-testid') || ''} ${el.getAttribute('name') || ''} ${el.getAttribute('placeholder') || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
  if (all.includes('positive')) score += 10;
  if (all.includes('prompt')) score += 5;
  if (all.includes('describe')) score += 3;
  if (all.includes('negative')) score -= 20;
  if (all.includes('memory')) score -= 10;
  return score;
}

export function findPromptTextarea(): HTMLTextAreaElement | null {
  for (const sel of PROMPT_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el && isPromptTarget(el)) return el;
    } catch { /* ignore */ }
  }

  const textareas = document.querySelectorAll('textarea');
  let best: HTMLTextAreaElement | null = null;
  let bestScore = -Infinity;
  for (const ta of textareas) {
    if (!isPromptTarget(ta)) continue;
    const s = scoreCandidate(ta);
    if (s > bestScore) { bestScore = s; best = ta; }
  }
  return best;
}

// ─── Inject ─────────────────────────────────────────────────

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

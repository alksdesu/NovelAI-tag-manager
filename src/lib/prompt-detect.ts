/**
 * Locate NovelAI's positive prompt textarea. Shared by prompt injection
 * and autocomplete binding so a NovelAI redesign is fixed in one place.
 */

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
  // Only actual textarea elements — contentEditable divs lack .value/.selectionStart
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

let cachedPromptInput: HTMLTextAreaElement | null = null;

export function findPromptTextarea(): HTMLTextAreaElement | null {
  if (
    cachedPromptInput &&
    isPromptTarget(cachedPromptInput) &&
    document.contains(cachedPromptInput)
  ) {
    return cachedPromptInput;
  }

  for (const sel of PROMPT_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el && isPromptTarget(el)) {
        cachedPromptInput = el;
        return el;
      }
    } catch { /* ignore */ }
  }

  // Fallback: score every textarea by attribute keywords
  const textareas = document.querySelectorAll('textarea');
  let best: HTMLTextAreaElement | null = null;
  let bestScore = -Infinity;
  for (const ta of textareas) {
    if (!isPromptTarget(ta)) continue;
    const s = scoreCandidate(ta);
    if (s > bestScore) {
      bestScore = s;
      best = ta;
    }
  }

  if (best) cachedPromptInput = best;
  return best;
}

export function clearPromptTextareaCache() {
  cachedPromptInput = null;
}

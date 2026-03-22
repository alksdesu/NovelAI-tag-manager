export function coerceToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isNaN(value)) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value = ''): string {
  return coerceToString(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

export function escapeHtmlAttr(value = ''): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

export function sanitizeFragmentList(fragments: string[]): string[] {
  return fragments.map((f) => f.trim()).filter(Boolean);
}

/**
 * Smart-split a tag string into individual fragments.
 * If the string contains commas, split by comma (standard Danbooru format).
 * Otherwise, split by whitespace (NovelAI prompt format: "1girl solo blue_eyes").
 * Handles mixed formats gracefully.
 */
export function splitTagFragments(tagString: string): string[] {
  if (!tagString) return [];
  const hasComma = tagString.includes(',');
  if (hasComma) {
    return tagString.split(',').map((s) => s.trim()).filter(Boolean);
  }
  // Space-separated: treat each whitespace-separated token as a fragment
  return tagString.split(/\s+/).filter(Boolean);
}

export function serializeFragments(fragments: string[]): string {
  return fragments.join(', ');
}

import { escapeHtml, escapeHtmlAttr, coerceToString } from './escape';

// ─── Inline formatting ──────────────────────────────────────────

function applyInlineFormatting(text: string): string {
  let output = escapeHtml(coerceToString(text));

  // Inline code `text` — process FIRST to protect code spans from other formatting
  const codeSlots: string[] = [];
  output = output.replace(/`([^`]+)`/g, (_m, code) => {
    const idx = codeSlots.length;
    codeSlots.push(`<code>${code}</code>`);
    return `\x00CODE${idx}\x00`;
  });

  // Links  [label](url)
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_m, label, url) =>
      `<a href="${escapeHtmlAttr(url)}" target="_blank" rel="noopener">${label}</a>`,
  );

  // Bold **text** / __text__
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *text* / _text_
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  output = output.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough ~~text~~
  output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Restore inline code spans; a literal \x00CODE{n}\x00 in model output
  // can reference a slot that doesn't exist — keep the raw text then
  output = output.replace(/\x00CODE(\d+)\x00/g, (m, idx) => codeSlots[Number(idx)] ?? m);

  return output;
}

// ─── Block rendering ────────────────────────────────────────────

function renderBlocks(text: string): string {
  const source = coerceToString(text);
  if (!source) return '';

  const lines = source.replace(/\r/g, '').split('\n');
  const buffer: string[] = [];
  let listType = '';
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const joined = paragraphLines.join(' ').trim();
    if (joined) {
      buffer.push(`<p>${applyInlineFormatting(joined)}</p>`);
    }
    paragraphLines = [];
  };

  const closeList = () => {
    if (!listType) return;
    buffer.push(`</${listType}>`);
    listType = '';
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // Empty line
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    // Blockquote
    if (/^\s{0,3}>/.test(line)) {
      flushParagraph();
      closeList();
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
        i += 1;
      }
      i -= 1;
      const quoteHtml = renderBlocks(quoteLines.join('\n'));
      buffer.push(
        `<blockquote class="ntm-markdown__blockquote">${quoteHtml}</blockquote>`,
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = Math.min(headingMatch[1].length, 6);
      const content = headingMatch[2].trim();
      buffer.push(
        `<h${level} class="ntm-markdown__heading ntm-markdown__heading--${level}">${applyInlineFormatting(content)}</h${level}>`,
      );
      continue;
    }

    // Horizontal rule
    const hrMatch = line.match(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/);
    if (hrMatch) {
      flushParagraph();
      closeList();
      buffer.push('<hr class="ntm-markdown__divider"/>');
      continue;
    }

    // Ordered list
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        buffer.push('<ol class="ntm-markdown__list">');
        listType = 'ol';
      }
      buffer.push(`<li>${applyInlineFormatting(orderedMatch[1].trim())}</li>`);
      continue;
    }

    // Unordered list
    const unorderedMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        buffer.push('<ul class="ntm-markdown__list">');
        listType = 'ul';
      }
      buffer.push(`<li>${applyInlineFormatting(unorderedMatch[1].trim())}</li>`);
      continue;
    }

    // Continuation line inside a list
    if (listType && buffer.length) {
      const lastIdx = buffer.length - 1;
      const last = buffer[lastIdx];
      if (last?.endsWith('</li>')) {
        buffer[lastIdx] = `${last.slice(0, -5)} ${applyInlineFormatting(line.trim())}</li>`;
        continue;
      }
    }

    // Normal paragraph text
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  closeList();
  return buffer.join('');
}

// ─── Strip hidden AI tags ───────────────────────────────────────
function stripHiddenTags(text: string): string {
  return text
    .replace(/<safetySettings>[\s\S]*?<\/safetySettings>/gi, '')
    .replace(/<disclaimer>[\s\S]*?<\/disclaimer>/gi, '');
}

// ─── Public API ─────────────────────────────────────────────────

export function markdownToHtml(source: string): string {
  const text = stripHiddenTags(coerceToString(source));
  if (!text) return '';

  // Split code blocks from prose
  interface Segment {
    type: 'text' | 'code';
    value: string;
    language?: string;
  }

  const segments: Segment[] = [];
  let lastIndex = 0;
  const codePattern = /```([^\n]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = codePattern.exec(text)) !== null) {
    const preceding = text.slice(lastIndex, match.index);
    if (preceding) segments.push({ type: 'text', value: preceding });
    segments.push({
      type: 'code',
      language: match[1].trim(),
      value: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) segments.push({ type: 'text', value: remaining });

  return segments
    .map((seg) => {
      if (seg.type === 'code') {
        const code = escapeHtml(coerceToString(seg.value).replace(/\s+$/, ''));
        const langClass = seg.language
          ? ` ntm-markdown__code--${escapeHtmlAttr(seg.language.toLowerCase())}`
          : '';
        return `<pre class="ntm-markdown__code${langClass}"><code>${code}</code></pre>`;
      }
      return renderBlocks(seg.value);
    })
    .join('');
}

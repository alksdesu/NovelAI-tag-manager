import { gmRequest } from '../../lib/gm';
import {
  ASSISTANT_DEFAULT_OPENAI_BASE,
  ASSISTANT_HISTORY_TURNS_LIMIT,
} from '../../constants';
import { cleanApiKey, normalizeAssistantModel } from './normalizers';
import { coerceToString } from '../../lib/escape';
import type { AssistantModel, AssistantMessage, ProviderConfig, AssistantProvider } from '../../types';
import type { FilledMessage, AttachmentInfo } from '../../lib/prompt-blueprint';

// ─── Types ──────────────────────────────────────────────────────

export interface RequestPayload {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface AssistantResponse {
  role: string;
  content: string;
  thoughtSignature?: string;
}

// ─── Role normalisation ─────────────────────────────────────────

function normalizeRole(role: string): string {
  const v = (role || '').toLowerCase();
  if (v === 'system' || v === 'user') return v;
  return 'assistant';
}

// ─── Attachment helpers ─────────────────────────────────────────

function messageHasAttachments(
  index: number,
  userIndex: number,
  attachments: AttachmentInfo[],
): boolean {
  return (
    typeof userIndex === 'number' &&
    userIndex >= 0 &&
    index === userIndex &&
    Array.isArray(attachments) &&
    attachments.length > 0
  );
}

// ─── OpenAI ─────────────────────────────────────────────────────

export function buildOpenAIPayload(
  config: ProviderConfig,
  blueprintMessages: FilledMessage[],
  attachmentsInfo: AttachmentInfo[],
  userMessageIndex: number,
): RequestPayload {
  const baseUrl = (
    typeof config.baseUrl === 'string' && config.baseUrl.trim()
      ? config.baseUrl.trim().replace(/\/+$/, '')
      : ASSISTANT_DEFAULT_OPENAI_BASE
  );
  const model =
    typeof config.model === 'string' && config.model.trim()
      ? config.model.trim()
      : 'gpt-4o-mini';
  const apiKey = cleanApiKey(config.apiKey);
  if (!apiKey) throw new Error('OpenAI API key is missing.');

  const messages: unknown[] = [];

  blueprintMessages.forEach((msg, index) => {
    if (!msg) return;
    const openAiRole = normalizeRole(msg.role);
    let textContent = coerceToString(msg.content || '');
    const parts: unknown[] = [];

    if (messageHasAttachments(index, userMessageIndex, attachmentsInfo)) {
      for (const att of attachmentsInfo) {
        if (att.base64 && att.mime?.startsWith('image/')) {
          parts.push({
            type: 'image_url',
            image_url: { url: `data:${att.mime};base64,${att.base64}` },
          });
        } else if (att.base64) {
          textContent += `\n\n[Attachment ${att.name} base64]\n${att.base64}`;
        } else {
          textContent += `\n\n[Attachment ${att.name} omitted due to size]`;
        }
      }
    }

    if (parts.length) {
      parts.unshift({ type: 'text', text: textContent });
      messages.push({ role: openAiRole, content: parts });
    } else {
      messages.push({ role: openAiRole, content: textContent });
    }
  });

  return {
    url: `${baseUrl}/chat/completions`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  };
}

// ─── OpenAI text extraction ─────────────────────────────────────

export function extractOpenAIText(choice: Record<string, unknown>): string {
  if (!choice) return '';
  const message = (choice.message || choice.delta || {}) as Record<string, unknown>;
  const chunks: string[] = [];

  const push = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed) chunks.push(trimmed);
  };

  if (typeof message.content === 'string') {
    push(message.content);
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (!part) continue;
      if (typeof part === 'string') { push(part); continue; }
      if (typeof part.text === 'string') { push(part.text); continue; }
      if (Array.isArray(part)) { part.forEach(push); continue; }
      if (typeof part.content === 'string') { push(part.content); continue; }
      if (Array.isArray(part.content)) { part.content.forEach(push); }
    }
  }

  if (Array.isArray(message.reasoning_content)) {
    for (const entry of message.reasoning_content) {
      if (!entry) continue;
      if (typeof entry === 'string') push(entry);
      else if (typeof entry.text === 'string') push(entry.text);
    }
  }

  if (Array.isArray(message.tool_calls)) {
    for (const call of message.tool_calls as Record<string, unknown>[]) {
      const fn = call?.function as Record<string, unknown> | undefined;
      if (fn && typeof fn.arguments === 'string') {
        const name = fn.name ? `Tool ${fn.name}` : 'Tool call';
        push(`${name} arguments:\n${fn.arguments}`);
      }
    }
  }

  if (typeof choice.text === 'string') push(choice.text);

  if (!chunks.length && typeof message.refusal === 'string') push(message.refusal);
  if (!chunks.length && Array.isArray(message.refusal)) {
    (message.refusal as unknown[]).forEach(push);
  }

  return chunks.join('\n').trim();
}

// ─── Google ─────────────────────────────────────────────────────

function buildGoogleModelPath(config: ProviderConfig): string {
  const model =
    typeof config.model === 'string' && config.model.trim()
      ? config.model.trim()
      : 'gemini-1.5-flash';
  if (model.startsWith('projects/')) return model;
  return model.startsWith('models/') ? model : `models/${model}`;
}

/** Detect Gemini model generation for API compatibility */
function getGeminiGeneration(model: string): 'gemini3' | 'gemini2' | 'legacy' {
  const m = model.toLowerCase();
  if (/gemini[- ]?3/i.test(m)) return 'gemini3';
  if (/gemini[- ]?2/i.test(m)) return 'gemini2';
  return 'legacy';
}

/** Build thinkingConfig based on model generation and user preference */
function buildThinkingConfig(
  generation: ReturnType<typeof getGeminiGeneration>,
  thinkingLevel?: string,
): Record<string, unknown> | null {
  if (generation === 'legacy') return null;
  const level = (thinkingLevel || '').toLowerCase();
  if (!level) return null; // Auto — let model decide

  if (generation === 'gemini3') {
    // Gemini 3.x uses thinkingLevel: 'low' | 'medium' | 'high'
    if (['low', 'medium', 'high'].includes(level)) {
      return { thinkingLevel: level.toUpperCase() };
    }
    return null;
  }

  // Gemini 2.x uses thinkingBudget (integer token count)
  const budgetMap: Record<string, number> = {
    low: 1024,
    medium: 8192,
    high: -1, // unlimited
  };
  if (level in budgetMap) {
    return { thinkingBudget: budgetMap[level] };
  }
  return null;
}

/** Build conversation history turns for multi-turn Gemini requests */
function buildHistoryContents(
  history: AssistantMessage[],
  generation: ReturnType<typeof getGeminiGeneration>,
): unknown[] {
  if (!history?.length) return [];

  const turns: unknown[] = [];
  const slice = history.slice(-ASSISTANT_HISTORY_TURNS_LIMIT);

  for (const msg of slice) {
    if (!msg) continue;
    const role = (msg.role || '').toLowerCase();
    const googleRole = (role === 'assistant' || role === 'model') ? 'model' : 'user';
    const text = coerceToString(msg.content || '');
    if (!text.trim()) continue;

    const part: Record<string, unknown> = { text };

    // For Gemini 3.x model messages, attach thoughtSignature if stored
    if (generation === 'gemini3' && googleRole === 'model') {
      const sig = (msg.metadata as Record<string, unknown>)?.thoughtSignature;
      if (typeof sig === 'string' && sig) {
        part.thoughtSignature = sig;
      }
    }

    turns.push({ role: googleRole, parts: [part] });
  }

  return turns;
}

export function buildGooglePayload(
  config: ProviderConfig,
  blueprintMessages: FilledMessage[],
  attachmentsInfo: AttachmentInfo[],
  userMessageIndex: number,
  conversationHistory?: AssistantMessage[],
): RequestPayload {
  const sanitizedKey = cleanApiKey(config.apiKey);
  if (!sanitizedKey) throw new Error('Google API key is missing.');

  const modelPath = buildGoogleModelPath(config);
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(sanitizedKey)}`;

  const generation = getGeminiGeneration(config.model || '');

  const systemParts: unknown[] = [];
  const contents: unknown[] = [];

  // 1. Blueprint template messages (system prompt / role setup)
  blueprintMessages.forEach((msg, index) => {
    if (!msg) return;
    const role = normalizeRole(msg.role);
    const textContent = coerceToString(msg.content || '');
    const parts: unknown[] = [{ text: textContent }];

    // Attachments on the blueprint's user message (current turn's attachments)
    if (messageHasAttachments(index, userMessageIndex, attachmentsInfo)) {
      for (const att of attachmentsInfo) {
        if (att.base64 && att.mime?.startsWith('image/')) {
          parts.push({ inlineData: { mimeType: att.mime, data: att.base64 } });
        } else if (att.base64) {
          parts.push({ text: `[Attachment ${att.name} base64]\n${att.base64}` });
        } else {
          parts.push({ text: `[Attachment ${att.name} omitted due to size]` });
        }
      }
    }

    if (role === 'system') {
      systemParts.push(...parts);
    } else {
      const googleRole = role === 'assistant' ? 'model' : role;
      contents.push({ role: googleRole, parts });
    }
  });

  // 2. Real conversation history as separate turns (multi-turn support)
  if (conversationHistory?.length) {
    // Exclude the last user message (it's already in the blueprint via {{user_input}})
    const historyWithoutLast = conversationHistory.slice(0, -1);
    const historyTurns = buildHistoryContents(historyWithoutLast, generation);
    contents.push(...historyTurns);
  }

  // 3. Build payload
  const payload: Record<string, unknown> = { contents };
  if (systemParts.length) {
    payload.systemInstruction = { role: 'system', parts: systemParts };
  }

  // 4. generationConfig with thinkingConfig
  const thinkingConfig = buildThinkingConfig(generation, config.thinkingLevel);
  if (thinkingConfig) {
    payload.generationConfig = { thinkingConfig };
  }

  return {
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

// ─── Send request ───────────────────────────────────────────────

export interface SendResult {
  response: Promise<AssistantResponse>;
  abort: () => void;
}

export function sendAssistantRequest(
  provider: AssistantProvider,
  config: ProviderConfig,
  blueprintMessages: FilledMessage[],
  attachmentsInfo: AttachmentInfo[],
  userMessageIndex: number,
  conversationHistory?: AssistantMessage[],
): SendResult {
  const payload =
    provider === 'google'
      ? buildGooglePayload(config, blueprintMessages, attachmentsInfo, userMessageIndex, conversationHistory)
      : buildOpenAIPayload(config, blueprintMessages, attachmentsInfo, userMessageIndex);

  const { promise, handle } = gmRequest({
    method: 'POST',
    url: payload.url,
    headers: payload.headers,
    data: payload.body,
    timeout: 120_000,
  });

  const response = promise.then((resp) => {
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(resp.text || `HTTP ${resp.status}`);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(resp.text || '{}');
    } catch {
      throw new Error(`Invalid JSON response (HTTP ${resp.status})`);
    }

    if (provider === 'google') {
      const candidate = (parsed.candidates as unknown[])?.[0] as Record<string, unknown> | undefined;
      const parts = (candidate?.content as Record<string, unknown>)?.parts as Record<string, unknown>[] | undefined;

      if (!Array.isArray(parts) || !parts.length) {
        throw new Error('No response content.');
      }

      // Filter out thought parts (thought: true) — only keep answer parts
      const answerParts = parts.filter((p) => !p.thought);
      const text = (answerParts.length ? answerParts : parts)
        .map((p) => (typeof p.text === 'string' ? p.text : ''))
        .join('\n')
        .trim();

      if (!text) throw new Error('No response content.');

      // Extract thoughtSignature from the last part (if present)
      const lastPart = parts[parts.length - 1];
      const thoughtSignature = typeof lastPart?.thoughtSignature === 'string'
        ? lastPart.thoughtSignature
        : undefined;

      return { role: 'assistant', content: text, thoughtSignature };
    }

    // OpenAI-compatible
    const choice = (parsed.choices as unknown[])?.[0] as Record<string, unknown> | undefined;
    let text = extractOpenAIText(choice as Record<string, unknown>);
    if (!text) {
      const message = (choice?.message || {}) as Record<string, unknown>;
      const refusal = coerceToString(message?.refusal || '');
      const finishReason =
        typeof choice?.finish_reason === 'string'
          ? `Finish reason: ${choice.finish_reason}`
          : '';
      const fallback = [refusal, finishReason]
        .map((s: string) => s.trim())
        .filter(Boolean)
        .join('\n')
        .trim();
      text = fallback || '[No textual content returned]';
    }

    return { role: ((choice?.message as Record<string, unknown>)?.role as string) || 'assistant', content: text };
  });

  return { response, abort: () => handle.abort() };
}

// ─── Model list ─────────────────────────────────────────────────

export async function loadModelList(
  provider: AssistantProvider,
  config: ProviderConfig,
): Promise<AssistantModel[]> {
  const apiKey = cleanApiKey(config.apiKey || '');
  if (!apiKey) return [];

  if (provider === 'openai') {
    const rawBase = (
      typeof config.baseUrl === 'string' && config.baseUrl.trim()
        ? config.baseUrl.trim()
        : ASSISTANT_DEFAULT_OPENAI_BASE
    );
    let base = rawBase.replace(/\/+$/, '');
    const hasModelsPath = /\/models$/i.test(base);
    if (!hasModelsPath) {
      if (!/\/v\d+[a-z0-9-]*(?:\/|$)/i.test(base)) {
        base = `${base}/v1`;
      }
      base = base.replace(/\/+$/, '');
    }
    const url = hasModelsPath ? base : `${base}/models`;

    const { promise } = gmRequest({
      method: 'GET',
      url,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    });
    const resp = await promise;
    if (resp.status >= 400 || resp.status === 0) {
      let errMsg = `Request failed with status ${resp.status}`;
      try { const e = JSON.parse(resp.text || '{}'); errMsg = e?.error?.message || errMsg; } catch { /* ignore */ }
      throw new Error(errMsg);
    }
    const payload = JSON.parse(resp.text || '{}');

    if (Array.isArray(payload.data)) {
      return payload.data
        .filter((item: Record<string, unknown>) => item && typeof item.id === 'string')
        .map((item: Record<string, unknown>) =>
          normalizeAssistantModel({
            id: item.id,
            label: item.id,
            description: item.owned_by ? `Owner: ${item.owned_by}` : '',
            family: Array.isArray(item.permission) ? 'chat' : '',
          }),
        )
        .filter(Boolean) as AssistantModel[];
    }
    return [];
  }

  if (provider === 'google') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const { promise } = gmRequest({ method: 'GET', url, headers: {} });
    const resp = await promise;
    if (resp.status >= 400 || resp.status === 0) {
      let errMsg = `Request failed with status ${resp.status}`;
      try { const e = JSON.parse(resp.text || '{}'); errMsg = e?.error?.message || errMsg; } catch { /* ignore */ }
      throw new Error(errMsg);
    }
    const payload = JSON.parse(resp.text || '{}');

    if (Array.isArray(payload.models)) {
      return payload.models
        .filter((item: Record<string, unknown>) => item && typeof item.name === 'string')
        .map((item: Record<string, string>) => {
          const normalizedId = (item.name || '').replace(/^models\//, '');
          if (!normalizedId) return null;
          return normalizeAssistantModel({
            id: normalizedId,
            label: item.displayName || normalizedId,
            description: item.description || '',
            family: Array.isArray(item.supportedGenerationMethods)
              ? (item.supportedGenerationMethods as unknown as string[]).join(', ')
              : '',
          });
        })
        .filter(Boolean) as AssistantModel[];
    }
  }

  return [];
}

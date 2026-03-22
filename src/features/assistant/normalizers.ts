import { uid } from '../../lib/uid';
import {
  ASSISTANT_DEFAULT_OPENAI_BASE,
  ASSISTANT_DEFAULT_TITLE,
  ASSISTANT_CONVERSATION_LIMIT,
} from '../../constants';
import type {
  AssistantModel,
  AssistantAttachment,
  AssistantMessage,
  AssistantConversation,
  AssistantData,
  ProviderConfig,
} from '../../types';

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Trim whitespace and strip zero-width Unicode characters from an API key.
 */
export function cleanApiKey(raw: string): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return cleaned.length ? cleaned : trimmed;
}

// ─── Model ──────────────────────────────────────────────────────

export function normalizeAssistantModel(raw: unknown): AssistantModel | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return { id: trimmed, label: trimmed };
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : typeof obj.value === 'string'
          ? (obj.value as string).trim()
          : '';
    if (!id) return null;

    const label =
      typeof obj.label === 'string' && obj.label.trim() ? obj.label.trim() : id;
    const description = typeof obj.description === 'string' ? obj.description : '';
    const family = typeof obj.family === 'string' ? obj.family : '';
    return { id, label, description, family };
  }

  return null;
}

// ─── Attachment ─────────────────────────────────────────────────

export function normalizeAssistantAttachment(
  raw: unknown,
): AssistantAttachment | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id : uid('att');
  const name = typeof obj.name === 'string' ? obj.name : 'attachment';
  const mime = typeof obj.mime === 'string' ? obj.mime : 'application/octet-stream';
  const size = Number.isFinite(obj.size) ? Number(obj.size) : 0;
  const previewable = Boolean(obj.previewable);
  const providerData =
    obj.providerData && typeof obj.providerData === 'object'
      ? { ...(obj.providerData as Record<string, unknown>) }
      : {};

  return {
    id,
    name,
    mime,
    size,
    previewable,
    providerData,
    ephemeral: Boolean(obj.ephemeral),
  };
}

// ─── Message ────────────────────────────────────────────────────

export function normalizeAssistantMessage(
  raw: unknown,
): AssistantMessage | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id : uid('amsg');
  const role = typeof obj.role === 'string' ? obj.role : 'user';
  const content = typeof obj.content === 'string' ? obj.content : '';
  const createdAt = Number.isFinite(obj.createdAt)
    ? Number(obj.createdAt)
    : Date.now();
  const updatedAt = Number.isFinite(obj.updatedAt)
    ? Number(obj.updatedAt)
    : createdAt;
  const attachments = Array.isArray(obj.attachments)
    ? (obj.attachments
        .map(normalizeAssistantAttachment)
        .filter(Boolean) as AssistantAttachment[])
    : [];
  const metadata =
    obj.metadata && typeof obj.metadata === 'object'
      ? { ...(obj.metadata as Record<string, unknown>) }
      : {};

  return { id, role: role as AssistantMessage['role'], content, createdAt, updatedAt, attachments, metadata };
}

// ─── Conversation ───────────────────────────────────────────────

export function normalizeAssistantConversation(
  raw: unknown,
): AssistantConversation | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id : uid('chat');
  const createdAt = Number.isFinite(obj.createdAt)
    ? Number(obj.createdAt)
    : Date.now();
  const updatedAt = Number.isFinite(obj.updatedAt)
    ? Number(obj.updatedAt)
    : createdAt;
  const titleRaw = typeof obj.title === 'string' ? obj.title.trim() : '';
  const title = titleRaw || ASSISTANT_DEFAULT_TITLE;
  const messages = Array.isArray(obj.messages)
    ? (obj.messages
        .map(normalizeAssistantMessage)
        .filter(Boolean) as AssistantMessage[])
    : [];

  return { id, title, createdAt, updatedAt, messages };
}

// ─── Full assistant data ────────────────────────────────────────

function defaultProviderConfig(baseUrl?: string): ProviderConfig {
  return {
    baseUrl,
    apiKey: '',
    model: '',
    models: [],
    modelsFetchedAt: 0,
  };
}

function normalizeProviderConfig(
  input: unknown,
  fallback: ProviderConfig,
): ProviderConfig {
  const obj = (input && typeof input === 'object' ? input : {}) as Record<
    string,
    unknown
  >;

  // Strip legacy fields
  const { location: _l, projectId: _p, ...rest } = obj;

  const models = Array.isArray(obj.models)
    ? (obj.models.map(normalizeAssistantModel).filter(Boolean) as AssistantModel[])
    : [];

  const modelsFetchedAt = Number.isFinite(obj.modelsFetchedAt)
    ? Number(obj.modelsFetchedAt)
    : 0;

  return {
    ...fallback,
    ...rest,
    models,
    apiKey: cleanApiKey(
      (rest.apiKey as string) || (obj.apiKey as string) || fallback.apiKey || '',
    ),
    modelsFetchedAt,
  } as ProviderConfig;
}

export function normalizeAssistantData(raw: unknown): AssistantData {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;

  const conversations = Array.isArray(source.conversations)
    ? (source.conversations
        .map(normalizeAssistantConversation)
        .filter(Boolean) as AssistantConversation[])
        .slice(0, ASSISTANT_CONVERSATION_LIMIT)
    : [];

  const activeConversationId = conversations.some(
    (c) => c.id === source.activeConversationId,
  )
    ? (source.activeConversationId as string)
    : conversations[0]?.id || null;

  return {
    provider: source.provider === 'google' ? 'google' : 'openai',
    openai: normalizeProviderConfig(
      source.openai,
      defaultProviderConfig(ASSISTANT_DEFAULT_OPENAI_BASE),
    ),
    google: normalizeProviderConfig(source.google, defaultProviderConfig()),
    conversations,
    activeConversationId,
  };
}

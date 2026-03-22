import { createSignal, createMemo } from 'solid-js';
import { data, setData } from '../../stores/data';
import { addToast, t } from '../../stores/ui';
import { uid } from '../../lib/uid';
import { copyToClipboard } from '../../lib/clipboard';
import {
  ASSISTANT_DEFAULT_TITLE,
  ASSISTANT_CONVERSATION_LIMIT,
  ASSISTANT_MAX_ATTACHMENTS,
  ASSISTANT_MAX_FILE_BYTES,
} from '../../constants';
import type {
  AssistantConversation,
  AssistantMessage,
  AssistantAttachment,
  AssistantProvider,
} from '../../types';
import {
  buildAssistantContext,
  instantiateBlueprint,
  type AttachmentInfo,
} from '../../lib/prompt-blueprint';
import { sendAssistantRequest, loadModelList } from './useAssistantApi';
import { cleanApiKey, normalizeAssistantModel } from './normalizers';

// ─── Runtime attachment with file reference ─────────────────────

export interface RuntimeAttachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  previewable: boolean;
  file: File;
  previewUrl?: string;
}

// ─── Signals ────────────────────────────────────────────────────

const [compose, setCompose] = createSignal('');
const [attachments, setAttachments] = createSignal<RuntimeAttachment[]>([]);
const [sending, setSending] = createSignal(false);
const [error, setError] = createSignal('');
const [dropActive, setDropActive] = createSignal(false);
const [showSettings, setShowSettings] = createSignal(false);
const [renaming, setRenaming] = createSignal(false);
const [renameDraft, setRenameDraft] = createSignal('');
const [confirmDelete, setConfirmDelete] = createSignal(false);
const [modelsLoading, setModelsLoading] = createSignal(false);
const [search, setSearch] = createSignal('');
const [pendingMessageId, setPendingMessageId] = createSignal<string | null>(null);

let abortFn: (() => void) | null = null;

// ─── Derived state ──────────────────────────────────────────────

const conversations = createMemo(
  () => data.assistant.conversations ?? [],
);

const activeConversation = createMemo(() => {
  const id = data.assistant.activeConversationId;
  if (!id) return null;
  return conversations().find((c) => c.id === id) ?? null;
});

const filteredConversations = createMemo(() => {
  const term = search().toLowerCase().trim();
  if (!term) return conversations();
  return conversations().filter(
    (c) => c.title.toLowerCase().includes(term),
  );
});

const messages = createMemo(
  () => activeConversation()?.messages ?? [],
);

const activeProvider = createMemo(
  () => data.assistant.provider ?? 'openai',
);

const activeConfig = createMemo(() => {
  const p = activeProvider();
  return data.assistant[p];
});

// ─── Helpers ────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = size;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

async function prepareAttachmentsForSend(
  runtimeAtts: RuntimeAttachment[],
): Promise<AttachmentInfo[]> {
  const prepared: AttachmentInfo[] = [];
  for (const att of runtimeAtts) {
    let base64 = '';
    try {
      base64 = await readFileAsBase64(att.file);
    } catch (e) {
      console.warn('Failed to encode attachment', att.name, e);
    }
    prepared.push({
      id: att.id,
      name: att.name,
      mime: att.mime,
      size: att.size,
      previewable: att.previewable,
      base64,
      summary: `${att.name} (${att.mime || 'file'}, ${formatFileSize(att.size)})`,
    });
  }
  return prepared;
}

function storageAttachments(
  runtimeAtts: RuntimeAttachment[],
): AssistantAttachment[] {
  return runtimeAtts.map((att) => ({
    id: att.id,
    name: att.name,
    mime: att.mime,
    size: att.size,
    previewable: att.previewable,
    providerData: {},
    ephemeral: true,
  }));
}

function createMessage(
  role: AssistantMessage['role'],
  content: string,
  atts: AssistantAttachment[] = [],
  meta: Record<string, unknown> = {},
): AssistantMessage {
  const now = Date.now();
  return {
    id: uid('amsg'),
    role,
    content,
    createdAt: now,
    updatedAt: now,
    attachments: atts,
    metadata: meta,
  };
}

/** Find conversation index by ID; returns -1 if not found */
function findConvIdx(convId: string): number {
  return data.assistant.conversations.findIndex((c) => c.id === convId);
}

function autoTitle(
  convId: string,
  userText: string,
  assistantText: string,
) {
  const idx = findConvIdx(convId);
  if (idx < 0) return;
  const conv = data.assistant.conversations[idx];
  if (conv.title && conv.title !== ASSISTANT_DEFAULT_TITLE) return;
  const source = (userText || assistantText || '').trim();
  if (!source) return;
  const snippet = source.replace(/\s+/g, ' ').slice(0, 42).trim();
  if (!snippet) return;
  setData('assistant', 'conversations', idx, 'title', snippet);
}

/** Revoke all preview URLs in an attachment list */
function revokeAttachmentUrls(atts: RuntimeAttachment[]) {
  for (const att of atts) {
    if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
  }
}

// ─── Actions ────────────────────────────────────────────────────

function createConversation() {
  const now = Date.now();
  const conv: AssistantConversation = {
    id: uid('chat'),
    title: ASSISTANT_DEFAULT_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  const convs = [conv, ...data.assistant.conversations].slice(
    0,
    ASSISTANT_CONVERSATION_LIMIT,
  );
  setData('assistant', 'conversations', convs);
  setData('assistant', 'activeConversationId', conv.id);
  setRenaming(false);
  setConfirmDelete(false);
}

function selectConversation(id: string) {
  setData('assistant', 'activeConversationId', id);
  setRenaming(false);
  setRenameDraft('');
  setConfirmDelete(false);
}

function deleteConversation(id: string) {
  const convs = data.assistant.conversations.filter((c) => c.id !== id);
  setData('assistant', 'conversations', convs);
  if (data.assistant.activeConversationId === id) {
    setData('assistant', 'activeConversationId', convs[0]?.id || null);
  }
  setConfirmDelete(false);
}

function renameConversation(id: string, title: string) {
  const idx = data.assistant.conversations.findIndex((c) => c.id === id);
  if (idx < 0) return;
  setData('assistant', 'conversations', idx, 'title', title.trim() || ASSISTANT_DEFAULT_TITLE);
  setData('assistant', 'conversations', idx, 'updatedAt', Date.now());
  setRenaming(false);
}

async function sendMessage() {
  if (sending()) return;

  const provider = activeProvider();
  const config = activeConfig();
  const apiKey = cleanApiKey(config.apiKey || '');
  const model = (config.model || '').trim();

  if (!apiKey || !model) {
    addToast(t().common.configureFirst, 'error');
    setShowSettings(true);
    return;
  }

  const text = compose().trim();
  const atts = attachments();
  if (!text && !atts.length) return;

  // Ensure active conversation
  if (!activeConversation()) {
    createConversation();
  }

  const convId = data.assistant.activeConversationId!;
  let idx = findConvIdx(convId);
  if (idx < 0) return;

  // Create user message
  const userMsg = createMessage('user', text || '(empty message)', storageAttachments(atts), {
    status: 'pending',
  });
  const currentMessages = [...data.assistant.conversations[idx].messages, userMsg];
  setData('assistant', 'conversations', idx, 'messages', currentMessages);
  setData('assistant', 'conversations', idx, 'updatedAt', Date.now());

  // Clear composer and revoke preview URLs
  setCompose('');
  revokeAttachmentUrls(atts);
  setAttachments([]);
  setSending(true);
  setError('');
  setPendingMessageId(userMsg.id);

  try {
    const prepared = await prepareAttachmentsForSend(atts);

    // Re-find conv index after async — it may have shifted
    idx = findConvIdx(convId);
    if (idx < 0) throw new Error('Conversation was deleted during send.');

    const conv = data.assistant.conversations[idx];
    const context = buildAssistantContext(
      conv,
      data.categories,
      text,
      prepared,
    );
    const blueprint = instantiateBlueprint(context);

    const { response, abort } = sendAssistantRequest(
      provider,
      config,
      blueprint.messages,
      prepared,
      blueprint.userMessageIndex,
      conv.messages,
    );
    abortFn = abort;

    const result = await response;

    // Re-find conv index after async — it may have shifted again
    idx = findConvIdx(convId);
    if (idx < 0) throw new Error('Conversation was deleted during send.');

    // Mark user message as sent
    const msgIdx = data.assistant.conversations[idx].messages.findIndex(
      (m) => m.id === userMsg.id,
    );
    if (msgIdx >= 0) {
      setData('assistant', 'conversations', idx, 'messages', msgIdx, 'metadata', {
        status: 'sent',
      });
      setData('assistant', 'conversations', idx, 'messages', msgIdx, 'updatedAt', Date.now());
    }

    // Append assistant message (store thoughtSignature if present)
    const assistantMeta: Record<string, unknown> = { status: 'sent' };
    if (result.thoughtSignature) {
      assistantMeta.thoughtSignature = result.thoughtSignature;
    }
    const assistantMsg = createMessage(
      (result.role as AssistantMessage['role']) || 'assistant',
      result.content || '',
      [],
      assistantMeta,
    );
    const updatedMessages = [
      ...data.assistant.conversations[idx].messages,
      assistantMsg,
    ];
    setData('assistant', 'conversations', idx, 'messages', updatedMessages);
    setData('assistant', 'conversations', idx, 'updatedAt', Date.now());

    autoTitle(convId, text, result.content);
    addToast(t().common.assistantReplied, 'success');
  } catch (err) {
    console.error('Assistant request failed', err);
    const errMsg = err instanceof Error ? err.message : 'Request failed.';

    idx = findConvIdx(convId);
    if (idx >= 0) {
      const msgIdx = data.assistant.conversations[idx].messages.findIndex(
        (m) => m.id === userMsg.id,
      );
      if (msgIdx >= 0) {
        setData('assistant', 'conversations', idx, 'messages', msgIdx, 'metadata', {
          status: 'error',
          error: errMsg,
        });
      }
    }
    setError(errMsg);
  } finally {
    setPendingMessageId(null);
    setSending(false);
    abortFn = null;
  }
}

function stopGeneration() {
  if (abortFn) {
    try { abortFn(); } catch (e) { console.warn('Abort failed', e); }
  }
  abortFn = null;

  const msgId = pendingMessageId();
  if (msgId) {
    const conv = activeConversation();
    if (conv) {
      const convIdx = data.assistant.conversations.findIndex((c) => c.id === conv.id);
      const msgIdx = conv.messages.findIndex((m) => m.id === msgId);
      if (convIdx >= 0 && msgIdx >= 0) {
        setData('assistant', 'conversations', convIdx, 'messages', msgIdx, 'metadata', {
          status: 'cancelled',
          error: '',
        });
      }
    }
  }

  setSending(false);
  setPendingMessageId(null);
  setError('');
  addToast(t().common.requestCancelled, 'info');
}

function deleteMessage(messageId: string) {
  const conv = activeConversation();
  if (!conv) return;
  const convIdx = data.assistant.conversations.findIndex((c) => c.id === conv.id);
  if (convIdx < 0) return;

  const msgIdx = conv.messages.findIndex((m) => m.id === messageId);
  if (msgIdx < 0) return;

  const msg = conv.messages[msgIdx];
  const status = (msg.metadata as Record<string, unknown>)?.status;
  if (status === 'pending' || pendingMessageId() === messageId) {
    addToast(t().common.cannotDeletePending, 'error');
    return;
  }

  const updated = conv.messages.filter((m) => m.id !== messageId);
  setData('assistant', 'conversations', convIdx, 'messages', updated);
}

function copyMessage(messageId: string) {
  const conv = activeConversation();
  if (!conv) return;
  const msg = conv.messages.find((m) => m.id === messageId);
  if (!msg) return;
  copyToClipboard(msg.content || '').then((ok) => {
    addToast(ok ? 'Message copied.' : 'Failed to copy.', ok ? 'success' : 'error');
  });
}

function findPreviousUserIndex(msgs: AssistantMessage[], startIndex: number): number {
  for (let i = startIndex - 1; i >= 0; i -= 1) {
    const role = (msgs[i]?.role || '').toLowerCase();
    if (role === 'user') return i;
  }
  return -1;
}

function retryMessage(messageId: string) {
  if (sending()) {
    addToast(t().common.waitForRequest, 'error');
    return;
  }
  const conv = activeConversation();
  if (!conv) return;
  const convIdx = findConvIdx(conv.id);
  if (convIdx < 0) return;

  const msgIdx = conv.messages.findIndex((m) => m.id === messageId);
  if (msgIdx < 0) return;

  const msg = conv.messages[msgIdx];
  const role = (msg.role || '').toLowerCase();
  if (role !== 'assistant' && role !== 'model') {
    addToast(t().common.retryAssistantOnly, 'error');
    return;
  }

  const prevIdx = findPreviousUserIndex(conv.messages, msgIdx);
  if (prevIdx < 0) {
    addToast(t().common.noOriginatingUser, 'error');
    return;
  }

  const userMsg = conv.messages[prevIdx];
  // Remove both messages
  const updated = conv.messages.filter(
    (_m, i) => i !== msgIdx && i !== prevIdx,
  );
  setData('assistant', 'conversations', convIdx, 'messages', updated);

  // Restore to composer and re-send — capture content to avoid race
  const retryContent = userMsg.content || '';
  revokeAttachmentUrls(attachments());
  setAttachments([]);
  setCompose(retryContent);
  // Use queueMicrotask for tighter timing than setTimeout
  queueMicrotask(() => {
    if (compose() === retryContent) sendMessage();
  });
}

function regenerateMessage(messageId: string) {
  if (sending()) {
    addToast(t().common.waitForRequest, 'error');
    return;
  }
  const conv = activeConversation();
  if (!conv) return;
  const convIdx = findConvIdx(conv.id);
  if (convIdx < 0) return;

  const msgIdx = conv.messages.findIndex((m) => m.id === messageId);
  if (msgIdx < 0) return;

  const msg = conv.messages[msgIdx];
  const role = (msg.role || '').toLowerCase();
  if (role !== 'assistant' && role !== 'model') {
    addToast(t().common.regenAssistantOnly, 'error');
    return;
  }

  const prevIdx = findPreviousUserIndex(conv.messages, msgIdx);
  if (prevIdx < 0) {
    addToast(t().common.noOriginatingUser, 'error');
    return;
  }

  const userMsg = conv.messages[prevIdx];
  // Remove assistant message only
  const updated = conv.messages.filter((_m, i) => i !== msgIdx);
  setData('assistant', 'conversations', convIdx, 'messages', updated);

  // Re-send with same user content — capture content to avoid race
  const regenContent = userMsg.content || '';
  revokeAttachmentUrls(attachments());
  setAttachments([]);
  setCompose(regenContent);
  queueMicrotask(() => {
    if (compose() === regenContent) sendMessage();
  });
}

function addAttachments(files: FileList | File[]) {
  const current = attachments();
  const newAtts: RuntimeAttachment[] = [];

  for (const file of Array.from(files)) {
    if (current.length + newAtts.length >= ASSISTANT_MAX_ATTACHMENTS) {
      addToast(t().common.attachmentMax(ASSISTANT_MAX_ATTACHMENTS), 'error');
      break;
    }
    if (file.size > ASSISTANT_MAX_FILE_BYTES) {
      addToast(t().common.attachmentTooLarge(file.name, ASSISTANT_MAX_FILE_BYTES / 1024 / 1024), 'error');
      continue;
    }
    newAtts.push({
      id: uid('att'),
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      previewable: file.type.startsWith('image/'),
      file,
      previewUrl: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    });
  }

  if (newAtts.length) {
    setAttachments([...current, ...newAtts]);
  }
}

function removeAttachment(id: string) {
  const current = attachments();
  const att = current.find((a) => a.id === id);
  if (att?.previewUrl) URL.revokeObjectURL(att.previewUrl);
  setAttachments(current.filter((a) => a.id !== id));
}

async function refreshModels() {
  if (modelsLoading()) return;
  const provider = activeProvider();
  const config = activeConfig();
  const apiKey = cleanApiKey(config.apiKey || '');

  if (!apiKey) {
    addToast(t().common.addApiKeyFirst, 'error');
    return;
  }

  setModelsLoading(true);
  try {
    const models = await loadModelList(provider, config);
    const normalized = models
      .map(normalizeAssistantModel)
      .filter(Boolean) as NonNullable<ReturnType<typeof normalizeAssistantModel>>[];

    setData('assistant', provider, 'models', normalized);
    setData('assistant', provider, 'modelsFetchedAt', Date.now());
    addToast(t().common.fetchedModels(normalized.length), normalized.length ? 'success' : 'info');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch models.';
    addToast(msg, 'error');
  } finally {
    setModelsLoading(false);
  }
}

// ─── Public API ─────────────────────────────────────────────────

export {
  // Signals
  compose,
  setCompose,
  attachments,
  setAttachments,
  sending,
  error,
  dropActive,
  setDropActive,
  showSettings,
  setShowSettings,
  renaming,
  setRenaming,
  renameDraft,
  setRenameDraft,
  confirmDelete,
  setConfirmDelete,
  modelsLoading,
  search,
  setSearch,
  pendingMessageId,
  // Derived
  conversations,
  activeConversation,
  filteredConversations,
  messages,
  activeProvider,
  activeConfig,
  // Actions
  createConversation,
  selectConversation,
  deleteConversation,
  renameConversation,
  sendMessage,
  stopGeneration,
  deleteMessage,
  copyMessage,
  retryMessage,
  regenerateMessage,
  addAttachments,
  removeAttachment,
  refreshModels,
};

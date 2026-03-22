import { Show } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { markdownToHtml } from '../../lib/markdown';
import {
  copyMessage,
  deleteMessage,
  retryMessage,
  regenerateMessage,
  pendingMessageId,
} from './useAssistant';
import { IconCopy, IconRegenerate, IconRetry, IconTrash, IconUser, IconBot, IconSettings } from '../../components/Icons';
import type { AssistantMessage } from '../../types';

interface Props {
  message: AssistantMessage;
}

function normalizeRole(role: string): string {
  const v = (role || '').toLowerCase();
  if (v === 'system' || v === 'user') return v;
  return 'assistant';
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const AVATAR_ICON: Record<string, () => any> = {
  user: IconUser,
  assistant: IconBot,
  system: IconSettings,
};

export function MessageBubble(props: Props) {
  const t = useLocale();
  const role = () => normalizeRole(props.message.role);
  const isUser = () => role() === 'user';
  const isAssistant = () => role() === 'assistant';
  const isPending = () => pendingMessageId() === props.message.id;
  const status = () =>
    (props.message.metadata as Record<string, unknown>)?.status as string | undefined;
  const hasError = () => status() === 'error';

  const roleLabel = () => {
    const r = role();
    if (r === 'user') return t().assistant.roleUser;
    if (r === 'system') return t().assistant.roleSystem;
    return t().assistant.roleAssistant;
  };

  const renderedContent = () => {
    const content = props.message.content || '';
    if (!content) return `<em class="ntm-assistant__message-empty">${t().assistant.messageEmpty}</em>`;
    return markdownToHtml(content);
  };

  return (
    <article
      class={`ntm-assistant__message ntm-assistant__message--${role()} ${hasError() ? 'ntm-assistant__message--error' : ''}`}
    >
      {/* Avatar */}
      <div class="ntm-assistant__message-avatar">
        <span class={`ntm-assistant__avatar ntm-assistant__avatar--${role()}`}>
          {(() => { const Icon = AVATAR_ICON[role()] || IconBot; return <Icon />; })()}
        </span>
      </div>

      {/* Body */}
      <div class="ntm-assistant__message-body">
        <header class="ntm-assistant__message-meta">
          <span>{roleLabel()}</span>
          <time>{formatTime(props.message.createdAt)}</time>
          <div class="ntm-assistant__message-actions">
            <button class="ntm-icon-btn" onClick={() => copyMessage(props.message.id)} title={t().assistant.messageActions.copy}>
              <IconCopy />
            </button>
            <Show when={isAssistant() && !isPending()}>
              <button class="ntm-icon-btn" onClick={() => regenerateMessage(props.message.id)} title={t().assistant.messageActions.regenerate}>
                <IconRegenerate />
              </button>
            </Show>
            <Show when={hasError() && isAssistant()}>
              <button class="ntm-icon-btn" onClick={() => retryMessage(props.message.id)} title={t().assistant.messageActions.retry}>
                <IconRetry />
              </button>
            </Show>
            <Show when={!isPending()}>
              <button class="ntm-icon-btn" onClick={() => deleteMessage(props.message.id)} title={t().assistant.messageActions.delete}>
                <IconTrash />
              </button>
            </Show>
          </div>
        </header>

        <div class="ntm-assistant__message-content" innerHTML={renderedContent()} />

        {/* Error detail */}
        <Show when={hasError() && (props.message.metadata as Record<string, unknown>)?.error}>
          <div class="ntm-assistant__message-error">
            {String((props.message.metadata as Record<string, unknown>).error)}
          </div>
        </Show>

        {/* Loading indicator */}
        <Show when={isPending()}>
          <span class="ntm-assistant__message-indicator">{t().assistant.thinking ?? '...'}</span>
        </Show>
      </div>
    </article>
  );
}

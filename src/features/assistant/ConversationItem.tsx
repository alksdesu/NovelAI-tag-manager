import { useLocale } from '../../i18n/useLocale';
import { data } from '../../stores/data';
import { selectConversation } from './useAssistant';
import type { AssistantConversation } from '../../types';

interface Props {
  conversation: AssistantConversation;
}

function formatTimestamp(ts: number): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 3600_000) {
      const mins = Math.max(1, Math.floor(diff / 60_000));
      return `${mins}m`;
    }
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function ConversationItem(props: Props) {
  const t = useLocale();
  const isActive = () =>
    data.assistant.activeConversationId === props.conversation.id;

  return (
    <li
      class={`ntm-assistant__conversation ${isActive() ? 'active' : ''}`}
    >
      <button
        class="ntm-assistant__conversation-main"
        onClick={() => selectConversation(props.conversation.id)}
      >
        <span class="ntm-assistant__conversation-title">
          {props.conversation.title}
        </span>
        <span class="ntm-assistant__conversation-meta">
          {formatTimestamp(props.conversation.updatedAt)}
        </span>
      </button>
    </li>
  );
}

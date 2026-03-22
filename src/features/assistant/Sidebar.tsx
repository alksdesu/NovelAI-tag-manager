import { For, Show } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { ConversationItem } from './ConversationItem';
import {
  filteredConversations,
  search,
  setSearch,
  createConversation,
} from './useAssistant';

export function Sidebar() {
  const t = useLocale();

  return (
    <aside class="ntm-assistant__sidebar">
      <div class="ntm-assistant__sidebar-top">
        <button class="ntm-btn" onClick={createConversation}>
          {t().assistant.newChat}
        </button>
        <div class="ntm-assistant__sidebar-search">
          <input
            class="ntm-input"
            type="text"
            placeholder={t().assistant.sidebarSearch}
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
      </div>

      <ul class="ntm-assistant__conversation-list">
        <Show
          when={filteredConversations().length > 0}
          fallback={
            <li class="ntm-empty" style={{ padding: '1rem', 'font-size': '0.8rem' }}>
              {t().assistant.noConversations}
            </li>
          }
        >
          <For each={filteredConversations()}>
            {(conv) => <ConversationItem conversation={conv} />}
          </For>
        </Show>
      </ul>
    </aside>
  );
}

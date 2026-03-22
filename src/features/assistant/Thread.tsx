import { For, Show, createEffect } from 'solid-js';
import { useLocale } from '../../i18n/useLocale';
import { MessageBubble } from './MessageBubble';
import { messages } from './useAssistant';

export function Thread() {
  const t = useLocale();
  let containerRef: HTMLDivElement | undefined;

  function isNearBottom(): boolean {
    if (!containerRef) return true;
    const threshold = 100;
    return containerRef.scrollHeight - containerRef.scrollTop - containerRef.clientHeight < threshold;
  }

  // Auto-scroll only when user is near bottom
  createEffect(() => {
    const len = messages().length;
    if (len && containerRef && isNearBottom()) {
      requestAnimationFrame(() => {
        containerRef!.scrollTop = containerRef!.scrollHeight;
      });
    }
  });

  return (
    <div class="ntm-assistant__thread" ref={containerRef}>
      <Show
        when={messages().length > 0}
        fallback={
          <div class="ntm-assistant__empty">
            <p>{t().assistant.emptyStateHeading}</p>
            <p style={{ 'font-size': '0.8rem' }}>{t().assistant.emptyStateBody}</p>
          </div>
        }
      >
        <div class="ntm-assistant__messages">
          <For each={messages()}>
            {(msg) => <MessageBubble message={msg} />}
          </For>
        </div>
      </Show>
    </div>
  );
}

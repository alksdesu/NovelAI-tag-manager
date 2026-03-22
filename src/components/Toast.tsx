import { For, Show } from 'solid-js';
import { toastQueue, dismissToast } from '../stores/ui';

export function Toast() {
  return (
    <div class="ntm-toast-stack">
      <For each={toastQueue()}>
        {(toast) => (
          <div class={`ntm-toast ${toast.type}`}>
            <span>{toast.message}</span>
            <Show when={toast.action}>
              <button
                class="ntm-mini-btn"
                onClick={() => {
                  toast.action!.onClick();
                  dismissToast(toast.id);
                }}
              >
                {toast.action!.label}
              </button>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}
